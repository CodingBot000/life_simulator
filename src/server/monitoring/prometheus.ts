import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  Registry,
} from "prom-client";

declare global {
  // eslint-disable-next-line no-var
  var __lifeSimulatorPromRegistry__: Registry | undefined;
}

const registry =
  globalThis.__lifeSimulatorPromRegistry__ ??
  new Registry();

if (!globalThis.__lifeSimulatorPromRegistry__) {
  collectDefaultMetrics({ register: registry });
  globalThis.__lifeSimulatorPromRegistry__ = registry;
}

function getOrCreateCounter(config: ConstructorParameters<typeof Counter>[0]) {
  return (
    registry.getSingleMetric(config.name) as Counter<string> | undefined
  ) ?? new Counter({ ...config, registers: [registry] });
}

function getOrCreateHistogram(
  config: ConstructorParameters<typeof Histogram>[0],
) {
  return (
    registry.getSingleMetric(config.name) as Histogram<string> | undefined
  ) ?? new Histogram({ ...config, registers: [registry] });
}

const requestsTotal = getOrCreateCounter({
  name: "requests_total",
  help: "Total API requests processed by the simulation route.",
  labelNames: ["route_name", "status"],
});

const requestFailuresTotal = getOrCreateCounter({
  name: "request_failures_total",
  help: "Total failed API requests.",
  labelNames: ["route_name", "error_code"],
});

const requestDegradedTotal = getOrCreateCounter({
  name: "request_degraded_total",
  help: "Total degraded responses returned to callers.",
  labelNames: ["route_name", "error_code"],
});

const requestLatencyMs = getOrCreateHistogram({
  name: "request_latency_ms",
  help: "End-to-end API request latency in milliseconds.",
  labelNames: ["route_name"],
  buckets: [50, 100, 250, 500, 1000, 2000, 4000, 8000],
});

const llmLatencyMs = getOrCreateHistogram({
  name: "llm_latency_ms",
  help: "LLM stage latency in milliseconds.",
  labelNames: ["route_name", "stage_name", "model"],
  buckets: [50, 100, 250, 500, 1000, 2000, 4000, 8000],
});

const llmTokensInTotal = getOrCreateCounter({
  name: "llm_tokens_in_total",
  help: "Total input tokens sent to LLM providers.",
  labelNames: ["route_name", "model"],
});

const llmTokensOutTotal = getOrCreateCounter({
  name: "llm_tokens_out_total",
  help: "Total output tokens returned from LLM providers.",
  labelNames: ["route_name", "model"],
});

const llmCostUsdTotal = getOrCreateCounter({
  name: "llm_cost_usd_total",
  help: "Estimated LLM cost in USD.",
  labelNames: ["route_name", "model"],
});

const guardrailTriggerTotal = getOrCreateCounter({
  name: "guardrail_trigger_total",
  help: "Guardrail trigger counts by trigger type.",
  labelNames: ["route_name", "trigger"],
});

const fallbackTotal = getOrCreateCounter({
  name: "fallback_total",
  help: "Fallback model usages.",
  labelNames: ["route_name", "model"],
});

const retryTotal = getOrCreateCounter({
  name: "retry_total",
  help: "Retry attempts performed against LLM providers.",
  labelNames: ["route_name", "model"],
});

const cacheHitTotal = getOrCreateCounter({
  name: "cache_hit_total",
  help: "Cache hits served by the LLM gateway.",
  labelNames: ["route_name", "stage_name", "model"],
});

const schemaFailTotal = getOrCreateCounter({
  name: "schema_fail_total",
  help: "Structured response schema validation failures.",
  labelNames: ["route_name", "stage_name", "model"],
});

export function recordRequestSuccess(routeName: string, latencyMs: number): void {
  requestsTotal.inc({ route_name: routeName, status: "success" });
  requestLatencyMs.observe({ route_name: routeName }, latencyMs);
}

export function recordRequestFailure(
  routeName: string,
  latencyMs: number,
  errorCode: string,
): void {
  requestsTotal.inc({ route_name: routeName, status: "failure" });
  requestFailuresTotal.inc({ route_name: routeName, error_code: errorCode });
  requestLatencyMs.observe({ route_name: routeName }, latencyMs);
}

export function recordDegradedResponse(
  routeName: string,
  errorCode: string,
): void {
  requestDegradedTotal.inc({ route_name: routeName, error_code: errorCode });
}

export function recordLlmStageMetric(params: {
  routeName: string;
  stageName: string;
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  retryCount: number;
  fallbackUsed: boolean;
  cacheHit: boolean;
  schemaValid: boolean;
  schemaFailureCount: number;
}): void {
  llmLatencyMs.observe(
    {
      route_name: params.routeName,
      stage_name: params.stageName,
      model: params.model,
    },
    params.latencyMs,
  );
  llmTokensInTotal.inc(
    { route_name: params.routeName, model: params.model },
    params.inputTokens,
  );
  llmTokensOutTotal.inc(
    { route_name: params.routeName, model: params.model },
    params.outputTokens,
  );
  llmCostUsdTotal.inc(
    { route_name: params.routeName, model: params.model },
    params.estimatedCostUsd,
  );

  if (params.retryCount > 0) {
    retryTotal.inc(
      { route_name: params.routeName, model: params.model },
      params.retryCount,
    );
  }

  if (params.fallbackUsed) {
    fallbackTotal.inc({ route_name: params.routeName, model: params.model });
  }

  if (params.cacheHit) {
    cacheHitTotal.inc({
      route_name: params.routeName,
      stage_name: params.stageName,
      model: params.model,
    });
  }

  if (params.schemaFailureCount > 0 || !params.schemaValid) {
    schemaFailTotal.inc({
      route_name: params.routeName,
      stage_name: params.stageName,
      model: params.model,
    }, params.schemaFailureCount > 0 ? params.schemaFailureCount : 1);
  }
}

export function recordGuardrailTriggers(
  routeName: string,
  triggers: string[],
): void {
  for (const trigger of triggers) {
    guardrailTriggerTotal.inc({ route_name: routeName, trigger });
  }
}

export async function getMetricsText(): Promise<string> {
  return registry.metrics();
}

export function getMetricsContentType(): string {
  return registry.contentType;
}
