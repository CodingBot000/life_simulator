import {
  artifactExists,
  resolveOnlineLogPath,
  writeJsonArtifact,
} from "../src/lib/logger/logStore.ts";
import { getAnomalySources } from "../src/lib/monitoring/anomalyDetector.ts";
import type {
  AnomalyFlags,
  AnomalyQueueEntry,
  GuardrailDecision,
  GuardrailTrigger,
  RequestLog,
  RiskTolerance,
} from "../src/lib/types.ts";
import {
  buildFlags,
  cloneJson,
  cycleArtifact,
  loadRequestLogArtifacts,
  mapDecisionToOutputMode,
  mapDecisionToRawMode,
} from "./monitoringScriptUtils.ts";

type SeedAnomalyKind =
  | "underblocking"
  | "overblocking"
  | "conflict_primary"
  | "conflict_secondary"
  | "low_confidence";

type SeedAnomalySpec = {
  id: SeedAnomalyKind;
  anomalyKey: keyof AnomalyFlags;
  riskLevel: RiskTolerance;
  decision: GuardrailDecision;
  confidence: number;
  uncertainty: number;
  rawTriggers: GuardrailTrigger[];
  signalOverrides?: Partial<RequestLog["guardrail"]["guardrail_derived"]["signals"]>;
};

const SEED_SPECS: SeedAnomalySpec[] = [
  {
    id: "underblocking",
    anomalyKey: "underblocking",
    riskLevel: "high",
    decision: "allow",
    confidence: 0.78,
    uncertainty: 0.22,
    rawTriggers: ["high_risk"],
    signalOverrides: {
      safety_issue: true,
      effect_issue: true,
      recovery_issue: true,
    },
  },
  {
    id: "overblocking",
    anomalyKey: "overblocking",
    riskLevel: "low",
    decision: "block",
    confidence: 0.68,
    uncertainty: 0.28,
    rawTriggers: [],
    signalOverrides: {
      cost_issue: false,
      effect_issue: false,
      recovery_issue: false,
      safety_issue: false,
    },
  },
  {
    id: "conflict_primary",
    anomalyKey: "conflict",
    riskLevel: "low",
    decision: "allow",
    confidence: 0.71,
    uncertainty: 0.31,
    rawTriggers: ["reasoning_conflict"],
    signalOverrides: {
      cost_issue: true,
      effect_issue: true,
      recovery_issue: false,
      safety_issue: false,
    },
  },
  {
    id: "conflict_secondary",
    anomalyKey: "conflict",
    riskLevel: "medium",
    decision: "allow",
    confidence: 0.63,
    uncertainty: 0.46,
    rawTriggers: ["reasoning_conflict", "low_confidence"],
    signalOverrides: {
      cost_issue: false,
      effect_issue: true,
      recovery_issue: true,
      safety_issue: true,
    },
  },
  {
    id: "low_confidence",
    anomalyKey: "low_confidence",
    riskLevel: "medium",
    decision: "review",
    confidence: 0.42,
    uncertainty: 0.58,
    rawTriggers: ["low_confidence"],
    signalOverrides: {
      cost_issue: true,
      effect_issue: true,
      recovery_issue: true,
      safety_issue: false,
    },
  },
];

function updateRequestLogForSeed(
  template: RequestLog,
  spec: SeedAnomalySpec,
  index: number,
): RequestLog {
  const requestLog = cloneJson(template);
  const seededTimestamp = new Date(Date.now() - (index + 1) * 60_000).toISOString();
  const flags = buildFlags(spec.anomalyKey);
  const outputMode = mapDecisionToOutputMode(spec.decision);
  const rawMode = mapDecisionToRawMode(spec.decision);

  requestLog.timestamp = seededTimestamp;
  requestLog.guardrail.guardrail_raw.risk_level = spec.riskLevel;
  requestLog.guardrail.guardrail_raw.guardrail_mode = rawMode;
  requestLog.guardrail.guardrail_raw.raw_guardrail_mode = rawMode;
  requestLog.guardrail.guardrail_raw.detected_triggers = spec.rawTriggers;
  requestLog.guardrail.guardrail_raw.risk_score =
    spec.riskLevel === "high" ? 0.88 : spec.riskLevel === "medium" ? 0.61 : 0.24;
  requestLog.guardrail.guardrail_raw.confidence_score = spec.confidence;
  requestLog.guardrail.guardrail_raw.uncertainty_score = spec.uncertainty;
  requestLog.guardrail.guardrail_raw.guardrail_result = {
    ...requestLog.guardrail.guardrail_raw.guardrail_result,
    guardrail_triggered: spec.decision !== "allow",
    triggers: spec.rawTriggers,
    strategy:
      spec.decision === "review"
        ? ["ask_more_info", "soft_recommendation"]
        : spec.decision === "block"
          ? ["risk_warning"]
          : [],
    risk_score: requestLog.guardrail.guardrail_raw.risk_score,
    confidence_score: spec.confidence,
    uncertainty_score: spec.uncertainty,
    final_mode: rawMode,
  };
  requestLog.guardrail.guardrail_raw.reason =
    `[seed anomaly] ${spec.id} case for monitoring bootstrap.`;

  requestLog.guardrail.guardrail_derived.risk_level = spec.riskLevel;
  requestLog.guardrail.guardrail_derived.confidence = spec.confidence;
  requestLog.guardrail.guardrail_derived.uncertainty = spec.uncertainty;
  requestLog.guardrail.guardrail_derived.decision = spec.decision;
  requestLog.guardrail.guardrail_derived.output_mode = outputMode;
  requestLog.guardrail.guardrail_derived.summary = {
    ...requestLog.guardrail.guardrail_derived.summary,
    raw_guardrail_mode: rawMode,
    output_mode: outputMode,
    detected_triggers: spec.rawTriggers,
    trigger_count: spec.rawTriggers.length,
    reason: `[seed anomaly] ${spec.id} case for monitoring bootstrap.`,
  };
  requestLog.guardrail.guardrail_derived.reasons = [
    `[seed anomaly] ${spec.id} case for monitoring bootstrap.`,
    ...requestLog.guardrail.guardrail_derived.reasons.slice(0, 2),
  ];
  requestLog.guardrail.guardrail_derived.threshold_hit = spec.rawTriggers;
  requestLog.guardrail.guardrail_derived.signals = {
    ...requestLog.guardrail.guardrail_derived.signals,
    ...spec.signalOverrides,
  };
  requestLog.guardrail.guardrail_derived.anomaly = {
    anomaly_raw_based: flags,
    anomaly_derived_based: flags,
  };

  requestLog.output.mode = outputMode;
  requestLog.output.final_answer =
    `[seed anomaly=${spec.id}] original_request_id=${template.request_id}; decision=${spec.decision}; confidence=${spec.confidence}`;
  requestLog.meta.latency_ms = Math.max(900, requestLog.meta.latency_ms);

  return requestLog;
}

async function main() {
  const templates = await loadRequestLogArtifacts({
    allowExampleFallback: true,
  });

  if (templates.length === 0) {
    throw new Error("No request log templates found. Run simulate first or keep example fixtures.");
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (const [index, spec] of SEED_SPECS.entries()) {
    const fileName = `seed-anomaly__${spec.id}.json`;
    const filePath = resolveOnlineLogPath("anomaly_queue", fileName);

    if (await artifactExists(filePath)) {
      skippedCount += 1;
      continue;
    }

    const template = cycleArtifact(templates, index).value;
    const requestLog = updateRequestLogForSeed(template, spec, index);
    const detectedAt = new Date(Date.now() - index * 30_000).toISOString();
    const anomaly = requestLog.guardrail.guardrail_derived.anomaly;
    const entry: AnomalyQueueEntry = {
      queue_id: `seed-${spec.id}-${requestLog.request_id}`,
      detected_at: detectedAt,
      versions: requestLog.versions,
      source: getAnomalySources(anomaly),
      anomaly,
      request_log: requestLog,
    };

    await writeJsonArtifact("anomaly_queue", fileName, entry);
    createdCount += 1;
    console.log(
      `[seed-anomalies] wrote ${fileName} request_id=${requestLog.request_id} anomaly=${spec.anomalyKey}`,
    );
  }

  console.log(
    `[seed-anomalies] completed created=${createdCount} skipped=${skippedCount} target=${SEED_SPECS.length}`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[seed-anomalies] fatal: ${message}`);
  process.exitCode = 1;
});
