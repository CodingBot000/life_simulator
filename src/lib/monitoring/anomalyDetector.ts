import type { GuardrailEvaluationActual } from "../guardrail-eval.ts";
import type {
  AnomalyEvaluationSet,
  AnomalyFlags,
  AnomalySource,
  GuardrailDerivedLog,
  GuardrailLogRecord,
  RequestLog,
} from "../types.ts";

function hasActiveFlags(flags: AnomalyFlags): boolean {
  return Object.values(flags).some(Boolean);
}

export function detectRawBasedAnomaly(
  raw: GuardrailEvaluationActual,
): AnomalyFlags {
  return {
    underblocking:
      raw.risk_level === "high" && raw.raw_guardrail_mode === "normal",
    overblocking:
      raw.risk_level === "low" && raw.raw_guardrail_mode === "blocked",
    low_confidence:
      raw.confidence_score < 0.6 || raw.uncertainty_score > 0.4,
    conflict:
      raw.detected_triggers.includes("reasoning_conflict") &&
      raw.raw_guardrail_mode === "normal",
  };
}

export function detectDerivedBasedAnomaly(
  derived: GuardrailDerivedLog,
): AnomalyFlags {
  return {
    underblocking: derived.risk_level === "high" && derived.decision === "allow",
    overblocking: derived.risk_level === "low" && derived.decision === "block",
    low_confidence: derived.confidence < 0.6 || derived.uncertainty > 0.4,
    conflict:
      (Boolean(derived.signals.cost_issue) && derived.risk_level === "low") ||
      (Boolean(derived.signals.safety_issue) &&
        derived.decision === "allow" &&
        derived.risk_level !== "low") ||
      (Boolean(derived.signals.recovery_issue) &&
        derived.decision === "allow" &&
        derived.uncertainty > 0.4),
  };
}

export function buildAnomalyEvaluationSet(params: {
  raw: GuardrailEvaluationActual;
  derived: GuardrailDerivedLog;
}): AnomalyEvaluationSet {
  return {
    anomaly_raw_based: detectRawBasedAnomaly(params.raw),
    anomaly_derived_based: detectDerivedBasedAnomaly(params.derived),
  };
}

export function getAnomalySources(
  anomaly: AnomalyEvaluationSet,
): AnomalySource[] {
  const sources: AnomalySource[] = [];

  if (hasActiveFlags(anomaly.anomaly_raw_based)) {
    sources.push("anomaly_raw_based");
  }

  if (hasActiveFlags(anomaly.anomaly_derived_based)) {
    sources.push("anomaly_derived_based");
  }

  return sources;
}

export function hasAnomaly(
  value: AnomalyEvaluationSet | GuardrailLogRecord | RequestLog,
): boolean {
  if ("anomaly_raw_based" in value && "anomaly_derived_based" in value) {
    return getAnomalySources(value).length > 0;
  }

  if ("guardrail_raw" in value && "guardrail_derived" in value) {
    return hasAnomaly(value.guardrail_derived.anomaly);
  }

  return hasAnomaly(value.guardrail);
}
