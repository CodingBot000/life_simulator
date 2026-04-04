import type { CircuitBreakerConfig } from "../resilience/circuit-breaker.ts";
import type { LLMUsage } from "./types.ts";

export interface ModelDefinition {
  name: string;
  provider: "openai" | "mock";
  inputCostPer1kTokens: number;
  outputCostPer1kTokens: number;
  defaultTimeoutMs: number;
  circuitBreaker?: Partial<CircuitBreakerConfig>;
}

const modelRegistry: Record<string, ModelDefinition> = {
  "gpt-5": {
    name: "gpt-5",
    provider: "openai",
    inputCostPer1kTokens: 0.01,
    outputCostPer1kTokens: 0.03,
    defaultTimeoutMs: 12_000,
  },
  "gpt-5-mini": {
    name: "gpt-5-mini",
    provider: "openai",
    inputCostPer1kTokens: 0.004,
    outputCostPer1kTokens: 0.012,
    defaultTimeoutMs: 10_000,
  },
  "mock-fast": {
    name: "mock-fast",
    provider: "mock",
    inputCostPer1kTokens: 0,
    outputCostPer1kTokens: 0,
    defaultTimeoutMs: 500,
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeoutMs: 5_000,
    },
  },
  "mock-premium": {
    name: "mock-premium",
    provider: "mock",
    inputCostPer1kTokens: 0,
    outputCostPer1kTokens: 0,
    defaultTimeoutMs: 500,
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeoutMs: 5_000,
    },
  },
};

export function getModelDefinition(modelName: string): ModelDefinition {
  const definition = modelRegistry[modelName];

  if (!definition) {
    throw new Error(`Unknown model "${modelName}" in LLM registry.`);
  }

  return definition;
}

export function shouldUseMockModels(): boolean {
  const mode = process.env.LLM_PROVIDER_MODE?.trim().toLowerCase();

  if (mode === "mock") {
    return true;
  }

  if (mode === "openai") {
    return false;
  }

  return !process.env.OPENAI_API_KEY;
}

export function getRoutingModelCandidates(): {
  lowCost: string;
  premium: string;
  lowCostFallback: string;
  premiumFallback: string;
} {
  if (shouldUseMockModels()) {
    return {
      lowCost: "mock-fast",
      premium: "mock-premium",
      lowCostFallback: "mock-fast",
      premiumFallback: "mock-fast",
    };
  }

  return {
    lowCost: process.env.LOW_COST_MODEL?.trim() || "gpt-5-mini",
    premium: process.env.PREMIUM_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || "gpt-5",
    lowCostFallback:
      process.env.LOW_COST_FALLBACK_MODEL?.trim() || "gpt-5-mini",
    premiumFallback:
      process.env.PREMIUM_FALLBACK_MODEL?.trim() || "gpt-5-mini",
  };
}

export function estimateCostForTokens(
  modelName: string,
  usage: LLMUsage,
): number {
  const definition = getModelDefinition(modelName);

  return Number(
    (
      (usage.inputTokens / 1000) * definition.inputCostPer1kTokens +
      (usage.outputTokens / 1000) * definition.outputCostPer1kTokens
    ).toFixed(6),
  );
}
