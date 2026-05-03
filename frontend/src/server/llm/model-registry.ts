import type { CircuitBreakerConfig } from "../resilience/circuit-breaker.ts";
import type { LLMUsage } from "./types.ts";

export type ProviderMode = "codex" | "openai" | "mock";

export interface ModelDefinition {
  name: string;
  provider: ProviderMode;
  inputCostPer1kTokens: number;
  outputCostPer1kTokens: number;
  defaultTimeoutMs: number;
  circuitBreaker?: Partial<CircuitBreakerConfig>;
}

const modelRegistry: Record<ProviderMode, Record<string, ModelDefinition>> = {
  codex: {
    "gpt-5.4": {
      name: "gpt-5.4",
      provider: "codex",
      inputCostPer1kTokens: 0,
      outputCostPer1kTokens: 0,
      defaultTimeoutMs: 30_000,
    },
    "gpt-5.4-mini": {
      name: "gpt-5.4-mini",
      provider: "codex",
      inputCostPer1kTokens: 0,
      outputCostPer1kTokens: 0,
      defaultTimeoutMs: 20_000,
    },
    "gpt-5.3-codex": {
      name: "gpt-5.3-codex",
      provider: "codex",
      inputCostPer1kTokens: 0,
      outputCostPer1kTokens: 0,
      defaultTimeoutMs: 25_000,
    },
    "gpt-5.3-codex-spark": {
      name: "gpt-5.3-codex-spark",
      provider: "codex",
      inputCostPer1kTokens: 0,
      outputCostPer1kTokens: 0,
      defaultTimeoutMs: 12_000,
    },
  },
  openai: {
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
    "gpt-5.4": {
      name: "gpt-5.4",
      provider: "openai",
      inputCostPer1kTokens: 0.01,
      outputCostPer1kTokens: 0.03,
      defaultTimeoutMs: 12_000,
    },
    "gpt-5.4-mini": {
      name: "gpt-5.4-mini",
      provider: "openai",
      inputCostPer1kTokens: 0.004,
      outputCostPer1kTokens: 0.012,
      defaultTimeoutMs: 10_000,
    },
  },
  mock: {
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
  },
};

const codexModelAliases: Record<string, string> = {
  "gpt-5": "gpt-5.3-codex-spark",
  "gpt-5-mini": "gpt-5.3-codex-spark",
  "gpt-5-codex": "gpt-5.3-codex-spark",
  "gpt-5-codex-mini": "gpt-5.3-codex-spark",
};

export function getModelDefinition(modelName: string): ModelDefinition {
  const mode = getProviderMode();
  const scopedRegistry = modelRegistry[mode] as Partial<
    Record<string, ModelDefinition>
  >;
  const scopedDefinition =
    scopedRegistry[normalizeModelNameForMode(modelName, mode)];
  const definition =
    scopedDefinition ??
    (Object.values(modelRegistry)
      .map((providerRegistry) => providerRegistry[modelName])
      .find(Boolean) ??
      null);

  if (!definition) {
    throw new Error(`Unknown model "${modelName}" in LLM registry.`);
  }

  return definition;
}

export function getProviderMode(): ProviderMode {
  const mode = process.env.LLM_PROVIDER_MODE?.trim().toLowerCase();

  if (mode === "mock" || mode === "openai" || mode === "codex") {
    return mode;
  }

  return "codex";
}

function normalizeModelNameForMode(
  modelName: string,
  mode: ProviderMode,
): string {
  const trimmed = modelName.trim();

  if (mode !== "codex") {
    return trimmed;
  }

  return codexModelAliases[trimmed] ?? trimmed;
}

export function getRoutingModelCandidates(): {
  lowCost: string;
  premium: string;
  lowCostFallback: string;
  premiumFallback: string;
} {
  const mode = getProviderMode();

  if (mode === "mock") {
    return {
      lowCost: "mock-fast",
      premium: "mock-premium",
      lowCostFallback: "mock-fast",
      premiumFallback: "mock-fast",
    };
  }

  return {
    lowCost: normalizeModelNameForMode(
      process.env.LOW_COST_MODEL?.trim() ||
        (mode === "codex" ? "gpt-5.3-codex-spark" : "gpt-5-mini"),
      mode,
    ),
    premium: normalizeModelNameForMode(
      process.env.PREMIUM_MODEL?.trim() ||
        process.env.OPENAI_MODEL?.trim() ||
        (mode === "codex" ? "gpt-5.3-codex-spark" : "gpt-5"),
      mode,
    ),
    lowCostFallback: normalizeModelNameForMode(
      process.env.LOW_COST_FALLBACK_MODEL?.trim() ||
        (mode === "codex" ? "gpt-5.3-codex-spark" : "gpt-5-mini"),
      mode,
    ),
    premiumFallback: normalizeModelNameForMode(
      process.env.PREMIUM_FALLBACK_MODEL?.trim() ||
        (mode === "codex" ? "gpt-5.3-codex-spark" : "gpt-5-mini"),
      mode,
    ),
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
