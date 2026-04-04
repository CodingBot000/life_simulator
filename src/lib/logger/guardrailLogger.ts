import type { GuardrailEvaluationActual } from "../guardrail-eval.ts";
import type {
  AbReasoningResult,
  GuardrailDecision,
  GuardrailDerivedLog,
  GuardrailLogRecord,
  GuardrailLogSignals,
  GuardrailMode,
  GuardrailThresholdEval,
  OperationalOutputMode,
  RiskResult,
  SimulationRequest,
  StateContext,
} from "../types.ts";

import { buildAnomalyEvaluationSet } from "../monitoring/anomalyDetector.ts";
import { buildArtifactFileName, writeJsonArtifact } from "./logStore.ts";
import { buildLogVersions } from "./logVersions.ts";

const COST_KEYWORDS = [
  "cost",
  "money",
  "salary",
  "income",
  "expense",
  "budget",
  "rent",
  "loan",
  "debt",
  "savings",
  "financial",
  "pay",
  "compensation",
  "월세",
  "대출",
  "부채",
  "연봉",
  "수입",
  "지출",
  "비용",
] as const;

const EFFECT_KEYWORDS = [
  "impact",
  "career",
  "relationship",
  "family",
  "growth",
  "reputation",
  "time",
  "stability",
  "opportunity",
  "health",
  "경력",
  "커리어",
  "관계",
  "가족",
  "영향",
  "성장",
  "안정",
  "기회",
] as const;

const RECOVERY_KEYWORDS = [
  "irreversible",
  "hard to undo",
  "difficult to reverse",
  "long-term lock",
  "commitment",
  "relocation",
  "quit",
  "resign",
  "visa",
  "breakup",
  "marriage",
  "startup",
  "복구",
  "되돌리기",
  "돌이키기",
  "퇴사",
  "이사",
  "유학",
  "창업",
] as const;

const SAFETY_KEYWORDS = [
  "safety",
  "legal",
  "medical",
  "health",
  "burnout",
  "harm",
  "violence",
  "abuse",
  "danger",
  "unsafe",
  "안전",
  "법적",
  "건강",
  "번아웃",
  "위험",
] as const;

export const SIGNAL_MAPPING_NOTE =
  "Derived signals are observational heuristics for online monitoring and do not feed back into the core guardrail evaluator decision.";

function hasKeyword(source: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => source.includes(keyword));
}

function round(value: number): number {
  return Number(value.toFixed(4));
}

function buildSignalCorpus(
  input: SimulationRequest,
  riskA?: RiskResult,
  riskB?: RiskResult,
  reasoning?: AbReasoningResult,
): string {
  return [
    input.decision.context,
    input.decision.optionA,
    input.decision.optionB,
    riskA?.reasons.join(" ") ?? "",
    riskB?.reasons.join(" ") ?? "",
    reasoning?.reasoning.a_reasoning.summary ?? "",
    reasoning?.reasoning.b_reasoning.summary ?? "",
    reasoning?.reasoning.final_selection.why_selected ?? "",
    reasoning?.reasoning.comparison.reason ?? "",
    reasoning?.reasoning.comparison.conflicts.join(" ") ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function inferSignals(
  input: SimulationRequest,
  stateContext: StateContext,
  riskA: RiskResult | undefined,
  riskB: RiskResult | undefined,
  reasoning: AbReasoningResult | undefined,
  evaluation: GuardrailEvaluationActual,
): GuardrailLogSignals {
  const corpus = buildSignalCorpus(input, riskA, riskB, reasoning);
  const financialPressure =
    stateContext.user_state.situational_state.financial_pressure.toLowerCase();

  return {
    cost_issue:
      hasKeyword(corpus, COST_KEYWORDS) ||
      (financialPressure !== "low" &&
        financialPressure !== "none" &&
        financialPressure !== "stable"),
    effect_issue:
      hasKeyword(corpus, EFFECT_KEYWORDS) ||
      evaluation.risk_level !== "low" ||
      (reasoning?.reasoning.comparison.conflicts.length ?? 0) > 0,
    recovery_issue:
      hasKeyword(corpus, RECOVERY_KEYWORDS) ||
      evaluation.uncertainty_score > 0.4 ||
      riskA?.risk_level === "high" ||
      riskB?.risk_level === "high",
    safety_issue:
      hasKeyword(corpus, SAFETY_KEYWORDS) ||
      evaluation.detected_triggers.includes("high_risk"),
  };
}

function buildThresholdEval(
  signals: GuardrailLogSignals,
  evaluation: GuardrailEvaluationActual,
): GuardrailThresholdEval {
  const riskMultiplier =
    evaluation.risk_level === "high"
      ? 1
      : evaluation.risk_level === "medium"
        ? 0.72
        : 0.44;
  const conflictBonus = evaluation.detected_triggers.includes("reasoning_conflict")
    ? 0.1
    : 0;
  const confidenceBonus = evaluation.detected_triggers.includes("low_confidence")
    ? 0.08
    : 0;
  const riskBonus = evaluation.detected_triggers.includes("high_risk") ? 0.12 : 0;

  const costWeight = signals.cost_issue
    ? round(0.18 + riskMultiplier * 0.22 + evaluation.threshold_score_ratio * 0.08)
    : 0;
  const effectWeight = signals.effect_issue
    ? round(0.2 + riskMultiplier * 0.2 + conflictBonus)
    : 0;
  const recoveryWeight = signals.recovery_issue
    ? round(0.18 + evaluation.uncertainty_score * 0.24 + confidenceBonus)
    : 0;
  const safetyWeight = signals.safety_issue
    ? round(0.22 + riskMultiplier * 0.26 + riskBonus)
    : 0;

  return {
    cost_weight: costWeight,
    effect_weight: effectWeight,
    recovery_weight: recoveryWeight,
    safety_weight: safetyWeight,
    total_score: round(
      costWeight + effectWeight + recoveryWeight + safetyWeight,
    ),
  };
}

function mapGuardrailDecision(mode: GuardrailMode): GuardrailDecision {
  if (mode === "blocked") {
    return "block";
  }

  if (mode === "cautious") {
    return "review";
  }

  return "allow";
}

export function mapGuardrailModeToOutputMode(
  mode: GuardrailMode,
): OperationalOutputMode {
  if (mode === "blocked") {
    return "blocked";
  }

  if (mode === "cautious") {
    return "safe";
  }

  return "normal";
}

function buildReasoningTrace(
  input: SimulationRequest,
  riskA: RiskResult | undefined,
  riskB: RiskResult | undefined,
  reasoning: AbReasoningResult | undefined,
  evaluation: GuardrailEvaluationActual,
  signals: GuardrailLogSignals,
  decision: GuardrailDecision,
): string[] {
  const activeSignals = Object.entries(signals)
    .filter(([, value]) => value)
    .map(([key]) => key)
    .join(", ");

  return [
    `input_analysis: ${input.decision.context}`,
    `signal_extraction: ${activeSignals || "none"}`,
    `threshold_compare: risk=${evaluation.risk_level}, threshold_score=${evaluation.threshold_score}, confidence=${round(
      evaluation.confidence_score,
    )}, uncertainty=${round(evaluation.uncertainty_score)}`,
    `risk_summary: A=${riskA?.risk_level ?? "not_run"} (${riskA?.reasons.join(" | ") || "none"}) / B=${riskB?.risk_level ?? "not_run"} (${riskB?.reasons.join(" | ") || "none"})`,
    `reasoning_conflicts: ${reasoning?.reasoning.comparison.conflicts.join(" | ") || "not_run"}`,
    `final_decision: ${decision} because ${evaluation.reason}`,
  ];
}

export function buildGuardrailDerivedLog(params: {
  input: SimulationRequest;
  stateContext: StateContext;
  riskA?: RiskResult;
  riskB?: RiskResult;
  reasoning?: AbReasoningResult;
  evaluation: GuardrailEvaluationActual;
}): GuardrailDerivedLog {
  const { input, stateContext, riskA, riskB, reasoning, evaluation } = params;
  const decision = mapGuardrailDecision(evaluation.guardrail_result.final_mode);
  const outputMode = mapGuardrailModeToOutputMode(
    evaluation.guardrail_result.final_mode,
  );
  const signals = inferSignals(
    input,
    stateContext,
    riskA,
    riskB,
    reasoning,
    evaluation,
  );
  const derived: GuardrailDerivedLog = {
    risk_level: evaluation.risk_level,
    confidence: round(evaluation.confidence_score),
    uncertainty: round(evaluation.uncertainty_score),
    decision,
    output_mode: outputMode,
    summary: {
      raw_guardrail_mode: evaluation.guardrail_result.final_mode,
      output_mode: outputMode,
      detected_triggers: evaluation.detected_triggers,
      trigger_count: evaluation.detected_triggers.length,
      reason: evaluation.reason,
    },
    reasons: [
      evaluation.reason,
      ...(riskA?.reasons ?? []),
      ...(riskB?.reasons ?? []),
    ].slice(0, 6),
    threshold_hit: evaluation.detected_triggers,
    signals,
    threshold_eval: buildThresholdEval(signals, evaluation),
    reasoning_trace: buildReasoningTrace(
      input,
      riskA,
      riskB,
      reasoning,
      evaluation,
      signals,
      decision,
    ),
    decision_flow: [
      "input_analysis",
      "signal_extraction",
      "threshold_compare",
      "final_decision",
    ],
    calibration: {
      adjusted_confidence: round(evaluation.confidence_score),
      calibration_version: buildLogVersions(evaluation).calibration_version,
    },
    mapping_note: SIGNAL_MAPPING_NOTE,
    anomaly: {
      anomaly_raw_based: {
        underblocking: false,
        overblocking: false,
        low_confidence: false,
        conflict: false,
      },
      anomaly_derived_based: {
        underblocking: false,
        overblocking: false,
        low_confidence: false,
        conflict: false,
      },
    },
  };

  derived.anomaly = buildAnomalyEvaluationSet({
    raw: evaluation,
    derived,
  });

  return derived;
}

export function buildGuardrailLogRecord(params: {
  input: SimulationRequest;
  stateContext: StateContext;
  riskA?: RiskResult;
  riskB?: RiskResult;
  reasoning?: AbReasoningResult;
  evaluation: GuardrailEvaluationActual;
}): GuardrailLogRecord {
  const { evaluation } = params;

  return {
    versions: buildLogVersions(evaluation),
    guardrail_raw: JSON.parse(JSON.stringify(evaluation)) as Record<string, unknown>,
    guardrail_derived: buildGuardrailDerivedLog(params),
  };
}

export async function logGuardrail(
  requestId: string,
  timestamp: string,
  guardrailLog: GuardrailLogRecord,
): Promise<string> {
  return writeJsonArtifact(
    "guardrail_logs",
    buildArtifactFileName("guardrail", requestId, timestamp),
    guardrailLog,
  );
}

export { mapGuardrailDecision };
