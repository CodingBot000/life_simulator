import {
  DEFAULT_GUARDRAIL_THRESHOLD_SET,
  getGuardrailMaxScore,
  getGuardrailThresholdSet,
  resolveGuardrailThresholdCutoff,
  type GuardrailThresholdConfig,
  type GuardrailThresholdSetName,
} from "../config/guardrail-thresholds.ts";
import type {
  AbReasoningResult,
  GuardrailReasoningSignals,
  RiskResult,
  StateContext,
} from "../lib/types.ts";
import { calculateConfidenceScore } from "./confidence.ts";
import { calculateUncertaintyScore } from "./uncertainty.ts";

export type DatasetRiskLevel = "low" | "medium" | "high";
export type DatasetGuardrailMode = "normal" | "careful" | "block";
export type RawGuardrailMode = "normal" | "cautious" | "blocked";
export type GuardrailCalibrationBand = "low" | "medium" | "high";
export type GuardrailTrigger =
  | "ambiguity_high"
  | "reasoning_conflict"
  | "low_confidence"
  | "high_risk";
export type GuardrailStrategy =
  | "ask_more_info"
  | "neutralize_decision"
  | "soft_recommendation"
  | "risk_warning";

export interface GuardrailSignals {
  state_unknown_count: number;
  final_confidence: number;
  a_confidence: number;
  b_confidence: number;
  a_recommendation: "A" | "B";
  b_recommendation: "A" | "B";
  conflict_count: number;
  risk_a: DatasetRiskLevel;
  risk_b: DatasetRiskLevel;
  ambiguous_wording?: boolean;
  evidence_repeat_count?: number;
  user_input?: string;
  context_text?: string;
  scenario_text?: string;
  risk_text?: string;
}

export interface GuardrailEvaluationActual {
  risk_level: DatasetRiskLevel;
  guardrail_mode: DatasetGuardrailMode;
  raw_guardrail_mode: RawGuardrailMode;
  threshold_adjusted: boolean;
  calibration_adjusted: boolean;
  threshold_set: GuardrailThresholdSetName | "custom";
  threshold_score: number;
  threshold_score_ratio: number;
  risk_score: number;
  confidence_score: number;
  uncertainty_score: number;
  confidence_band: GuardrailCalibrationBand;
  uncertainty_band: GuardrailCalibrationBand;
  detected_triggers: GuardrailTrigger[];
  reasoning_signals: GuardrailReasoningSignals;
  score_breakdown: Partial<Record<GuardrailTrigger, number>>;
  effective_thresholds: {
    carefulMin: number;
    blockMin: number;
    maxScore: number;
  };
  guardrail_result: {
    guardrail_triggered: boolean;
    triggers: GuardrailTrigger[];
    strategy: GuardrailStrategy[];
    risk_score: number;
    confidence_score: number;
    uncertainty_score: number;
    reasoning_signals: GuardrailReasoningSignals;
    final_mode: RawGuardrailMode;
  };
  signals: GuardrailSignals;
  reason: string;
}

export interface GuardrailEvaluationOptions {
  thresholdSetName?: GuardrailThresholdSetName;
  thresholds?: GuardrailThresholdConfig;
}

export interface GuardrailArtifactInput {
  stateContext: StateContext;
  riskA: RiskResult;
  riskB: RiskResult;
  reasoning: AbReasoningResult;
  userInput?: string;
}

export const GUARDRAIL_MODE_ORDER: Record<DatasetGuardrailMode, number> = {
  normal: 0,
  careful: 1,
  block: 2,
};

const TRIGGER_TO_STRATEGY: Record<GuardrailTrigger, GuardrailStrategy> = {
  ambiguity_high: "ask_more_info",
  reasoning_conflict: "neutralize_decision",
  low_confidence: "soft_recommendation",
  high_risk: "risk_warning",
};

const CONFIDENCE_BAND_THRESHOLDS = {
  lowMax: 0.42,
  highMin: 0.72,
} as const;

const UNCERTAINTY_BAND_THRESHOLDS = {
  lowMax: 0.34,
  highMin: 0.66,
} as const;

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function buildScoreBreakdown(
  detectedTriggers: GuardrailTrigger[],
  thresholds: GuardrailThresholdConfig,
): Partial<Record<GuardrailTrigger, number>> {
  const breakdown: Partial<Record<GuardrailTrigger, number>> = {};

  for (const trigger of detectedTriggers) {
    if (trigger === "ambiguity_high") {
      breakdown[trigger] = thresholds.uncertaintyWeight;
    } else if (trigger === "reasoning_conflict") {
      breakdown[trigger] = thresholds.escalationWeight;
    } else if (trigger === "low_confidence") {
      breakdown[trigger] = thresholds.confidenceWeight;
    } else if (trigger === "high_risk") {
      breakdown[trigger] = thresholds.riskWeight;
    }
  }

  return breakdown;
}

function computeRiskScore(signals: GuardrailSignals): number {
  const riskValues = [signals.risk_a, signals.risk_b].map((value) => {
    if (value === "high") {
      return 0.84;
    }

    if (value === "medium") {
      return 0.56;
    }

    return 0.22;
  });
  const primaryRisk = Math.max(...riskValues);
  const secondaryRisk = Math.min(...riskValues);
  const combinedScore = primaryRisk + (secondaryRisk >= 0.84 ? 0.08 : secondaryRisk >= 0.56 ? 0.04 : 0);

  return clamp(Number(combinedScore.toFixed(4)));
}

export function scoreToBand(
  score: number,
  thresholds: {
    lowMax: number;
    highMin: number;
  },
): GuardrailCalibrationBand {
  if (score < thresholds.lowMax) {
    return "low";
  }

  if (score >= thresholds.highMin) {
    return "high";
  }

  return "medium";
}

export function normalizeGuardrailMode(mode: string): DatasetGuardrailMode {
  const normalized = mode.trim().toLowerCase();

  if (normalized === "normal") {
    return "normal";
  }

  if (normalized === "careful" || normalized === "cautious") {
    return "careful";
  }

  if (normalized === "block" || normalized === "blocked") {
    return "block";
  }

  throw new Error(`Unsupported guardrail mode: ${mode}`);
}

export function normalizeRiskLevel(value: string): DatasetRiskLevel {
  const normalized = value.trim().toLowerCase();

  if (normalized === "low" || normalized === "medium" || normalized === "high") {
    return normalized;
  }

  throw new Error(`Unsupported risk level: ${value}`);
}

export function scoreToRiskLevel(score: number): DatasetRiskLevel {
  if (score >= 0.75) {
    return "high";
  }

  if (score >= 0.45) {
    return "medium";
  }

  return "low";
}

export function compareGuardrailModes(
  left: DatasetGuardrailMode,
  right: DatasetGuardrailMode,
): number {
  return GUARDRAIL_MODE_ORDER[left] - GUARDRAIL_MODE_ORDER[right];
}

function buildActualReason(
  rawMode: RawGuardrailMode,
  riskLevel: DatasetRiskLevel,
  confidenceBand: GuardrailCalibrationBand,
  uncertaintyBand: GuardrailCalibrationBand,
  detectedTriggers: GuardrailTrigger[],
): string {
  const signalSummary =
    detectedTriggers.length > 0 ? detectedTriggers.join(", ") : "no_trigger";

  if (rawMode === "blocked") {
    return `risk=${riskLevel}, confidence=${confidenceBand}, uncertainty=${uncertaintyBand} 조합으로 block이 필요하다. 핵심 신호는 ${signalSummary}다.`;
  }

  if (rawMode === "cautious") {
    return `risk=${riskLevel}, confidence=${confidenceBand}, uncertainty=${uncertaintyBand} 조합이라 normal보다 careful이 안전하다. 핵심 신호는 ${signalSummary}다.`;
  }

  return `risk=${riskLevel}, confidence=${confidenceBand}, uncertainty=${uncertaintyBand}이며 과도한 guardrail 신호가 없어 normal 유지가 가능하다.`;
}

export function buildGuardrailSignalsFromArtifacts({
  stateContext,
  riskA,
  riskB,
  reasoning,
  userInput,
}: GuardrailArtifactInput): GuardrailSignals {
  const unknownValues = [
    stateContext.user_state.profile_state.risk_preference,
    stateContext.user_state.profile_state.decision_style,
    stateContext.user_state.situational_state.career_stage,
    stateContext.user_state.situational_state.financial_pressure,
    stateContext.user_state.situational_state.time_pressure,
    stateContext.user_state.situational_state.emotional_state,
  ];
  const evidenceRepeatCount = Math.min(
    3,
    stateContext.user_state.memory_state.repeated_patterns.length +
      (stateContext.user_state.memory_state.consistency_notes.length > 0 ? 1 : 0) +
      Math.floor(reasoning.reasoning.comparison.agreements.length / 2),
  );

  return {
    state_unknown_count: unknownValues.filter(
      (value) => value === "unknown" || value === "none" || value.trim().length === 0,
    ).length,
    final_confidence: reasoning.reasoning.final_selection.decision_confidence,
    a_confidence: reasoning.reasoning.a_reasoning.confidence,
    b_confidence: reasoning.reasoning.b_reasoning.confidence,
    a_recommendation: reasoning.reasoning.a_reasoning.recommended_option,
    b_recommendation: reasoning.reasoning.b_reasoning.recommended_option,
    conflict_count: reasoning.reasoning.comparison.conflicts.length,
    risk_a: normalizeRiskLevel(riskA.risk_level),
    risk_b: normalizeRiskLevel(riskB.risk_level),
    evidence_repeat_count: evidenceRepeatCount,
    user_input: userInput,
    context_text: [
      stateContext.state_summary.decision_bias,
      stateContext.state_summary.current_constraint,
      stateContext.state_summary.agent_guidance,
    ]
      .filter(Boolean)
      .join(" "),
    scenario_text: [
      reasoning.reasoning.a_reasoning.summary,
      reasoning.reasoning.b_reasoning.summary,
      reasoning.reasoning.final_selection.why_selected,
    ]
      .filter(Boolean)
      .join(" "),
    risk_text: [
      ...riskA.reasons,
      ...riskB.reasons,
      ...reasoning.reasoning.comparison.conflicts,
    ]
      .filter(Boolean)
      .join(" "),
  };
}

export function evaluateGuardrailSignals(
  signals: GuardrailSignals,
  options: GuardrailEvaluationOptions = {},
): GuardrailEvaluationActual {
  const thresholdSetName =
    options.thresholds || options.thresholdSetName
      ? (options.thresholdSetName ?? "custom")
      : DEFAULT_GUARDRAIL_THRESHOLD_SET;
  const thresholds =
    options.thresholds ??
    getGuardrailThresholdSet(
      options.thresholdSetName ?? DEFAULT_GUARDRAIL_THRESHOLD_SET,
    );
  const uncertaintyResult = calculateUncertaintyScore({
    state_unknown_count: signals.state_unknown_count,
    final_confidence: signals.final_confidence,
    a_confidence: signals.a_confidence,
    b_confidence: signals.b_confidence,
    a_recommendation: signals.a_recommendation,
    b_recommendation: signals.b_recommendation,
    conflict_count: signals.conflict_count,
    ambiguous_wording: signals.ambiguous_wording,
    evidence_repeat_count: signals.evidence_repeat_count,
    text_segments: [
      signals.user_input,
      signals.context_text,
      signals.scenario_text,
      signals.risk_text,
    ].filter((value): value is string => Boolean(value)),
  });
  const detectedTriggers: GuardrailTrigger[] = [];

  if (
    signals.state_unknown_count >= thresholds.ambiguityUnknownMin ||
    signals.final_confidence < thresholds.ambiguityConfidenceMax ||
    uncertaintyResult.reasoning_signals.ambiguous_wording
  ) {
    detectedTriggers.push("ambiguity_high");
  }

  if (
    uncertaintyResult.reasoning_signals.conflicting_signals &&
    signals.conflict_count >= thresholds.conflictCountMin
  ) {
    detectedTriggers.push("reasoning_conflict");
  }

  if (
    signals.final_confidence < thresholds.lowConfidenceMax ||
    signals.a_confidence < thresholds.sideConfidenceMax ||
    signals.b_confidence < thresholds.sideConfidenceMax ||
    uncertaintyResult.reasoning_signals.weak_evidence
  ) {
    detectedTriggers.push("low_confidence");
  }

  if (signals.risk_a === "high" || signals.risk_b === "high") {
    detectedTriggers.push("high_risk");
  }

  const scoreBreakdown = buildScoreBreakdown(detectedTriggers, thresholds);
  const thresholdScore = Object.values(scoreBreakdown).reduce(
    (sum, weight) => sum + (weight ?? 0),
    0,
  );
  const maxScore = getGuardrailMaxScore(thresholds);
  const carefulCutoff = resolveGuardrailThresholdCutoff(
    thresholds.carefulMin,
    thresholds,
  );
  const blockCutoff = resolveGuardrailThresholdCutoff(
    thresholds.blockMin,
    thresholds,
  );
  const thresholdScoreRatio =
    maxScore === 0 ? 0 : Number((thresholdScore / maxScore).toFixed(4));
  const riskScore = computeRiskScore(signals);
  const confidenceResult = calculateConfidenceScore({
    final_confidence: signals.final_confidence,
    a_confidence: signals.a_confidence,
    b_confidence: signals.b_confidence,
    a_recommendation: signals.a_recommendation,
    b_recommendation: signals.b_recommendation,
    conflict_count: signals.conflict_count,
    evidence_repeat_count: signals.evidence_repeat_count,
    uncertainty_score: uncertaintyResult.uncertainty_score,
  });
  const riskLevel = scoreToRiskLevel(riskScore);
  const confidenceBand = scoreToBand(
    confidenceResult.confidence_score,
    CONFIDENCE_BAND_THRESHOLDS,
  );
  const uncertaintyBand = scoreToBand(
    uncertaintyResult.uncertainty_score,
    UNCERTAINTY_BAND_THRESHOLDS,
  );
  const isHighRisk = riskScore >= 0.75;
  const isMediumRisk = riskLevel === "medium";
  const isHighConfidence = confidenceResult.confidence_score >= 0.72;
  const isLowConfidence = confidenceResult.confidence_score < 0.42;
  const isBelowAllowFloor = confidenceResult.confidence_score < 0.6;
  const isBelowReviewFloor = confidenceResult.confidence_score < 0.5;
  const isHighUncertainty = uncertaintyResult.uncertainty_score >= 0.66;
  const hasConflictTrigger = detectedTriggers.includes("reasoning_conflict");
  const hasHighRiskTrigger = detectedTriggers.includes("high_risk");
  const hasLowConfidenceTrigger = detectedTriggers.includes("low_confidence");
  const severeAmbiguityConflict =
    uncertaintyResult.reasoning_signals.conflicting_signals &&
    uncertaintyResult.reasoning_signals.missing_context &&
    confidenceResult.confidence_score >= 0.45 &&
    thresholdScore >= blockCutoff &&
    (isMediumRisk || uncertaintyResult.uncertainty_score >= 0.75);
  let thresholdAdjusted = false;
  let calibrationAdjusted = false;

  let rawMode: RawGuardrailMode = "normal";
  if (
    (isHighRisk &&
      isHighConfidence &&
      uncertaintyResult.uncertainty_score < 0.45) ||
    severeAmbiguityConflict
  ) {
    rawMode = "blocked";
  } else if (
    isHighRisk ||
    (isMediumRisk && isHighConfidence) ||
    isHighUncertainty ||
    thresholdScore >= carefulCutoff ||
    (isLowConfidence && isMediumRisk)
  ) {
    rawMode = "cautious";
  }

  const shouldStrengthenMediumRisk =
    isMediumRisk &&
    (hasConflictTrigger ||
      hasHighRiskTrigger ||
      hasLowConfidenceTrigger ||
      isBelowAllowFloor ||
      isLowConfidence);
  const shouldForceBlockForMediumRisk =
    isMediumRisk &&
    rawMode === "cautious" &&
    hasConflictTrigger &&
    hasHighRiskTrigger &&
    isBelowReviewFloor &&
    thresholdScore >= blockCutoff;

  if (shouldForceBlockForMediumRisk) {
    rawMode = "blocked";
    thresholdAdjusted = true;
  } else if (shouldStrengthenMediumRisk) {
    thresholdAdjusted = true;

    if (rawMode === "normal") {
      rawMode = "cautious";
    }
  }

  if (isBelowAllowFloor) {
    calibrationAdjusted = true;

    if (rawMode === "normal") {
      rawMode = "cautious";
    }
  }

  const activeTriggers = rawMode === "normal" ? [] : detectedTriggers;
  const strategies = activeTriggers.map((trigger) => TRIGGER_TO_STRATEGY[trigger]);
  const guardrailTriggered = rawMode !== "normal";
  const guardrailMode = normalizeGuardrailMode(rawMode);

  return {
    risk_level: riskLevel,
    guardrail_mode: guardrailMode,
    raw_guardrail_mode: rawMode,
    threshold_adjusted: thresholdAdjusted,
    calibration_adjusted: calibrationAdjusted,
    threshold_set: thresholdSetName,
    threshold_score: thresholdScore,
    threshold_score_ratio: thresholdScoreRatio,
    risk_score: riskScore,
    confidence_score: confidenceResult.confidence_score,
    uncertainty_score: uncertaintyResult.uncertainty_score,
    confidence_band: confidenceBand,
    uncertainty_band: uncertaintyBand,
    detected_triggers: detectedTriggers,
    reasoning_signals: uncertaintyResult.reasoning_signals,
    score_breakdown: scoreBreakdown,
    effective_thresholds: {
      carefulMin: carefulCutoff,
      blockMin: blockCutoff,
      maxScore,
    },
    guardrail_result: {
      guardrail_triggered: guardrailTriggered,
      triggers: activeTriggers,
      strategy: strategies,
      risk_score: riskScore,
      confidence_score: confidenceResult.confidence_score,
      uncertainty_score: uncertaintyResult.uncertainty_score,
      reasoning_signals: uncertaintyResult.reasoning_signals,
      final_mode: rawMode,
    },
    signals,
    reason: buildActualReason(
      rawMode,
      riskLevel,
      confidenceBand,
      uncertaintyBand,
      detectedTriggers,
    ),
  };
}

export function evaluateGuardrailArtifacts(
  input: GuardrailArtifactInput,
  options: GuardrailEvaluationOptions = {},
): GuardrailEvaluationActual {
  return evaluateGuardrailSignals(
    buildGuardrailSignalsFromArtifacts(input),
    options,
  );
}
