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
  RiskFactor,
  RiskResult,
  SimulationRequest,
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
  user_context?: SimulationRequest;
  context_text?: string;
  scenario_text?: string;
  risk_text?: string;
  structured_risk_factors?: RiskFactor[];
  structured_conflict?: boolean;
  structured_missing_info?: boolean;
  structured_risk_score?: number;
  structured_low_confidence?: boolean;
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
  deterministic_mode: boolean;
  scoring_input_source: "structured_only" | "legacy_fallback";
  generation_variance_flag: boolean;
  confidence_band: GuardrailCalibrationBand;
  uncertainty_band: GuardrailCalibrationBand;
  detected_triggers: GuardrailTrigger[];
  reasoning_signals: GuardrailReasoningSignals;
  scoring_inputs: {
    risk_factors: RiskFactor[];
    conflict: boolean;
    missing_info: boolean;
    risk_score: number;
    low_confidence: boolean;
  };
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
  userContext?: SimulationRequest;
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

const SAFE_BAND_ALLOW_CONFIDENCE_MIN = 0.64;
const SAFE_BAND_ALLOW_UNCERTAINTY_MAX = 0.45;
const STRICT_SAFE_BAND_CONFIDENCE_MIN = 0.65;
const STRICT_SAFE_BAND_UNCERTAINTY_MAX = 0.45;
const RELAXED_SAFE_BAND_CONFIDENCE_MIN = 0.6;
const RELAXED_SAFE_BAND_UNCERTAINTY_MAX = 0.55;

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function uniqueSortedRiskFactors(factors: RiskFactor[] = []): RiskFactor[] {
  return [...new Set(factors)].sort((left, right) => left.localeCompare(right)) as RiskFactor[];
}

function combineStructuredRiskScores(left: number, right: number): number {
  const primary = Math.max(left, right);
  const secondary = Math.min(left, right);

  return clamp(Number((primary + secondary * 0.08).toFixed(4)));
}

function hasStructuredScoringSignals(
  signals: GuardrailSignals,
): signals is GuardrailSignals &
  Required<
    Pick<
      GuardrailSignals,
      | "structured_risk_factors"
      | "structured_conflict"
      | "structured_missing_info"
      | "structured_risk_score"
      | "structured_low_confidence"
    >
  > {
  return (
    Array.isArray(signals.structured_risk_factors) &&
    typeof signals.structured_conflict === "boolean" &&
    typeof signals.structured_missing_info === "boolean" &&
    typeof signals.structured_risk_score === "number" &&
    typeof signals.structured_low_confidence === "boolean"
  );
}

function buildAmbiguityTextSegments(signals: GuardrailSignals): string[] {
  const userContext = signals.user_context;

  return [
    signals.user_input,
    userContext?.decision.context,
    userContext?.decision.optionA,
    userContext?.decision.optionB,
    userContext?.userProfile.job,
    ...(userContext?.userProfile.priority ?? []),
    ...(userContext?.prior_memory?.repeated_patterns ?? []),
    ...(userContext?.prior_memory?.consistency_notes ?? []),
    userContext?.state_hints?.profile_state?.risk_preference,
    userContext?.state_hints?.profile_state?.decision_style,
    ...(userContext?.state_hints?.profile_state?.top_priorities ?? []),
    userContext?.state_hints?.situational_state?.career_stage,
    userContext?.state_hints?.situational_state?.financial_pressure,
    userContext?.state_hints?.situational_state?.time_pressure,
    userContext?.state_hints?.situational_state?.emotional_state,
  ].filter((value): value is string => Boolean(value));
}

function buildStructuredScoringInputs(signals: GuardrailSignals): {
  risk_factors: RiskFactor[];
  conflict: boolean;
  missing_info: boolean;
  risk_score: number;
  low_confidence: boolean;
  scoring_input_source: "structured_only" | "legacy_fallback";
} {
  if (hasStructuredScoringSignals(signals)) {
    return {
      risk_factors: uniqueSortedRiskFactors(signals.structured_risk_factors),
      conflict: signals.structured_conflict,
      missing_info: signals.structured_missing_info,
      risk_score: clamp(Number(signals.structured_risk_score.toFixed(4))),
      low_confidence: signals.structured_low_confidence,
      scoring_input_source: "structured_only",
    };
  }

  const fallbackRiskFactors: RiskFactor[] = [];

  if (signals.risk_a !== "low" || signals.risk_b !== "low") {
    fallbackRiskFactors.push("stability_loss");
  }

  if (signals.state_unknown_count > 0) {
    fallbackRiskFactors.push("execution_uncertainty");
  }

  if (signals.conflict_count > 0) {
    fallbackRiskFactors.push("emotional_burden");
  }

  return {
    risk_factors: uniqueSortedRiskFactors(fallbackRiskFactors),
    conflict:
      signals.conflict_count > 0 ||
      signals.a_recommendation !== signals.b_recommendation,
    missing_info: signals.state_unknown_count > 0,
    risk_score: computeRiskScore(signals),
    low_confidence:
      signals.final_confidence < 0.68 ||
      Math.min(signals.a_confidence, signals.b_confidence) < 0.62,
    scoring_input_source: "legacy_fallback",
  };
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
  if (typeof signals.structured_risk_score === "number") {
    return clamp(Number(signals.structured_risk_score.toFixed(4)));
  }

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
  userContext,
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
  const structuredRiskFactors = uniqueSortedRiskFactors([
    ...(riskA.structured_assessment?.risk_factors ?? []),
    ...(riskB.structured_assessment?.risk_factors ?? []),
  ]);
  const structuredMissingInfo =
    Boolean(riskA.structured_assessment?.missing_info) ||
    Boolean(riskB.structured_assessment?.missing_info) ||
    Boolean(reasoning.structured_signals?.missing_info);
  const structuredRiskScore =
    typeof riskA.structured_assessment?.risk_score === "number" &&
    typeof riskB.structured_assessment?.risk_score === "number"
      ? combineStructuredRiskScores(
          riskA.structured_assessment.risk_score,
          riskB.structured_assessment.risk_score,
        )
      : undefined;
  const hasFinancialPressure = structuredRiskFactors.includes("financial_pressure");
  const hasExecutionUncertainty =
    structuredRiskFactors.includes("execution_uncertainty");
  const hasGrowthTradeoff = structuredRiskFactors.includes("growth_tradeoff");
  const relationshipTradeoffOnly =
    structuredRiskFactors.length > 0 &&
    structuredRiskFactors.every((factor) =>
      factor === "emotional_burden" ||
      factor === "growth_tradeoff" ||
      factor === "relationship_strain"
    );
  const evidenceBackedStructuredCase =
    evidenceRepeatCount >= 2 &&
    typeof structuredRiskScore === "number" &&
    structuredRiskScore <= 0.54;
  const stableNoFinancialExecutionTradeoff =
    hasFinancialPressure === false &&
    hasExecutionUncertainty === false &&
    hasGrowthTradeoff === false &&
    structuredRiskFactors.includes("health_burnout") === false;
  const structuredConflict =
    Boolean(reasoning.structured_signals?.conflict) &&
    !(structuredMissingInfo === false &&
      (evidenceBackedStructuredCase ||
        stableNoFinancialExecutionTradeoff ||
        relationshipTradeoffOnly));

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
    user_context: userContext,
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
    structured_risk_factors: structuredRiskFactors,
    structured_conflict: structuredConflict,
    structured_missing_info: structuredMissingInfo,
    structured_risk_score: structuredRiskScore,
    structured_low_confidence: reasoning.structured_signals?.low_confidence,
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
  const scoringInputs = buildStructuredScoringInputs(signals);
  const useStructuredOnlyScoring =
    scoringInputs.scoring_input_source === "structured_only";
  const isV7LikeThreshold =
    thresholdSetName === "baseline-v7" || thresholdSetName === "baseline-v8";
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
    text_segments: buildAmbiguityTextSegments(signals),
    risk_score: scoringInputs.risk_score,
    risk_factors: scoringInputs.risk_factors,
    conflict: scoringInputs.conflict,
    missing_info: scoringInputs.missing_info,
    low_confidence: scoringInputs.low_confidence,
  });
  const detectedTriggers: GuardrailTrigger[] = [];

  if (uncertaintyResult.reasoning_signals.ambiguous_wording) {
    detectedTriggers.push("ambiguity_high");
  }

  if (
    uncertaintyResult.reasoning_signals.conflicting_signals &&
    (useStructuredOnlyScoring ||
      signals.conflict_count >= thresholds.conflictCountMin)
  ) {
    detectedTriggers.push("reasoning_conflict");
  }

  const hasLowConfidenceSignal = useStructuredOnlyScoring
    ? scoringInputs.low_confidence || uncertaintyResult.reasoning_signals.weak_evidence
    : signals.final_confidence < thresholds.lowConfidenceMax ||
      signals.a_confidence < thresholds.sideConfidenceMax ||
      signals.b_confidence < thresholds.sideConfidenceMax ||
      uncertaintyResult.reasoning_signals.weak_evidence;
  const suppressMarginalLowConfidenceForV7 =
    isV7LikeThreshold &&
    useStructuredOnlyScoring === false &&
    signals.final_confidence >= 0.7 &&
    Math.min(signals.a_confidence, signals.b_confidence) >= 0.6 &&
    scoringInputs.risk_score < 0.75 &&
    uncertaintyResult.reasoning_signals.ambiguous_wording === false &&
    uncertaintyResult.uncertainty_score <= 0.3 &&
    uncertaintyResult.reasoning_signals.weak_evidence === false &&
    scoringInputs.low_confidence === false;

  if (hasLowConfidenceSignal && suppressMarginalLowConfidenceForV7 === false) {
    detectedTriggers.push("low_confidence");
  }

  if (scoringInputs.risk_score >= 0.75) {
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
  const riskScore = scoringInputs.risk_score;
  const confidenceResult = calculateConfidenceScore({
    final_confidence: signals.final_confidence,
    a_confidence: signals.a_confidence,
    b_confidence: signals.b_confidence,
    a_recommendation: signals.a_recommendation,
    b_recommendation: signals.b_recommendation,
    conflict_count: signals.conflict_count,
    evidence_repeat_count: signals.evidence_repeat_count,
    uncertainty_score: uncertaintyResult.uncertainty_score,
    risk_score: scoringInputs.risk_score,
    risk_factors: scoringInputs.risk_factors,
    conflict: scoringInputs.conflict,
    missing_info: scoringInputs.missing_info,
    low_confidence: scoringInputs.low_confidence,
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
  const hasAmbiguityTrigger = detectedTriggers.includes("ambiguity_high");
  const hasConflictTrigger = detectedTriggers.includes("reasoning_conflict");
  const hasHighRiskTrigger = detectedTriggers.includes("high_risk");
  const hasLowConfidenceTrigger = detectedTriggers.includes("low_confidence");
  const hasConflictOnlyTrigger =
    hasConflictTrigger && detectedTriggers.length === 1;
  const severeAmbiguityConflict =
    hasAmbiguityTrigger &&
    uncertaintyResult.reasoning_signals.conflicting_signals &&
    uncertaintyResult.reasoning_signals.missing_context &&
    hasLowConfidenceTrigger &&
    thresholdScore >= blockCutoff &&
    uncertaintyResult.uncertainty_score >= 0.66;
  const conflictOnlyCanBypassCareful =
    isV7LikeThreshold
      ? scoringInputs.missing_info === false ||
        (signals.evidence_repeat_count ?? 0) >= 2
      : true;
  const effectiveCarefulCutoff =
    hasConflictOnlyTrigger && conflictOnlyCanBypassCareful
      ? Math.max(carefulCutoff, 3)
      : carefulCutoff;
  const ambiguityIsMissingContextDriven =
    hasAmbiguityTrigger &&
    scoringInputs.missing_info &&
    signals.final_confidence >= thresholds.ambiguityConfidenceMax &&
    uncertaintyResult.reasoning_signals.ambiguous_wording === false;
  const canRecoverSafeBandAllow =
    thresholdSetName === "baseline-v5" &&
    isMediumRisk &&
    hasAmbiguityTrigger &&
    hasConflictTrigger &&
    detectedTriggers.length === 2 &&
    ambiguityIsMissingContextDriven &&
    hasHighRiskTrigger === false &&
    hasLowConfidenceTrigger === false &&
    confidenceResult.confidence_score >= SAFE_BAND_ALLOW_CONFIDENCE_MIN &&
    uncertaintyResult.uncertainty_score <= SAFE_BAND_ALLOW_UNCERTAINTY_MAX &&
    (signals.evidence_repeat_count ?? 0) >= 2;
  const safeBandAllowsAmbiguityOverride = isV7LikeThreshold
    ? hasAmbiguityTrigger === false &&
      (hasConflictOnlyTrigger === false || conflictOnlyCanBypassCareful)
    : true;
  const meetsStrictSafeBand =
    (thresholdSetName === "baseline-v6" ||
      thresholdSetName === "baseline-v7" ||
      thresholdSetName === "baseline-v8") &&
    safeBandAllowsAmbiguityOverride &&
    hasHighRiskTrigger === false &&
    hasLowConfidenceTrigger === false &&
    confidenceResult.confidence_score >= STRICT_SAFE_BAND_CONFIDENCE_MIN &&
    uncertaintyResult.uncertainty_score <= STRICT_SAFE_BAND_UNCERTAINTY_MAX;
  const meetsRelaxedSafeBand =
    (thresholdSetName === "baseline-v6" ||
      thresholdSetName === "baseline-v7" ||
      thresholdSetName === "baseline-v8") &&
    safeBandAllowsAmbiguityOverride &&
    hasHighRiskTrigger === false &&
    hasLowConfidenceTrigger === false &&
    confidenceResult.confidence_score >= RELAXED_SAFE_BAND_CONFIDENCE_MIN &&
    uncertaintyResult.uncertainty_score <= RELAXED_SAFE_BAND_UNCERTAINTY_MAX;
  const hasSafeBandAllowOverride =
    canRecoverSafeBandAllow || meetsStrictSafeBand || meetsRelaxedSafeBand;
  const meetsV7StableBlockEnvelope =
    isV7LikeThreshold
      ? confidenceResult.confidence_score >= 0.76 &&
        uncertaintyResult.uncertainty_score <= 0.32
      : isHighConfidence && uncertaintyResult.uncertainty_score < 0.45;
  let thresholdAdjusted = false;
  let calibrationAdjusted = false;

  let rawMode: RawGuardrailMode = "normal";
  if (
    (isHighRisk && meetsV7StableBlockEnvelope) ||
    severeAmbiguityConflict
  ) {
    rawMode = "blocked";
  } else if (hasLowConfidenceTrigger) {
    rawMode = "cautious";
  } else if (
    hasSafeBandAllowOverride === false &&
    (isHighRisk ||
      (isMediumRisk && isHighConfidence) ||
      isHighUncertainty ||
      thresholdScore >= effectiveCarefulCutoff ||
      (isLowConfidence && isMediumRisk))
  ) {
    rawMode = "cautious";
  }

  const shouldStrengthenMediumRisk =
    isMediumRisk &&
    hasSafeBandAllowOverride === false &&
    (hasHighRiskTrigger ||
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
  } else if (hasLowConfidenceTrigger) {
    calibrationAdjusted = true;
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
    deterministic_mode: useStructuredOnlyScoring,
    scoring_input_source: scoringInputs.scoring_input_source,
    generation_variance_flag: useStructuredOnlyScoring === false,
    confidence_band: confidenceBand,
    uncertainty_band: uncertaintyBand,
    detected_triggers: detectedTriggers,
    reasoning_signals: uncertaintyResult.reasoning_signals,
    scoring_inputs: scoringInputs,
    score_breakdown: scoreBreakdown,
    effective_thresholds: {
      carefulMin: effectiveCarefulCutoff,
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
