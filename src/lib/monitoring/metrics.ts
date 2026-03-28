import type {
  AnomalyFlags,
  AnomalyQueueEntry,
  MonitoringAnomalyMetricBreakdown,
  MonitoringCriticalCase,
  MonitoringMetricsSnapshot,
  MonitoringReevaluationMismatch,
  MonitoringTimelinePoint,
  ReEvaluationResult,
  RequestLog,
} from "../types.ts";

import {
  readJsonArtifacts,
  type StoredArtifact,
} from "../logger/logStore.ts";
import { getAnomalySources } from "./anomalyDetector.ts";

export interface MonitoringAggregationOptions {
  from?: Date | string;
  to?: Date | string;
  windowMinutes?: number;
  bucketMinutes?: number;
  criticalCaseLimit?: number;
}

export interface MonitoringArtifactBundle {
  requestLogs: StoredArtifact<RequestLog>[];
  anomalyQueue: StoredArtifact<AnomalyQueueEntry>[];
  reEvaluations: StoredArtifact<ReEvaluationResult>[];
}

const DEFAULT_WINDOW_MINUTES = 24 * 60;
const DEFAULT_BUCKET_MINUTES = 60;
const DEFAULT_CRITICAL_CASE_LIMIT = 10;

function round(value: number): number {
  return Number(value.toFixed(4));
}

function safeRate(count: number, total: number): number {
  if (total === 0) {
    return 0;
  }

  return round(count / total);
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function toDate(value?: Date | string): Date | undefined {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return new Date(value);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function getWindowRange(options: MonitoringAggregationOptions) {
  const to = toDate(options.to) ?? new Date();
  const from =
    toDate(options.from) ??
    new Date(to.getTime() - (options.windowMinutes ?? DEFAULT_WINDOW_MINUTES) * 60_000);

  return {
    from,
    to,
    bucketMinutes: options.bucketMinutes ?? DEFAULT_BUCKET_MINUTES,
    criticalCaseLimit: options.criticalCaseLimit ?? DEFAULT_CRITICAL_CASE_LIMIT,
  };
}

function isWithinRange(
  value: string,
  from: Date,
  to: Date,
): boolean {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return false;
  }

  return timestamp >= from.getTime() && timestamp <= to.getTime();
}

function toAnomalyFlagKeys(flags: AnomalyFlags): string[] {
  return Object.entries(flags)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);
}

function mergeAnomalyFlags(flagsList: AnomalyFlags[]): AnomalyFlags {
  return flagsList.reduce<AnomalyFlags>(
    (accumulator, flags) => ({
      underblocking: accumulator.underblocking || flags.underblocking,
      overblocking: accumulator.overblocking || flags.overblocking,
      low_confidence: accumulator.low_confidence || flags.low_confidence,
      conflict: accumulator.conflict || flags.conflict,
    }),
    {
      underblocking: false,
      overblocking: false,
      low_confidence: false,
      conflict: false,
    },
  );
}

function hasAnyAnomaly(flags: AnomalyFlags): boolean {
  return Object.values(flags).some(Boolean);
}

function buildAnomalyBreakdown(
  flagsList: AnomalyFlags[],
  totalRequests: number,
): MonitoringAnomalyMetricBreakdown {
  const anomalyCount = flagsList.filter(hasAnyAnomaly).length;

  return {
    anomaly_count: anomalyCount,
    anomaly_rate: safeRate(anomalyCount, totalRequests),
    underblocking_count: flagsList.filter((flags) => flags.underblocking).length,
    overblocking_count: flagsList.filter((flags) => flags.overblocking).length,
    conflict_count: flagsList.filter((flags) => flags.conflict).length,
    low_confidence_count: flagsList.filter((flags) => flags.low_confidence).length,
  };
}

function buildBucketStarts(from: Date, to: Date, bucketMinutes: number): Date[] {
  const starts: Date[] = [];
  const bucketMs = bucketMinutes * 60_000;

  for (let time = from.getTime(); time <= to.getTime(); time += bucketMs) {
    starts.push(new Date(time));
  }

  return starts;
}

function compareRawModes(
  requestLog: RequestLog,
  reeval: ReEvaluationResult,
): boolean {
  const originalMode =
    requestLog.guardrail.guardrail_raw.raw_guardrail_mode ??
    requestLog.guardrail.guardrail_derived.summary.raw_guardrail_mode;
  const reevaluatedMode =
    reeval.reevaluated_guardrail.guardrail_raw.raw_guardrail_mode ??
    reeval.reevaluated_guardrail.guardrail_derived.summary.raw_guardrail_mode;

  return originalMode !== reevaluatedMode;
}

export function buildReevaluationMismatch(
  requestLog: RequestLog,
  reeval: ReEvaluationResult,
): MonitoringReevaluationMismatch | null {
  const original = requestLog.guardrail.guardrail_derived;
  const next = reeval.reevaluated_guardrail.guardrail_derived;
  const mismatch: MonitoringReevaluationMismatch = {
    request_id: requestLog.request_id,
    timestamp: reeval.reevaluated_at,
    decision_changed: original.decision !== next.decision,
    risk_level_changed: original.risk_level !== next.risk_level,
    output_mode_changed: original.output_mode !== next.output_mode,
    raw_mode_changed: compareRawModes(requestLog, reeval),
  };

  return Object.values(mismatch).some((value) => value === true) ? mismatch : null;
}

function isCriticalCase(
  anomalyFlags: AnomalyFlags,
  hasMismatch: boolean,
): boolean {
  return (
    anomalyFlags.underblocking ||
    anomalyFlags.overblocking ||
    anomalyFlags.conflict ||
    hasMismatch
  );
}

function buildCriticalCases(
  requests: RequestLog[],
  mismatchByRequestId: Map<string, MonitoringReevaluationMismatch>,
  limit: number,
): MonitoringCriticalCase[] {
  const cases = requests.map<MonitoringCriticalCase | null>((requestLog) => {
      const rawFlags = requestLog.guardrail.guardrail_derived.anomaly.anomaly_raw_based;
      const derivedFlags =
        requestLog.guardrail.guardrail_derived.anomaly.anomaly_derived_based;
      const unionFlags = mergeAnomalyFlags([rawFlags, derivedFlags]);
      const mismatch = mismatchByRequestId.get(requestLog.request_id);

      if (!isCriticalCase(unionFlags, Boolean(mismatch))) {
        return null;
      }

      const anomalyTypes = toAnomalyFlagKeys(unionFlags);

      if (mismatch) {
        anomalyTypes.push("reeval_mismatch");
      }

      return {
        request_id: requestLog.request_id,
        timestamp: requestLog.timestamp,
        anomaly_types: anomalyTypes,
        anomaly_sources: getAnomalySources(
          requestLog.guardrail.guardrail_derived.anomaly,
        ),
        decision: requestLog.guardrail.guardrail_derived.decision,
        confidence: requestLog.guardrail.guardrail_derived.confidence,
        evaluator_version: requestLog.versions.evaluator_version,
        threshold_version: requestLog.versions.threshold_version,
        prompt_version: requestLog.versions.prompt_version,
      };
    });

  return cases
    .filter((value): value is MonitoringCriticalCase => value !== null)
    .sort((left, right) =>
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
    )
    .slice(0, limit);
}

function createEmptyBreakdown(): MonitoringAnomalyMetricBreakdown {
  return {
    anomaly_count: 0,
    anomaly_rate: 0,
    underblocking_count: 0,
    overblocking_count: 0,
    conflict_count: 0,
    low_confidence_count: 0,
  };
}

function buildTimeline(
  requestLogs: RequestLog[],
  mismatches: MonitoringReevaluationMismatch[],
  from: Date,
  to: Date,
  bucketMinutes: number,
): MonitoringTimelinePoint[] {
  return buildBucketStarts(from, to, bucketMinutes).map((bucketStart) => {
    const bucketEnd = new Date(
      Math.min(
        bucketStart.getTime() + bucketMinutes * 60_000 - 1,
        to.getTime(),
      ),
    );
    const bucketRequests = requestLogs.filter((requestLog) =>
      isWithinRange(requestLog.timestamp, bucketStart, bucketEnd),
    );
    const bucketUnionFlags = bucketRequests.map((requestLog) =>
      mergeAnomalyFlags([
        requestLog.guardrail.guardrail_derived.anomaly.anomaly_raw_based,
        requestLog.guardrail.guardrail_derived.anomaly.anomaly_derived_based,
      ]),
    );
    const bucketCriticalRequestIds = new Set(
      bucketRequests
        .filter((requestLog, index) =>
          isCriticalCase(bucketUnionFlags[index], false),
        )
        .map((requestLog) => requestLog.request_id),
    );
    const bucketMismatches = mismatches.filter((mismatch) =>
      isWithinRange(mismatch.timestamp, bucketStart, bucketEnd),
    );

    for (const mismatch of bucketMismatches) {
      bucketCriticalRequestIds.add(mismatch.request_id);
    }

    return {
      bucket_start: bucketStart.toISOString(),
      bucket_end: bucketEnd.toISOString(),
      total_requests: bucketRequests.length,
      avg_latency_ms: average(
        bucketRequests.map((requestLog) => requestLog.meta.latency_ms),
      ),
      block_rate: safeRate(
        bucketRequests.filter(
          (requestLog) =>
            requestLog.guardrail.guardrail_derived.decision === "block",
        ).length,
        bucketRequests.length,
      ),
      review_rate: safeRate(
        bucketRequests.filter(
          (requestLog) =>
            requestLog.guardrail.guardrail_derived.decision === "review",
        ).length,
        bucketRequests.length,
      ),
      anomaly_rate: safeRate(
        bucketUnionFlags.filter(hasAnyAnomaly).length,
        bucketRequests.length,
      ),
      low_confidence_rate: safeRate(
        bucketUnionFlags.filter((flags) => flags.low_confidence).length,
        bucketRequests.length,
      ),
      reeval_mismatch_count: bucketMismatches.length,
      critical_count: bucketCriticalRequestIds.size,
    };
  });
}

export async function loadMonitoringArtifacts(): Promise<MonitoringArtifactBundle> {
  const [requestLogs, anomalyQueue, reEvaluations] = await Promise.all([
    readJsonArtifacts<RequestLog>("request_logs"),
    readJsonArtifacts<AnomalyQueueEntry>("anomaly_queue"),
    readJsonArtifacts<ReEvaluationResult>("re_eval_results"),
  ]);

  return {
    requestLogs,
    anomalyQueue,
    reEvaluations,
  };
}

export async function getMonitoringMetricsSnapshot(
  options: MonitoringAggregationOptions = {},
): Promise<MonitoringMetricsSnapshot> {
  const { requestLogs, anomalyQueue, reEvaluations } =
    await loadMonitoringArtifacts();
  const { from, to, bucketMinutes, criticalCaseLimit } = getWindowRange(options);
  const filteredRequestLogs = requestLogs
    .map((artifact) => artifact.value)
    .filter((requestLog) => isWithinRange(requestLog.timestamp, from, to));
  const filteredAnomalyQueue = anomalyQueue
    .map((artifact) => artifact.value)
    .filter((entry) => isWithinRange(entry.detected_at, from, to));
  const filteredReEvaluations = reEvaluations
    .map((artifact) => artifact.value)
    .filter((result) => isWithinRange(result.reevaluated_at, from, to));
  const requestById = new Map(
    requestLogs.map((artifact) => [artifact.value.request_id, artifact.value]),
  );
  const mismatches = filteredReEvaluations
    .map((result) => {
      const requestLog = requestById.get(result.request_id);
      return requestLog ? buildReevaluationMismatch(requestLog, result) : null;
    })
    .filter((value): value is MonitoringReevaluationMismatch => value !== null);
  const mismatchByRequestId = new Map(
    mismatches.map((mismatch) => [mismatch.request_id, mismatch]),
  );
  const rawFlags = filteredRequestLogs.map(
    (requestLog) => requestLog.guardrail.guardrail_derived.anomaly.anomaly_raw_based,
  );
  const derivedFlags = filteredRequestLogs.map(
    (requestLog) =>
      requestLog.guardrail.guardrail_derived.anomaly.anomaly_derived_based,
  );
  const unionFlags = filteredRequestLogs.map((requestLog) =>
    mergeAnomalyFlags([
      requestLog.guardrail.guardrail_derived.anomaly.anomaly_raw_based,
      requestLog.guardrail.guardrail_derived.anomaly.anomaly_derived_based,
    ]),
  );
  const totalRequests = filteredRequestLogs.length;
  const rawBreakdown = buildAnomalyBreakdown(rawFlags, totalRequests);
  const derivedBreakdown = buildAnomalyBreakdown(derivedFlags, totalRequests);
  const unionBreakdown = buildAnomalyBreakdown(unionFlags, totalRequests);
  const allowCount = filteredRequestLogs.filter(
    (requestLog) => requestLog.guardrail.guardrail_derived.decision === "allow",
  ).length;
  const reviewCount = filteredRequestLogs.filter(
    (requestLog) => requestLog.guardrail.guardrail_derived.decision === "review",
  ).length;
  const blockCount = filteredRequestLogs.filter(
    (requestLog) => requestLog.guardrail.guardrail_derived.decision === "block",
  ).length;
  const successCount = filteredRequestLogs.filter(
    (requestLog) => requestLog.output.final_answer.trim().length > 0,
  ).length;
  const criticalCount = new Set([
    ...filteredRequestLogs
      .filter((requestLog, index) => isCriticalCase(unionFlags[index], false))
      .map((requestLog) => requestLog.request_id),
    ...mismatches.map((mismatch) => mismatch.request_id),
  ]).size;
  const sourceCounts = {
    anomaly_raw_based: filteredAnomalyQueue.filter((entry) =>
      entry.source.includes("anomaly_raw_based"),
    ).length,
    anomaly_derived_based: filteredAnomalyQueue.filter((entry) =>
      entry.source.includes("anomaly_derived_based"),
    ).length,
  };

  return {
    generated_at: new Date().toISOString(),
    window: {
      from: from.toISOString(),
      to: to.toISOString(),
      duration_minutes: round((to.getTime() - from.getTime()) / 60_000),
      request_count: totalRequests,
    },
    totals: {
      total_requests: totalRequests,
      success_rate: safeRate(successCount, totalRequests),
      avg_latency_ms: average(
        filteredRequestLogs.map((requestLog) => requestLog.meta.latency_ms),
      ),
      allow_count: allowCount,
      review_count: reviewCount,
      block_count: blockCount,
      block_rate: safeRate(blockCount, totalRequests),
      review_rate: safeRate(reviewCount, totalRequests),
      low_confidence_rate: unionBreakdown.low_confidence_count === 0
        ? 0
        : safeRate(unionBreakdown.low_confidence_count, totalRequests),
      anomaly_count: unionBreakdown.anomaly_count,
      anomaly_rate: unionBreakdown.anomaly_rate,
      underblocking_count: unionBreakdown.underblocking_count,
      overblocking_count: unionBreakdown.overblocking_count,
      conflict_count: unionBreakdown.conflict_count,
      low_confidence_anomaly_count: unionBreakdown.low_confidence_count,
      reeval_count: filteredReEvaluations.length,
      reeval_mismatch_count: mismatches.length,
      reeval_mismatch_rate: safeRate(mismatches.length, filteredReEvaluations.length),
      critical_count: criticalCount,
    },
    anomaly_breakdown: {
      raw_based: rawBreakdown,
      derived_based: derivedBreakdown,
      union: unionBreakdown,
    },
    anomaly_queue: {
      total_entries: filteredAnomalyQueue.length,
      source_counts: sourceCounts,
    },
    reeval: {
      reeval_count: filteredReEvaluations.length,
      reeval_mismatch_count: mismatches.length,
      reeval_mismatch_rate: safeRate(mismatches.length, filteredReEvaluations.length),
      mismatches,
    },
    timeline: totalRequests === 0 && filteredReEvaluations.length === 0
      ? []
      : buildTimeline(filteredRequestLogs, mismatches, from, to, bucketMinutes),
    recent_critical_cases:
      totalRequests === 0
        ? []
        : buildCriticalCases(
            filteredRequestLogs,
            mismatchByRequestId,
            criticalCaseLimit,
          ),
  };
}

export function getLocalDayRange(day?: string | Date) {
  const base = toDate(day) ?? new Date();
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  const end = new Date(base);
  end.setHours(23, 59, 59, 999);

  return {
    start,
    end,
  };
}

export function createEmptyMetricsSnapshot(): MonitoringMetricsSnapshot {
  return {
    generated_at: new Date().toISOString(),
    window: {
      from: null,
      to: null,
      duration_minutes: null,
      request_count: 0,
    },
    totals: {
      total_requests: 0,
      success_rate: 0,
      avg_latency_ms: 0,
      allow_count: 0,
      review_count: 0,
      block_count: 0,
      block_rate: 0,
      review_rate: 0,
      low_confidence_rate: 0,
      anomaly_count: 0,
      anomaly_rate: 0,
      underblocking_count: 0,
      overblocking_count: 0,
      conflict_count: 0,
      low_confidence_anomaly_count: 0,
      reeval_count: 0,
      reeval_mismatch_count: 0,
      reeval_mismatch_rate: 0,
      critical_count: 0,
    },
    anomaly_breakdown: {
      raw_based: createEmptyBreakdown(),
      derived_based: createEmptyBreakdown(),
      union: createEmptyBreakdown(),
    },
    anomaly_queue: {
      total_entries: 0,
      source_counts: {
        anomaly_raw_based: 0,
        anomaly_derived_based: 0,
      },
    },
    reeval: {
      reeval_count: 0,
      reeval_mismatch_count: 0,
      reeval_mismatch_rate: 0,
      mismatches: [],
    },
    timeline: [],
    recent_critical_cases: [],
  };
}
