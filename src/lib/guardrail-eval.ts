export type DatasetRiskLevel = "low" | "medium" | "high";
export type DatasetGuardrailMode = "normal" | "careful" | "block";
export type RawGuardrailMode = "normal" | "cautious" | "blocked";
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

import {
  DEFAULT_GUARDRAIL_THRESHOLD_SET,
  getGuardrailThresholdSet,
  type GuardrailThresholdConfig,
  type GuardrailThresholdSetName,
} from "../config/guardrail-thresholds.ts";

export interface GuardrailDatasetInput {
  user_input: string;
  context: string;
  scenario: string;
  risk: string;
}

export interface GuardrailDatasetExpected {
  risk_level: DatasetRiskLevel;
  guardrail_mode: DatasetGuardrailMode | RawGuardrailMode;
  reason: string;
}

export interface GuardrailDatasetCase {
  id: string;
  input: GuardrailDatasetInput;
  expected: GuardrailDatasetExpected;
}

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
}

export interface GuardrailEvaluationActual {
  risk_level: DatasetRiskLevel;
  guardrail_mode: DatasetGuardrailMode;
  raw_guardrail_mode: RawGuardrailMode;
  threshold_set: GuardrailThresholdSetName | "custom";
  threshold_score: number;
  detected_triggers: GuardrailTrigger[];
  score_breakdown: Partial<Record<GuardrailTrigger, number>>;
  guardrail_result: {
    guardrail_triggered: boolean;
    triggers: GuardrailTrigger[];
    strategy: GuardrailStrategy[];
    final_mode: RawGuardrailMode;
  };
  signals: GuardrailSignals;
  reason: string;
}

export interface GuardrailEvaluationOptions {
  thresholdSetName?: GuardrailThresholdSetName;
  thresholds?: GuardrailThresholdConfig;
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readField(source: string, key: string): string {
  const pattern = new RegExp(
    String.raw`(?:^|[;\n])\s*${escapeRegExp(key)}\s*=\s*([^;\n]+)`,
    "i",
  );
  const match = source.match(pattern);

  if (!match) {
    throw new Error(`Missing required field "${key}" in dataset input.`);
  }

  return match[1].trim();
}

function readNumber(source: string, key: string): number {
  const value = Number.parseFloat(readField(source, key));

  if (Number.isNaN(value)) {
    throw new Error(`Field "${key}" must be numeric.`);
  }

  return value;
}

function readInteger(source: string, key: string): number {
  const value = Number.parseInt(readField(source, key), 10);

  if (Number.isNaN(value)) {
    throw new Error(`Field "${key}" must be an integer.`);
  }

  return value;
}

function readRiskLevel(source: string, key: string): DatasetRiskLevel {
  const value = readField(source, key).toLowerCase();

  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }

  throw new Error(`Field "${key}" must be low, medium, or high.`);
}

function readRecommendation(source: string, key: string): "A" | "B" {
  const value = readField(source, key).toUpperCase();

  if (value === "A" || value === "B") {
    return value;
  }

  throw new Error(`Field "${key}" must be A or B.`);
}

export function normalizeGuardrailMode(
  mode: string,
): DatasetGuardrailMode {
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

export function parseGuardrailSignals(
  input: GuardrailDatasetInput,
): GuardrailSignals {
  const source = [input.context, input.scenario, input.risk].join("\n");

  return {
    state_unknown_count: readInteger(source, "state_unknown_count"),
    final_confidence: readNumber(source, "final_confidence"),
    a_confidence: readNumber(source, "a_confidence"),
    b_confidence: readNumber(source, "b_confidence"),
    a_recommendation: readRecommendation(source, "a_recommendation"),
    b_recommendation: readRecommendation(source, "b_recommendation"),
    conflict_count: readInteger(source, "conflict_count"),
    risk_a: readRiskLevel(source, "risk_a"),
    risk_b: readRiskLevel(source, "risk_b"),
  };
}

function buildActualReason(
  activeTriggers: GuardrailTrigger[],
  detectedTriggers: GuardrailTrigger[],
  rawMode: RawGuardrailMode,
): string {
  if (rawMode === "blocked") {
    return "ambiguity_high와 reasoning_conflict가 동시에 발생해 결론을 막고 추가 정보가 필요하다.";
  }

  if (activeTriggers.includes("high_risk")) {
    return "high_risk 신호가 있어 결론 강도를 낮추는 careful 판단이 맞다.";
  }

  if (activeTriggers.length > 0) {
    return `${activeTriggers.join(", ")} 신호가 있어 normal 대신 careful 모드로 완화해야 한다.`;
  }

  if (detectedTriggers.length > 0) {
    return `${detectedTriggers.join(", ")} 신호가 있었지만 현재 threshold set에서는 normal로 유지된다.`;
  }

  return "명시된 guardrail trigger가 없어 normal 모드로 진행 가능한 저위험 케이스다.";
}

function shouldBlock(
  detectedTriggers: GuardrailTrigger[],
  thresholdScore: number,
  thresholds: GuardrailThresholdConfig,
): boolean {
  const hasAmbiguity = detectedTriggers.includes("ambiguity_high");
  const hasConflict = detectedTriggers.includes("reasoning_conflict");
  const hasHighRisk = detectedTriggers.includes("high_risk");

  if (thresholdScore < thresholds.blockMin) {
    return false;
  }

  if (hasAmbiguity && hasConflict) {
    return true;
  }

  if (
    thresholds.blockOnHighRiskCombo &&
    hasHighRisk &&
    (hasAmbiguity || hasConflict)
  ) {
    return true;
  }

  return false;
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
  const detectedTriggers: GuardrailTrigger[] = [];

  if (
    signals.state_unknown_count >= thresholds.ambiguityUnknownMin ||
    signals.final_confidence < thresholds.ambiguityConfidenceMax
  ) {
    detectedTriggers.push("ambiguity_high");
  }

  if (
    signals.a_recommendation !== signals.b_recommendation &&
    signals.conflict_count >= thresholds.conflictCountMin &&
    signals.final_confidence < thresholds.conflictConfidenceMax
  ) {
    detectedTriggers.push("reasoning_conflict");
  }

  if (
    signals.final_confidence < thresholds.lowConfidenceMax ||
    signals.a_confidence < thresholds.sideConfidenceMax ||
    signals.b_confidence < thresholds.sideConfidenceMax
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

  let rawMode: RawGuardrailMode = "normal";
  if (shouldBlock(detectedTriggers, thresholdScore, thresholds)) {
    rawMode = "blocked";
  } else if (thresholdScore >= thresholds.carefulMin) {
    rawMode = "cautious";
  }

  const activeTriggers = rawMode === "normal" ? [] : detectedTriggers;
  const strategies = activeTriggers.map((trigger) => TRIGGER_TO_STRATEGY[trigger]);
  const guardrailTriggered = rawMode !== "normal";

  const guardrailMode = normalizeGuardrailMode(rawMode);
  const riskLevel: DatasetRiskLevel =
    rawMode === "blocked" || detectedTriggers.includes("high_risk")
      ? "high"
      : guardrailTriggered
        ? "medium"
        : "low";

  return {
    risk_level: riskLevel,
    guardrail_mode: guardrailMode,
    raw_guardrail_mode: rawMode,
    threshold_set: thresholdSetName,
    threshold_score: thresholdScore,
    detected_triggers: detectedTriggers,
    score_breakdown: scoreBreakdown,
    guardrail_result: {
      guardrail_triggered: guardrailTriggered,
      triggers: activeTriggers,
      strategy: strategies,
      final_mode: rawMode,
    },
    signals,
    reason: buildActualReason(activeTriggers, detectedTriggers, rawMode),
  };
}

export function evaluateGuardrailInput(
  input: GuardrailDatasetInput,
  options: GuardrailEvaluationOptions = {},
): GuardrailEvaluationActual {
  const signals = parseGuardrailSignals(input);
  return evaluateGuardrailSignals(signals, options);
}

export function compareGuardrailModes(
  left: DatasetGuardrailMode,
  right: DatasetGuardrailMode,
): number {
  return GUARDRAIL_MODE_ORDER[left] - GUARDRAIL_MODE_ORDER[right];
}
