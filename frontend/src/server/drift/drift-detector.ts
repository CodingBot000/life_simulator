import { readJsonArtifacts } from "../../lib/logger/logStore.ts";
import type { RequestLog } from "../../lib/types.ts";
import type {
  DriftAnomalyEvent,
  DriftMetricSnapshot,
  LLMStageLogEntry,
} from "../logging/types.ts";
import {
  DEFAULT_DRIFT_BASELINE,
  DEFAULT_DRIFT_THRESHOLDS,
} from "./drift-thresholds.ts";

interface RequestRollup {
  requestId: string;
  traceId?: string;
  routeName: string;
  timestamp: string;
  decision: string;
  confidence: number;
  latencyMs: number;
  totalTokens: number;
  estimatedCostUsd: number;
  fallbackUsed: boolean;
  schemaFailed: boolean;
  triggers: string[];
}

function round(value: number): number {
  return Number(value.toFixed(6));
}

function safeRate(count: number, total: number): number {
  return total === 0 ? 0 : round(count / total);
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function percentile(values: number[], quantile: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * quantile) - 1),
  );

  return sorted[index];
}

function bucketLabel(timestamp: string, bucketHours: number): string {
  const date = new Date(timestamp);
  const hour = Math.floor(date.getUTCHours() / bucketHours) * bucketHours;
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
}

function isWithinRange(timestamp: string, from?: Date, to?: Date): boolean {
  const time = new Date(timestamp).getTime();

  if (Number.isNaN(time)) {
    return false;
  }

  if (from && time < from.getTime()) {
    return false;
  }

  if (to && time > to.getTime()) {
    return false;
  }

  return true;
}

function buildRequestRollups(
  requestLogs: RequestLog[],
  stageLogs: LLMStageLogEntry[],
): RequestRollup[] {
  const stageMap = new Map<string, LLMStageLogEntry[]>();

  for (const stage of stageLogs) {
    const current = stageMap.get(stage.request_id) ?? [];
    current.push(stage);
    stageMap.set(stage.request_id, current);
  }

  return requestLogs.map((requestLog) => {
    const stages = stageMap.get(requestLog.request_id) ?? [];
    const totalTokens =
      stages.reduce((sum, stage) => sum + stage.total_tokens, 0) ||
      requestLog.meta.tokens;
    const estimatedCostUsd = round(
      stages.reduce((sum, stage) => sum + stage.estimated_cost_usd, 0),
    );

    return {
      requestId: requestLog.request_id,
      routeName: "simulate",
      timestamp: requestLog.timestamp,
      decision: requestLog.guardrail.guardrail_derived.decision,
      confidence: requestLog.guardrail.guardrail_derived.confidence,
      latencyMs: requestLog.meta.latency_ms,
      totalTokens,
      estimatedCostUsd,
      fallbackUsed: stages.some((stage) => stage.fallback_used),
      schemaFailed: stages.some(
        (stage) => !stage.schema_valid || stage.schema_failure_count > 0,
      ),
      triggers:
        requestLog.guardrail.guardrail_derived.summary.detected_triggers ?? [],
    };
  });
}

function buildTriggerDistribution(rollups: RequestRollup[]): Record<string, number> {
  const counts = new Map<string, number>();

  for (const rollup of rollups) {
    for (const trigger of rollup.triggers) {
      counts.set(trigger, (counts.get(trigger) ?? 0) + 1);
    }
  }

  const total = rollups.length;
  const result: Record<string, number> = {};

  for (const [key, count] of counts.entries()) {
    result[key] = safeRate(count, total);
  }

  return result;
}

function buildAnomalies(
  routeName: string,
  snapshot: Omit<DriftMetricSnapshot, "anomalies">,
): DriftAnomalyEvent[] {
  const anomalies: DriftAnomalyEvent[] = [];

  if (snapshot.request_count < DEFAULT_DRIFT_THRESHOLDS.minSampleSize) {
    return anomalies;
  }

  const createdAt = snapshot.created_at;

  if (snapshot.low_confidence_allow_rate > DEFAULT_DRIFT_THRESHOLDS.lowConfidenceAllowRateMax) {
    anomalies.push({
      route_name: routeName,
      anomaly_type: "low_confidence_allow",
      severity: "critical",
      metric_name: "low_confidence_allow_rate",
      current_value: snapshot.low_confidence_allow_rate,
      baseline_value: DEFAULT_DRIFT_BASELINE.lowConfidenceAllowRate,
      threshold: DEFAULT_DRIFT_THRESHOLDS.lowConfidenceAllowRateMax,
      message: "low_confidence_allow should remain zero in deterministic production mode.",
      created_at: createdAt,
    });
  }

  if (snapshot.block_rate > DEFAULT_DRIFT_THRESHOLDS.blockRateMax) {
    anomalies.push({
      route_name: routeName,
      anomaly_type: "unexpected_block_rate",
      severity: "critical",
      metric_name: "block_rate",
      current_value: snapshot.block_rate,
      baseline_value: DEFAULT_DRIFT_BASELINE.blockRate,
      threshold: DEFAULT_DRIFT_THRESHOLDS.blockRateMax,
      message: "Block decisions appeared above the allowed production threshold.",
      created_at: createdAt,
    });
  }

  if (snapshot.schema_fail_rate > DEFAULT_DRIFT_THRESHOLDS.schemaFailRateMax) {
    anomalies.push({
      route_name: routeName,
      anomaly_type: "schema_fail_rate",
      severity: "critical",
      metric_name: "schema_fail_rate",
      current_value: snapshot.schema_fail_rate,
      baseline_value: DEFAULT_DRIFT_BASELINE.schemaFailRate,
      threshold: DEFAULT_DRIFT_THRESHOLDS.schemaFailRateMax,
      message: "Structured schema validation failures spiked above the safe threshold.",
      created_at: createdAt,
    });
  }

  if (snapshot.fallback_rate > DEFAULT_DRIFT_THRESHOLDS.fallbackRateMax) {
    anomalies.push({
      route_name: routeName,
      anomaly_type: "fallback_rate",
      severity: "critical",
      metric_name: "fallback_rate",
      current_value: snapshot.fallback_rate,
      baseline_value: DEFAULT_DRIFT_BASELINE.fallbackRate,
      threshold: DEFAULT_DRIFT_THRESHOLDS.fallbackRateMax,
      message: "Fallback usage suggests provider instability or schema mismatch drift.",
      created_at: createdAt,
    });
  }

  if (
    snapshot.p95_latency_ms >
    DEFAULT_DRIFT_BASELINE.p95LatencyMs *
      DEFAULT_DRIFT_THRESHOLDS.p95LatencyMultiplierMax
  ) {
    anomalies.push({
      route_name: routeName,
      anomaly_type: "p95_latency_ms",
      severity: "critical",
      metric_name: "p95_latency_ms",
      current_value: snapshot.p95_latency_ms,
      baseline_value: DEFAULT_DRIFT_BASELINE.p95LatencyMs,
      threshold:
        DEFAULT_DRIFT_BASELINE.p95LatencyMs *
        DEFAULT_DRIFT_THRESHOLDS.p95LatencyMultiplierMax,
      message: "Tail latency exceeded the acceptable multiplier over baseline.",
      created_at: createdAt,
    });
  }

  if (
    Math.abs(snapshot.review_rate - DEFAULT_DRIFT_BASELINE.reviewRate) >
    DEFAULT_DRIFT_THRESHOLDS.reviewRateDelta
  ) {
    anomalies.push({
      route_name: routeName,
      anomaly_type: "review_rate_shift",
      severity: "warning",
      metric_name: "review_rate",
      current_value: snapshot.review_rate,
      baseline_value: DEFAULT_DRIFT_BASELINE.reviewRate,
      threshold: DEFAULT_DRIFT_THRESHOLDS.reviewRateDelta,
      message: "Review rate moved materially from the baseline guardrail profile.",
      created_at: createdAt,
    });
  }

  if (
    Math.abs(snapshot.allow_rate - DEFAULT_DRIFT_BASELINE.allowRate) >
    DEFAULT_DRIFT_THRESHOLDS.allowRateDelta
  ) {
    anomalies.push({
      route_name: routeName,
      anomaly_type: "allow_rate_shift",
      severity: "warning",
      metric_name: "allow_rate",
      current_value: snapshot.allow_rate,
      baseline_value: DEFAULT_DRIFT_BASELINE.allowRate,
      threshold: DEFAULT_DRIFT_THRESHOLDS.allowRateDelta,
      message: "Allow rate shifted enough to warrant a routing and guardrail check.",
      created_at: createdAt,
    });
  }

  if (
    snapshot.avg_cost_usd >
    DEFAULT_DRIFT_BASELINE.avgCostUsd *
      DEFAULT_DRIFT_THRESHOLDS.avgCostMultiplierMax
  ) {
    anomalies.push({
      route_name: routeName,
      anomaly_type: "avg_cost_usd",
      severity: "warning",
      metric_name: "avg_cost_usd",
      current_value: snapshot.avg_cost_usd,
      baseline_value: DEFAULT_DRIFT_BASELINE.avgCostUsd,
      threshold:
        DEFAULT_DRIFT_BASELINE.avgCostUsd *
        DEFAULT_DRIFT_THRESHOLDS.avgCostMultiplierMax,
      message: "Average request cost rose beyond the acceptable baseline multiplier.",
      created_at: createdAt,
    });
  }

  for (const [trigger, value] of Object.entries(snapshot.guardrail_trigger_distribution)) {
    const baseline = DEFAULT_DRIFT_BASELINE.triggerDistribution[trigger] ?? 0;

    if (Math.abs(value - baseline) > DEFAULT_DRIFT_THRESHOLDS.triggerDistributionDelta) {
      anomalies.push({
        route_name: routeName,
        anomaly_type: `guardrail_trigger_${trigger}`,
        severity: "warning",
        metric_name: `guardrail_trigger_distribution.${trigger}`,
        current_value: value,
        baseline_value: baseline,
        threshold: DEFAULT_DRIFT_THRESHOLDS.triggerDistributionDelta,
        message: `Guardrail trigger share for ${trigger} drifted beyond the configured delta.`,
        created_at: createdAt,
      });
    }
  }

  return anomalies;
}

export async function detectDriftSnapshots(params?: {
  from?: Date | string;
  to?: Date | string;
  bucketHours?: number;
}): Promise<DriftMetricSnapshot[]> {
  const requestArtifacts = await readJsonArtifacts<RequestLog>("request_logs");
  const stageArtifacts = await readJsonArtifacts<LLMStageLogEntry>("stage_logs");
  const from = params?.from ? new Date(params.from) : undefined;
  const to = params?.to ? new Date(params.to) : undefined;
  const bucketHours = params?.bucketHours ?? 24;
  const rollups = buildRequestRollups(
    requestArtifacts.map((artifact) => artifact.value).filter((value) =>
      isWithinRange(value.timestamp, from, to),
    ),
    stageArtifacts.map((artifact) => artifact.value),
  );
  const buckets = new Map<string, RequestRollup[]>();

  for (const rollup of rollups) {
    const label = bucketLabel(rollup.timestamp, bucketHours);
    const current = buckets.get(label) ?? [];
    current.push(rollup);
    buckets.set(label, current);
  }

  const snapshots: DriftMetricSnapshot[] = [];

  for (const [label, items] of [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const requestCount = items.length;
    const allowCount = items.filter((item) => item.decision === "allow").length;
    const reviewCount = items.filter((item) => item.decision === "review").length;
    const blockCount = items.filter((item) => item.decision === "block").length;
    const lowConfidenceAllowCount = items.filter(
      (item) => item.decision === "allow" && item.confidence < 0.6,
    ).length;
    const schemaFailCount = items.filter((item) => item.schemaFailed).length;
    const fallbackCount = items.filter((item) => item.fallbackUsed).length;
    const latencies = items.map((item) => item.latencyMs);
    const tokens = items.map((item) => item.totalTokens);
    const costs = items.map((item) => item.estimatedCostUsd);
    const triggerDistribution = buildTriggerDistribution(items);
    const baseSnapshot = {
      metric_date: label.slice(0, 10),
      bucket_label: label,
      route_name: "simulate",
      request_count: requestCount,
      allow_rate: safeRate(allowCount, requestCount),
      review_rate: safeRate(reviewCount, requestCount),
      block_rate: safeRate(blockCount, requestCount),
      low_confidence_allow_rate: safeRate(lowConfidenceAllowCount, requestCount),
      schema_fail_rate: safeRate(schemaFailCount, requestCount),
      fallback_rate: safeRate(fallbackCount, requestCount),
      p50_latency_ms: percentile(latencies, 0.5),
      p95_latency_ms: percentile(latencies, 0.95),
      avg_tokens: average(tokens),
      avg_cost_usd: average(costs),
      guardrail_trigger_distribution: triggerDistribution,
      created_at: new Date().toISOString(),
    };

    snapshots.push({
      ...baseSnapshot,
      anomalies: buildAnomalies("simulate", baseSnapshot),
    });
  }

  return snapshots;
}
