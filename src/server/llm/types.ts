import type { RetryPolicy } from "../resilience/retry.ts";

export type JsonSchema = Record<string, unknown>;

export interface LLMUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface LLMInvocationMetadata {
  requestId: string;
  traceId: string;
  routeName: string;
  stageName: string;
  userId?: string;
  sessionId?: string;
  promptVersion?: string;
  contextVersion?: string;
  selectedPath?: string[];
}

export interface LLMCacheHook<T> {
  get(key: string): Promise<T | null> | T | null;
  set(key: string, value: T, ttlMs: number): Promise<void> | void;
}

export interface StructuredLLMRequest<T> {
  schemaName: string;
  schema: JsonSchema;
  prompt: string;
  input: string;
  model: string;
  fallbackModel?: string;
  temperature?: number;
  timeoutMs?: number;
  retryPolicy?: Partial<RetryPolicy>;
  cache?: LLMCacheHook<StructuredLLMResponse<T>>;
  metadata: LLMInvocationMetadata;
}

export interface StructuredLLMResponse<T> {
  requestId: string;
  traceId: string;
  provider: string;
  model: string;
  output: T;
  rawText: string;
  latencyMs: number;
  usage: LLMUsage;
  estimatedCostUsd: number;
  retryCount: number;
  fallbackUsed: boolean;
  cacheHit: boolean;
  schemaValid: boolean;
  schemaFailureCount: number;
}

export interface ProviderStructuredRequest {
  schemaName: string;
  schema: JsonSchema;
  prompt: string;
  input: string;
  model: string;
  temperature: number;
  timeoutMs: number;
  metadata: LLMInvocationMetadata;
  signal: AbortSignal;
}

export interface ProviderStructuredResponse {
  provider: string;
  model: string;
  rawText: string;
  parsedOutput: unknown;
  usage: LLMUsage;
  latencyMs: number;
}

export interface LLMProvider {
  readonly name: string;
  invokeStructured(
    request: ProviderStructuredRequest,
  ): Promise<ProviderStructuredResponse>;
}
