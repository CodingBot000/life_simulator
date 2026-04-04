import { createHash } from "node:crypto";

import Ajv, { type ValidateFunction } from "ajv";

import {
  getCircuitBreaker,
  type CircuitBreakerSnapshot,
} from "../resilience/circuit-breaker.ts";
import {
  retryWithPolicy,
  type RetryExecutionResult,
} from "../resilience/retry.ts";
import {
  resolveTimeoutMs,
  withTimeout,
} from "../resilience/timeout.ts";
import {
  estimateCostForTokens,
  getModelDefinition,
} from "./model-registry.ts";
import { mockProvider } from "./providers/mock.ts";
import { openAiProvider } from "./providers/openai.ts";
import type {
  JsonSchema,
  LLMCacheHook,
  LLMProvider,
  ProviderStructuredResponse,
  StructuredLLMRequest,
  StructuredLLMResponse,
} from "./types.ts";

class SchemaValidationError extends Error {
  code = "schema_validation_failed";

  constructor(message: string) {
    super(message);
    this.name = "SchemaValidationError";
  }
}

class InMemoryTtlCache<T> implements LLMCacheHook<T> {
  private readonly store = new Map<string, { expiresAt: number; value: T }>();

  get(key: string): T | null {
    const found = this.store.get(key);

    if (!found) {
      return null;
    }

    if (found.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }

    return found.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    this.store.set(key, {
      expiresAt: Date.now() + ttlMs,
      value,
    });
  }
}

const DEFAULT_CACHE_TTL_MS = Number.parseInt(
  process.env.LLM_CACHE_TTL_MS ?? `${5 * 60 * 1000}`,
  10,
);

const ajv = new Ajv({
  allErrors: true,
  strict: false,
  allowUnionTypes: true,
});

const validatorCache = new Map<string, ValidateFunction>();
const defaultCache = new InMemoryTtlCache<StructuredLLMResponse<unknown>>();

function getProvider(providerName: string): LLMProvider {
  if (providerName === "openai") {
    return openAiProvider;
  }

  if (providerName === "mock") {
    return mockProvider;
  }

  throw new Error(`Unsupported provider "${providerName}".`);
}

function readErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const candidate = error as { code?: unknown };
  return typeof candidate.code === "string" ? candidate.code : undefined;
}

function buildCacheKey(request: StructuredLLMRequest<unknown>): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        model: request.model,
        fallbackModel: request.fallbackModel,
        schemaName: request.schemaName,
        prompt: request.prompt,
        input: request.input,
        temperature: request.temperature ?? 0,
      }),
    )
    .digest("hex");
}

function getValidator(
  schemaName: string,
  schema: JsonSchema,
): ValidateFunction {
  const cacheKey = `${schemaName}:${JSON.stringify(schema)}`;
  const cached = validatorCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const validator = ajv.compile(schema);
  validatorCache.set(cacheKey, validator);
  return validator;
}

function buildSchemaError(validator: ValidateFunction): SchemaValidationError {
  const details =
    validator.errors?.map((error) => `${error.instancePath || "/"} ${error.message}`).join("; ") ??
    "unknown schema validation error";

  return new SchemaValidationError(details);
}

async function invokeModel<T>(
  request: StructuredLLMRequest<T>,
  modelName: string,
): Promise<{
  response: StructuredLLMResponse<T>;
  breaker: CircuitBreakerSnapshot | null;
}> {
  const model = getModelDefinition(modelName);
  const provider = getProvider(model.provider);
  const validator = getValidator(request.schemaName, request.schema);
  const breaker = getCircuitBreaker(
    `${provider.name}:${modelName}`,
    model.circuitBreaker,
  );
  const timeoutMs = resolveTimeoutMs({
    stageTimeoutMs: request.timeoutMs ?? model.defaultTimeoutMs,
    defaultTimeoutMs: model.defaultTimeoutMs,
  });

  let schemaFailureCount = 0;
  breaker.beforeRequest();

  try {
    const execution: RetryExecutionResult<ProviderStructuredResponse> =
      await retryWithPolicy((attempt) => {
        return withTimeout(
          (signal) =>
            provider.invokeStructured({
              schemaName: request.schemaName,
              schema: request.schema,
              prompt: request.prompt,
              input: request.input,
              model: modelName,
              temperature: request.temperature ?? 0,
              timeoutMs,
              metadata: request.metadata,
              signal,
            }),
          timeoutMs,
          `${request.metadata.stageName}:${modelName}:attempt=${attempt + 1}`,
        );
      }, request.retryPolicy);

    const valid = validator(execution.value.parsedOutput);

    if (!valid) {
      schemaFailureCount += 1;
      throw buildSchemaError(validator);
    }

    breaker.recordSuccess();

    return {
      response: {
        requestId: request.metadata.requestId,
        traceId: request.metadata.traceId,
        provider: execution.value.provider,
        model: execution.value.model,
        output: execution.value.parsedOutput as T,
        rawText: execution.value.rawText,
        latencyMs: execution.value.latencyMs,
        usage: execution.value.usage,
        estimatedCostUsd: estimateCostForTokens(modelName, execution.value.usage),
        retryCount: execution.retryCount,
        fallbackUsed: false,
        cacheHit: false,
        schemaValid: true,
        schemaFailureCount,
      },
      breaker: breaker.snapshot(),
    };
  } catch (error) {
    breaker.recordFailure();
    throw error;
  }
}

export async function invokeStructuredLLM<T>(
  request: StructuredLLMRequest<T>,
): Promise<StructuredLLMResponse<T>> {
  const cache = request.cache ?? (defaultCache as LLMCacheHook<StructuredLLMResponse<T>>);
  const cacheEnabled = process.env.LLM_CACHE_DISABLED !== "true";
  const cacheKey = buildCacheKey(request as StructuredLLMRequest<unknown>);

  if (cacheEnabled) {
    const cached = await cache.get(cacheKey);

    if (cached) {
      return {
        ...cached,
        requestId: request.metadata.requestId,
        traceId: request.metadata.traceId,
        cacheHit: true,
      };
    }
  }

  try {
    const primary = await invokeModel(request, request.model);
    const response = primary.response;

    if (cacheEnabled) {
      await cache.set(cacheKey, response, DEFAULT_CACHE_TTL_MS);
    }

    return response;
  } catch (primaryError) {
    if (!request.fallbackModel || request.fallbackModel === request.model) {
      throw primaryError;
    }

    const primarySchemaFailureCount =
      readErrorCode(primaryError) === "schema_validation_failed" ? 1 : 0;
    const fallback = await invokeModel(request, request.fallbackModel);
    const response = {
      ...fallback.response,
      fallbackUsed: true,
      schemaFailureCount:
        fallback.response.schemaFailureCount + primarySchemaFailureCount,
    };

    if (cacheEnabled) {
      await cache.set(cacheKey, response, DEFAULT_CACHE_TTL_MS);
    }

    return response;
  }
}

export function createInMemoryGatewayCache<T>(): LLMCacheHook<T> {
  return new InMemoryTtlCache<T>();
}
