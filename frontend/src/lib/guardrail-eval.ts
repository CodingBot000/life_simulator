import {
  compareGuardrailModes,
  evaluateGuardrailArtifacts,
  evaluateGuardrailSignals as evaluateGuardrailSignalSet,
  normalizeGuardrailMode,
  normalizeRiskLevel,
  type DatasetGuardrailMode,
  type DatasetRiskLevel,
  type GuardrailCalibrationBand,
  type GuardrailEvaluationActual,
  type GuardrailEvaluationOptions,
  type GuardrailSignals,
  type GuardrailStrategy,
  type GuardrailTrigger,
  type RawGuardrailMode,
} from "../guardrail/guardrail-evaluator.ts";

export type {
  DatasetGuardrailMode,
  DatasetRiskLevel,
  GuardrailCalibrationBand,
  GuardrailEvaluationActual,
  GuardrailEvaluationOptions,
  GuardrailSignals,
  GuardrailStrategy,
  GuardrailTrigger,
  RawGuardrailMode,
};

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

export const GUARDRAIL_MODE_ORDER: Record<DatasetGuardrailMode, number> = {
  normal: 0,
  careful: 1,
  block: 2,
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

function readOptionalField(source: string, key: string): string | undefined {
  const pattern = new RegExp(
    String.raw`(?:^|[;\n])\s*${escapeRegExp(key)}\s*=\s*([^;\n]+)`,
    "i",
  );
  const match = source.match(pattern);

  return match?.[1]?.trim();
}

function readOptionalInteger(source: string, key: string): number | undefined {
  const value = readOptionalField(source, key);

  if (typeof value === "undefined") {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    throw new Error(`Field "${key}" must be an integer when provided.`);
  }

  return parsed;
}

function readOptionalBoolean(source: string, key: string): boolean | undefined {
  const value = readOptionalField(source, key);

  if (typeof value === "undefined") {
    return undefined;
  }

  const normalized = value.toLowerCase();

  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }

  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }

  throw new Error(`Field "${key}" must be boolean when provided.`);
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
    ambiguous_wording: readOptionalBoolean(source, "ambiguous_wording"),
    evidence_repeat_count: readOptionalInteger(source, "evidence_repeat_count") ?? 0,
    user_input: input.user_input,
    context_text: input.context,
    scenario_text: input.scenario,
    risk_text: input.risk,
  };
}

export function evaluateGuardrailSignals(
  signals: GuardrailSignals,
  options: GuardrailEvaluationOptions = {},
): GuardrailEvaluationActual {
  return evaluateGuardrailSignalSet(signals, options);
}

export function evaluateGuardrailInput(
  input: GuardrailDatasetInput,
  options: GuardrailEvaluationOptions = {},
): GuardrailEvaluationActual {
  const signals = parseGuardrailSignals(input);
  return evaluateGuardrailSignals(signals, options);
}

export { compareGuardrailModes, evaluateGuardrailArtifacts, normalizeGuardrailMode, normalizeRiskLevel };
