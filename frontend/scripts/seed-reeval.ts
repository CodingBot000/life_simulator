import path from "node:path";

import type { GuardrailEvaluationActual } from "../src/lib/guardrail-eval.ts";
import type { StoredArtifact } from "../src/lib/logger/logStore.ts";
import { artifactExists, readJsonArtifacts, resolveOnlineLogPath, writeJsonArtifact } from "../src/lib/logger/logStore.ts";
import {
  detectDerivedBasedAnomaly,
  detectRawBasedAnomaly,
  getAnomalySources,
} from "../src/lib/monitoring/anomalyDetector.ts";
import type {
  AnomalyQueueEntry,
  GuardrailDecision,
  GuardrailLogRecord,
  GuardrailTrigger,
  ReEvaluationResult,
  RequestLog,
  RiskTolerance,
} from "../src/lib/types.ts";
import {
  cloneJson,
  cycleArtifact,
  loadRequestLogArtifacts,
  mapDecisionToOutputMode,
  mapDecisionToRawMode,
} from "./monitoringScriptUtils.ts";

type ReevaluationSeedKind =
  | "decision_changed_01"
  | "decision_changed_02"
  | "risk_level_changed_01"
  | "both_changed_01"
  | "no_change_01";

type ReevaluationSeedSpec = {
  id: ReevaluationSeedKind;
  kind: "decision" | "risk" | "both" | "none";
  nextDecision?: GuardrailDecision;
  nextRiskLevel?: RiskTolerance;
  nextConfidence?: number;
  nextUncertainty?: number;
};

const REEVAL_SPECS: ReevaluationSeedSpec[] = [
  {
    id: "decision_changed_01",
    kind: "decision",
    nextDecision: "review",
    nextConfidence: 0.46,
    nextUncertainty: 0.52,
  },
  {
    id: "decision_changed_02",
    kind: "decision",
    nextDecision: "allow",
    nextConfidence: 0.71,
    nextUncertainty: 0.29,
  },
  {
    id: "risk_level_changed_01",
    kind: "risk",
    nextRiskLevel: "high",
    nextConfidence: 0.67,
    nextUncertainty: 0.34,
  },
  {
    id: "both_changed_01",
    kind: "both",
    nextDecision: "block",
    nextRiskLevel: "high",
    nextConfidence: 0.83,
    nextUncertainty: 0.22,
  },
  {
    id: "no_change_01",
    kind: "none",
  },
];

function normalizeRiskLevel(
  original: RiskTolerance,
  next?: RiskTolerance,
): RiskTolerance {
  return next ?? (original === "low" ? "medium" : "low");
}

function normalizeDecision(
  original: GuardrailDecision,
  next?: GuardrailDecision,
): GuardrailDecision {
  return next ?? (original === "allow" ? "review" : "allow");
}

function refreshAnomaly(guardrail: GuardrailLogRecord) {
  guardrail.guardrail_derived.anomaly = {
    anomaly_raw_based: detectRawBasedAnomaly(
      guardrail.guardrail_raw as GuardrailEvaluationActual,
    ),
    anomaly_derived_based: detectDerivedBasedAnomaly(
      guardrail.guardrail_derived,
    ),
  };
}

function isAnomalyQueueArtifact(
  artifact: StoredArtifact<AnomalyQueueEntry> | StoredArtifact<RequestLog>,
): artifact is StoredArtifact<AnomalyQueueEntry> {
  return "source" in artifact.value;
}

function buildReevaluatedGuardrail(
  requestLog: RequestLog,
  spec: ReevaluationSeedSpec,
): GuardrailLogRecord {
  const guardrail = cloneJson(requestLog.guardrail);
  const originalDecision = guardrail.guardrail_derived.decision;
  const originalRiskLevel = guardrail.guardrail_derived.risk_level;
  const nextDecision =
    spec.kind === "risk" || spec.kind === "none"
      ? originalDecision
      : normalizeDecision(originalDecision, spec.nextDecision);
  const nextRiskLevel =
    spec.kind === "decision" || spec.kind === "none"
      ? originalRiskLevel
      : normalizeRiskLevel(originalRiskLevel, spec.nextRiskLevel);
  const nextConfidence = spec.nextConfidence ?? guardrail.guardrail_derived.confidence;
  const nextUncertainty = spec.nextUncertainty ?? guardrail.guardrail_derived.uncertainty;
  const nextOutputMode = mapDecisionToOutputMode(nextDecision);
  const nextRawMode = mapDecisionToRawMode(nextDecision);
  const nextTriggers: GuardrailTrigger[] =
    nextDecision === "review"
      ? ["low_confidence"]
      : nextDecision === "block"
        ? ["high_risk"]
        : [];

  guardrail.guardrail_raw.risk_level = nextRiskLevel;
  guardrail.guardrail_raw.guardrail_mode = nextRawMode;
  guardrail.guardrail_raw.raw_guardrail_mode = nextRawMode;
  guardrail.guardrail_raw.confidence_score = nextConfidence;
  guardrail.guardrail_raw.uncertainty_score = nextUncertainty;
  guardrail.guardrail_raw.detected_triggers = nextTriggers;
  guardrail.guardrail_raw.guardrail_result = {
    ...guardrail.guardrail_raw.guardrail_result,
    guardrail_triggered: nextDecision !== "allow",
    triggers: nextTriggers,
    strategy:
      nextDecision === "review"
        ? ["ask_more_info", "soft_recommendation"]
        : nextDecision === "block"
          ? ["risk_warning"]
          : [],
    confidence_score: nextConfidence,
    uncertainty_score: nextUncertainty,
    final_mode: nextRawMode,
  };
  guardrail.guardrail_raw.reason =
    `[seed reeval] ${spec.id} adjusted to ${nextDecision}/${nextRiskLevel}.`;

  guardrail.guardrail_derived.risk_level = nextRiskLevel;
  guardrail.guardrail_derived.decision = nextDecision;
  guardrail.guardrail_derived.output_mode = nextOutputMode;
  guardrail.guardrail_derived.confidence = nextConfidence;
  guardrail.guardrail_derived.uncertainty = nextUncertainty;
  guardrail.guardrail_derived.summary = {
    ...guardrail.guardrail_derived.summary,
    raw_guardrail_mode: nextRawMode,
    output_mode: nextOutputMode,
    detected_triggers: nextTriggers,
    trigger_count: nextTriggers.length,
    reason: `[seed reeval] ${spec.id} adjusted to ${nextDecision}/${nextRiskLevel}.`,
  };
  guardrail.guardrail_derived.reasons = [
    `[seed reeval] ${spec.id} adjusted to ${nextDecision}/${nextRiskLevel}.`,
    ...guardrail.guardrail_derived.reasons.slice(0, 2),
  ];
  guardrail.guardrail_derived.threshold_hit = guardrail.guardrail_raw.detected_triggers;

  refreshAnomaly(guardrail);

  return guardrail;
}

function selectSourceArtifact(
  queueArtifacts: StoredArtifact<AnomalyQueueEntry>[],
  requestArtifact: StoredArtifact<RequestLog>,
  index: number,
): StoredArtifact<AnomalyQueueEntry> | StoredArtifact<RequestLog> {
  if (queueArtifacts.length === 0) {
    return requestArtifact;
  }

  return cycleArtifact(queueArtifacts, index);
}

async function main() {
  const requestArtifacts = await loadRequestLogArtifacts({
    allowExampleFallback: true,
  });

  if (requestArtifacts.length === 0) {
    throw new Error("No request logs available for re-eval seeding.");
  }

  if (
    requestArtifacts.every((artifact) =>
      artifact.path.includes(`${path.sep}examples${path.sep}`),
    )
  ) {
    console.warn(
      "[seed-reeval] request_logs namespace is empty, using example fixtures. Monitoring mismatch aggregation will not reflect these until request_logs are populated.",
    );
  }

  const anomalyQueueArtifacts = await readJsonArtifacts<AnomalyQueueEntry>("anomaly_queue");
  let createdCount = 0;
  let skippedCount = 0;

  for (const [index, spec] of REEVAL_SPECS.entries()) {
    const requestArtifact = cycleArtifact(requestArtifacts, index);
    const sourceArtifact = selectSourceArtifact(
      anomalyQueueArtifacts,
      requestArtifact,
      index,
    );
    const fileName = `seed-reeval__${spec.id}.json`;
    const datasetFileName = `seed-dataset-candidate__${spec.id}.json`;
    const filePath = resolveOnlineLogPath("re_eval_results", fileName);

    if (await artifactExists(filePath)) {
      skippedCount += 1;
      continue;
    }

    const reevaluatedGuardrail = buildReevaluatedGuardrail(
      requestArtifact.value,
      spec,
    );
    const reevaluatedAt = new Date(Date.now() - index * 45_000).toISOString();
    const source =
      isAnomalyQueueArtifact(sourceArtifact)
        ? sourceArtifact.value.source
        : getAnomalySources(reevaluatedGuardrail.guardrail_derived.anomaly);
    const result: ReEvaluationResult = {
      request_id: requestArtifact.value.request_id,
      reevaluated_at: reevaluatedAt,
      source_log_path: sourceArtifact.path,
      versions: requestArtifact.value.versions,
      source,
      anomaly: reevaluatedGuardrail.guardrail_derived.anomaly,
      reevaluated_guardrail: reevaluatedGuardrail,
      dataset_candidate: {
        versions: requestArtifact.value.versions,
        input: requestArtifact.value.input,
        expected: {
          risk_level: reevaluatedGuardrail.guardrail_derived.risk_level,
          decision: reevaluatedGuardrail.guardrail_derived.decision,
          mode: mapDecisionToOutputMode(
            reevaluatedGuardrail.guardrail_derived.decision,
          ),
        },
        source: "online_anomaly",
        judge: "seed_reeval_script",
      },
    };

    await writeJsonArtifact("re_eval_results", fileName, result);
    await writeJsonArtifact(
      "dataset_candidates",
      datasetFileName,
      result.dataset_candidate,
    );
    createdCount += 1;
    console.log(
      `[seed-reeval] wrote ${fileName} request_id=${result.request_id} kind=${spec.kind}`,
    );
  }

  console.log(
    `[seed-reeval] completed created=${createdCount} skipped=${skippedCount} target=${REEVAL_SPECS.length}`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[seed-reeval] fatal: ${message}`);
  process.exitCode = 1;
});
