import {
  compareGuardrailModes,
  evaluateGuardrailInput,
  normalizeGuardrailMode,
  type DatasetGuardrailMode,
  type GuardrailDatasetInput,
  type GuardrailEvaluationActual,
  type GuardrailEvaluationOptions,
} from "../lib/guardrail-eval.ts";
import type { ThresholdPerformanceMetrics } from "./threshold-objective.ts";

export interface RawThresholdDatasetCase {
  id: string;
  input: GuardrailDatasetInput;
  expected: {
    preferred_mode: DatasetGuardrailMode | "normal" | "careful" | "block";
    acceptable_modes: Array<
      DatasetGuardrailMode | "normal" | "careful" | "block"
    >;
    reason: string;
  };
}

export interface ThresholdDatasetCase {
  id: string;
  input: GuardrailDatasetInput;
  expected: {
    preferred_mode: DatasetGuardrailMode;
    acceptable_modes: DatasetGuardrailMode[];
    reason: string;
  };
}

export interface ThresholdDatasetCaseDiff {
  preferred_match: boolean;
  acceptable_match: boolean;
  overblocking: boolean;
  underblocking: boolean;
}

export interface ThresholdDatasetCaseEvaluation {
  id: string;
  input: GuardrailDatasetInput;
  expected: ThresholdDatasetCase["expected"];
  actual: GuardrailEvaluationActual;
  diff: ThresholdDatasetCaseDiff;
}

export interface ThresholdDatasetEvaluation {
  case_results: ThresholdDatasetCaseEvaluation[];
  metrics: ThresholdPerformanceMetrics;
  overblocking_cases: ThresholdDatasetCaseEvaluation[];
  underblocking_cases: ThresholdDatasetCaseEvaluation[];
}

function formatRate(value: number): number {
  return Number(value.toFixed(2));
}

export function normalizeThresholdDatasetCase(
  rawCase: RawThresholdDatasetCase,
): ThresholdDatasetCase {
  return {
    id: rawCase.id,
    input: rawCase.input,
    expected: {
      preferred_mode: normalizeGuardrailMode(rawCase.expected.preferred_mode),
      acceptable_modes: rawCase.expected.acceptable_modes.map((mode) =>
        normalizeGuardrailMode(mode),
      ),
      reason: rawCase.expected.reason,
    },
  };
}

export function parseThresholdDataset(
  rawDataset: string,
): ThresholdDatasetCase[] {
  const seenIds = new Set<string>();

  return rawDataset
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => normalizeThresholdDatasetCase(JSON.parse(line)))
    .map((item) => {
      if (seenIds.has(item.id)) {
        throw new Error(`Duplicate case id found in threshold dataset: ${item.id}`);
      }

      seenIds.add(item.id);
      return item;
    });
}

export function evaluateThresholdDatasetCase(
  item: ThresholdDatasetCase,
  options: GuardrailEvaluationOptions = {},
): ThresholdDatasetCaseEvaluation {
  const actual = evaluateGuardrailInput(item.input, options);
  const actualMode = actual.guardrail_mode;
  const acceptableModes = item.expected.acceptable_modes;
  const acceptableFloor = acceptableModes.reduce((current, mode) =>
    compareGuardrailModes(mode, current) < 0 ? mode : current,
  );
  const acceptableCeiling = acceptableModes.reduce((current, mode) =>
    compareGuardrailModes(mode, current) > 0 ? mode : current,
  );
  const acceptableMatch = acceptableModes.includes(actualMode);

  return {
    id: item.id,
    input: item.input,
    expected: item.expected,
    actual,
    diff: {
      preferred_match: actualMode === item.expected.preferred_mode,
      acceptable_match: acceptableMatch,
      overblocking:
        !acceptableMatch &&
        compareGuardrailModes(actualMode, acceptableCeiling) > 0,
      underblocking:
        !acceptableMatch &&
        compareGuardrailModes(actualMode, acceptableFloor) < 0,
    },
  };
}

export function evaluateThresholdDataset(
  datasetCases: ThresholdDatasetCase[],
  options: GuardrailEvaluationOptions = {},
): ThresholdDatasetEvaluation {
  const caseResults = datasetCases.map((item) =>
    evaluateThresholdDatasetCase(item, options),
  );
  const preferredMatchCount = caseResults.filter(
    (item) => item.diff.preferred_match,
  ).length;
  const acceptableMatchCount = caseResults.filter(
    (item) => item.diff.acceptable_match,
  ).length;
  const overblockingCases = caseResults.filter((item) => item.diff.overblocking);
  const underblockingCases = caseResults.filter((item) => item.diff.underblocking);
  const total = caseResults.length;

  return {
    case_results: caseResults,
    metrics: {
      total,
      preferred_match_count: preferredMatchCount,
      preferred_match_rate: total === 0 ? 0 : formatRate(preferredMatchCount / total),
      acceptable_match_count: acceptableMatchCount,
      acceptable_match_rate:
        total === 0 ? 0 : formatRate(acceptableMatchCount / total),
      overblocking: overblockingCases.length,
      underblocking: underblockingCases.length,
    },
    overblocking_cases: overblockingCases,
    underblocking_cases: underblockingCases,
  };
}

export function summarizeTriggerPatterns(
  cases: ThresholdDatasetCaseEvaluation[],
): string {
  if (cases.length === 0) {
    return "없음";
  }

  const counts = new Map<string, number>();

  for (const item of cases) {
    const key =
      item.actual.detected_triggers.length > 0
        ? item.actual.detected_triggers.join("+")
        : "no_trigger";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 2)
    .map(([pattern, count]) => `${pattern} (${count}건)`)
    .join(", ");
}
