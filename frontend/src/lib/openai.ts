import { randomUUID } from "node:crypto";

import { invokeStructuredLLM } from "../server/llm/client.ts";
import { getRoutingModelCandidates } from "../server/llm/model-registry.ts";

type JsonSchema = {
  type: string;
  [key: string]: unknown;
};

type StructuredOutputParams = {
  schemaName: string;
  schema: JsonSchema;
  prompt: string;
  input: string;
  temperature?: number;
  onUsage?: (usage: StructuredOutputUsage) => void;
};

export interface StructuredOutputUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd?: number;
  latencyMs?: number;
  retryCount?: number;
  fallbackUsed?: boolean;
  cacheHit?: boolean;
}

const OPENAI_MODEL =
  process.env.OPENAI_MODEL?.trim() || getRoutingModelCandidates().premium;

export async function generateStructuredOutput<T>({
  schemaName,
  schema,
  prompt,
  input,
  temperature = 0.3,
  onUsage,
}: StructuredOutputParams): Promise<T> {
  const response = await invokeStructuredLLM<T>({
    schemaName,
    schema,
    prompt,
    input,
    model: OPENAI_MODEL,
    fallbackModel: getRoutingModelCandidates().premiumFallback,
    temperature,
    metadata: {
      requestId: randomUUID(),
      traceId: randomUUID(),
      routeName: "legacy-lib-call",
      stageName: schemaName,
    },
  });

  onUsage?.({
    model: response.model,
    inputTokens: response.usage.inputTokens,
    outputTokens: response.usage.outputTokens,
    totalTokens: response.usage.totalTokens,
    estimatedCostUsd: response.estimatedCostUsd,
    latencyMs: response.latencyMs,
    retryCount: response.retryCount,
    fallbackUsed: response.fallbackUsed,
    cacheHit: response.cacheHit,
  });

  return response.output;
}

export { OPENAI_MODEL };
