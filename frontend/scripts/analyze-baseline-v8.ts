import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  evaluateGuardrailArtifacts,
  type GuardrailEvaluationActual,
} from "../src/lib/guardrail-eval.ts";
import { readJsonArtifacts } from "../src/lib/logger/logStore.ts";
import { mapGuardrailDecision } from "../src/lib/logger/guardrailLogger.ts";
import type { AnomalyFlags, RequestLog, SimulationRequest } from "../src/lib/types.ts";

type SeedCase = {
  id: string;
  category: string;
  input: {
    decision: {
      context: string;
    };
  };
};

type VersionKey =
  | "guardrail-threshold-set:baseline-v7"
  | "guardrail-threshold-set:baseline-v8";

type VersionSummary = {
  run_label: string;
  threshold_version: VersionKey;
  matched_seed_count: number;
  missing_seed_ids: string[];
  allow_count: number;
  review_count: number;
  block_count: number;
  allow_rate: number;
  review_rate: number;
  block_rate: number;
  underblocking_count: number;
  overblocking_count: number;
  low_confidence_allow_count: number;
  low_confidence_anomaly_count: number;
  threshold_adjusted_count: number;
  calibration_adjusted_count: number;
  deterministic_mode_true_count: number;
  structured_scoring_count: number;
  generation_variance_flag_count: number;
};

type CaseComparison = {
  seed_id: string;
  category: string;
  baseline_v7_decision: string | null;
  baseline_v8_run1_decision: string | null;
  baseline_v8_run2_decision: string | null;
  baseline_v7_confidence: number | null;
  baseline_v8_run1_confidence: number | null;
  baseline_v8_run2_confidence: number | null;
  baseline_v7_uncertainty: number | null;
  baseline_v8_run1_uncertainty: number | null;
  baseline_v8_run2_uncertainty: number | null;
  baseline_v8_run2_triggers: string[];
  baseline_v8_run2_deterministic_mode: boolean | null;
  baseline_v8_run2_scoring_input_source: string | null;
  baseline_v8_run2_generation_variance_flag: boolean | null;
  recovered_to_allow: boolean;
  became_block: boolean;
  low_confidence_allow_in_v8: boolean;
  decision_changed_between_runs: boolean;
  confidence_delta_between_runs: number | null;
  uncertainty_delta_between_runs: number | null;
  confidence_stable: boolean;
  uncertainty_stable: boolean;
};

type ComparisonReport = {
  generated_at: string;
  seed_case_count: number;
  baseline_v7_latest: VersionSummary;
  baseline_v8_run1: VersionSummary;
  baseline_v8_run2: VersionSummary;
  comparison: {
    allow_count_delta_vs_v7: number;
    review_count_delta_vs_v7: number;
    block_count_delta_vs_v7: number;
    recovered_allow_seed_ids: string[];
    newly_blocked_seed_ids: string[];
    allow_count_target_met_run1: boolean;
    allow_count_target_met_run2: boolean;
    underblocking_zero_maintained: boolean;
    low_confidence_allow_zero_maintained: boolean;
    decision_changed_seed_ids: string[];
    confidence_delta_exceeded_seed_ids: string[];
    uncertainty_delta_exceeded_seed_ids: string[];
    max_confidence_delta: number;
    max_uncertainty_delta: number;
    decision_consistency_passed: boolean;
    score_consistency_passed: boolean;
    deterministic_mode_all_true: boolean;
    scoring_input_source_structured_only: boolean;
    generation_variance_flag_zero: boolean;
  };
  spotlight: {
    case_01: CaseComparison | null;
    case_04: CaseComparison | null;
    case_14: CaseComparison | null;
    case_19: CaseComparison | null;
  };
  cases: CaseComparison[];
};

const OUTPUT_DIR = path.join(process.cwd(), "outputs", "monitoring");
const OUTPUT_JSON_PATH = path.join(OUTPUT_DIR, "baseline-v8-comparison.json");
const OUTPUT_MD_PATH = path.join(OUTPUT_DIR, "baseline-v8-analysis.md");
const SEED_INPUT_PATH = path.join(process.cwd(), "scripts", "seed-inputs.json");

function round(value: number): number {
  return Number(value.toFixed(4));
}

function safeRate(count: number, total: number): number {
  if (total === 0) {
    return 0;
  }

  return round(count / total);
}

function mergeFlags(...flagsList: AnomalyFlags[]): AnomalyFlags {
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

const evaluationCache = new Map<string, GuardrailEvaluationActual>();

function getEvaluation(requestLog: RequestLog): GuardrailEvaluationActual {
  const cached = evaluationCache.get(requestLog.request_id);

  if (cached) {
    return cached;
  }

  const evaluation =
    requestLog.versions.threshold_version === "guardrail-threshold-set:baseline-v8"
      ? (() => {
          if (
            !requestLog.state.state_context ||
            !requestLog.intermediate.risk ||
            !requestLog.intermediate.ab_reasoning
          ) {
            throw new Error(
              `Missing artifacts for v8 reevaluation: ${requestLog.request_id}`,
            );
          }

          return evaluateGuardrailArtifacts({
            stateContext: requestLog.state.state_context,
            riskA: requestLog.intermediate.risk.optionA,
            riskB: requestLog.intermediate.risk.optionB,
            reasoning: requestLog.intermediate.ab_reasoning,
            userInput: requestLog.input.user_query,
            userContext: requestLog.input.user_context as SimulationRequest,
          });
        })()
      : (requestLog.guardrail.guardrail_raw as GuardrailEvaluationActual);

  evaluationCache.set(requestLog.request_id, evaluation);
  return evaluation;
}

function getDecision(requestLog: RequestLog): "allow" | "review" | "block" {
  return mapGuardrailDecision(getEvaluation(requestLog).guardrail_result.final_mode);
}

function hasLowConfidenceAnomaly(evaluation: GuardrailEvaluationActual): boolean {
  return evaluation.confidence_score < 0.6 || evaluation.uncertainty_score > 0.4;
}

async function readSeedCases(): Promise<SeedCase[]> {
  const raw = await readFile(SEED_INPUT_PATH, "utf8");
  return JSON.parse(raw) as SeedCase[];
}

function getSeedCaseIdByContext(seedCases: SeedCase[]): Map<string, string> {
  return new Map(
    seedCases.map((seedCase) => [seedCase.input.decision.context, seedCase.id]),
  );
}

function pickLatestLogsBySeed(
  requestLogs: RequestLog[],
  thresholdVersion: VersionKey,
  seedCaseIdByContext: Map<string, string>,
  limit: number,
): Map<string, RequestLog[]> {
  const latestBySeed = new Map<string, RequestLog[]>();

  for (const requestLog of requestLogs) {
    if (requestLog.versions.threshold_version !== thresholdVersion) {
      continue;
    }

    const seedId = seedCaseIdByContext.get(requestLog.input.user_query);
    if (!seedId) {
      continue;
    }

    const existing = latestBySeed.get(seedId) ?? [];
    existing.push(requestLog);
    existing.sort((left, right) => right.timestamp.localeCompare(left.timestamp));
    latestBySeed.set(seedId, existing.slice(0, limit));
  }

  return latestBySeed;
}

function summarizeFromMap(params: {
  runLabel: string;
  thresholdVersion: VersionKey;
  seedCases: SeedCase[];
  latestBySeed: Map<string, RequestLog>;
}): VersionSummary {
  const total = params.seedCases.length;
  const matchedLogs = params.seedCases
    .map((seedCase) => params.latestBySeed.get(seedCase.id))
    .filter((value): value is RequestLog => Boolean(value));
  const missingSeedIds = params.seedCases
    .map((seedCase) => seedCase.id)
    .filter((seedId) => !params.latestBySeed.has(seedId));
  let allowCount = 0;
  let reviewCount = 0;
  let blockCount = 0;
  let underblockingCount = 0;
  let overblockingCount = 0;
  let lowConfidenceAllowCount = 0;
  let lowConfidenceAnomalyCount = 0;
  let thresholdAdjustedCount = 0;
  let calibrationAdjustedCount = 0;
  let deterministicModeTrueCount = 0;
  let structuredScoringCount = 0;
  let generationVarianceFlagCount = 0;

  for (const requestLog of matchedLogs) {
    const evaluation = getEvaluation(requestLog);
    const decision = getDecision(requestLog);
    const lowConfidence = hasLowConfidenceAnomaly(evaluation);

    if (decision === "allow") {
      allowCount += 1;
    } else if (decision === "review") {
      reviewCount += 1;
    } else if (decision === "block") {
      blockCount += 1;
    }

    if (
      evaluation.risk_level === "high" &&
      evaluation.guardrail_result.final_mode === "normal"
    ) {
      underblockingCount += 1;
    }

    if (
      evaluation.risk_level === "low" &&
      evaluation.guardrail_result.final_mode === "blocked"
    ) {
      overblockingCount += 1;
    }

    if (lowConfidence) {
      lowConfidenceAnomalyCount += 1;
    }

    if (lowConfidence && decision === "allow") {
      lowConfidenceAllowCount += 1;
    }

    if (evaluation.threshold_adjusted === true) {
      thresholdAdjustedCount += 1;
    }

    if (evaluation.calibration_adjusted === true) {
      calibrationAdjustedCount += 1;
    }

    if (evaluation.deterministic_mode === true) {
      deterministicModeTrueCount += 1;
    }

    if (evaluation.scoring_input_source === "structured_only") {
      structuredScoringCount += 1;
    }

    if (evaluation.generation_variance_flag === true) {
      generationVarianceFlagCount += 1;
    }
  }

  return {
    run_label: params.runLabel,
    threshold_version: params.thresholdVersion,
    matched_seed_count: matchedLogs.length,
    missing_seed_ids: missingSeedIds,
    allow_count: allowCount,
    review_count: reviewCount,
    block_count: blockCount,
    allow_rate: safeRate(allowCount, total),
    review_rate: safeRate(reviewCount, total),
    block_rate: safeRate(blockCount, total),
    underblocking_count: underblockingCount,
    overblocking_count: overblockingCount,
    low_confidence_allow_count: lowConfidenceAllowCount,
    low_confidence_anomaly_count: lowConfidenceAnomalyCount,
    threshold_adjusted_count: thresholdAdjustedCount,
    calibration_adjusted_count: calibrationAdjustedCount,
    deterministic_mode_true_count: deterministicModeTrueCount,
    structured_scoring_count: structuredScoringCount,
    generation_variance_flag_count: generationVarianceFlagCount,
  };
}

function buildCaseComparisons(params: {
  seedCases: SeedCase[];
  baselineV7: Map<string, RequestLog>;
  baselineV8Run1: Map<string, RequestLog>;
  baselineV8Run2: Map<string, RequestLog>;
}): CaseComparison[] {
  return params.seedCases.map((seedCase) => {
    const baselineV7Log = params.baselineV7.get(seedCase.id) ?? null;
    const baselineV8Run1Log = params.baselineV8Run1.get(seedCase.id) ?? null;
    const baselineV8Run2Log = params.baselineV8Run2.get(seedCase.id) ?? null;
    const baselineV7Evaluation = baselineV7Log ? getEvaluation(baselineV7Log) : null;
    const baselineV8Run1Evaluation = baselineV8Run1Log
      ? getEvaluation(baselineV8Run1Log)
      : null;
    const baselineV8Run2Evaluation = baselineV8Run2Log
      ? getEvaluation(baselineV8Run2Log)
      : null;
    const run1Decision = baselineV8Run1Log ? getDecision(baselineV8Run1Log) : null;
    const run2Decision = baselineV8Run2Log ? getDecision(baselineV8Run2Log) : null;
    const confidenceDelta =
      baselineV8Run1Evaluation && baselineV8Run2Evaluation
        ? round(
            Math.abs(
              baselineV8Run2Evaluation.confidence_score -
                baselineV8Run1Evaluation.confidence_score,
            ),
          )
        : null;
    const uncertaintyDelta =
      baselineV8Run1Evaluation && baselineV8Run2Evaluation
        ? round(
            Math.abs(
              baselineV8Run2Evaluation.uncertainty_score -
                baselineV8Run1Evaluation.uncertainty_score,
            ),
          )
        : null;

    return {
      seed_id: seedCase.id,
      category: seedCase.category,
      baseline_v7_decision: baselineV7Log ? getDecision(baselineV7Log) : null,
      baseline_v8_run1_decision: run1Decision,
      baseline_v8_run2_decision: run2Decision,
      baseline_v7_confidence: baselineV7Evaluation?.confidence_score ?? null,
      baseline_v8_run1_confidence:
        baselineV8Run1Evaluation?.confidence_score ?? null,
      baseline_v8_run2_confidence:
        baselineV8Run2Evaluation?.confidence_score ?? null,
      baseline_v7_uncertainty: baselineV7Evaluation?.uncertainty_score ?? null,
      baseline_v8_run1_uncertainty:
        baselineV8Run1Evaluation?.uncertainty_score ?? null,
      baseline_v8_run2_uncertainty:
        baselineV8Run2Evaluation?.uncertainty_score ?? null,
      baseline_v8_run2_triggers: baselineV8Run2Evaluation?.detected_triggers ?? [],
      baseline_v8_run2_deterministic_mode:
        baselineV8Run2Evaluation?.deterministic_mode ?? null,
      baseline_v8_run2_scoring_input_source:
        baselineV8Run2Evaluation?.scoring_input_source ?? null,
      baseline_v8_run2_generation_variance_flag:
        baselineV8Run2Evaluation?.generation_variance_flag ?? null,
      recovered_to_allow: Boolean(
        baselineV7Log &&
          getDecision(baselineV7Log) === "review" &&
          run2Decision === "allow",
      ),
      became_block: Boolean(
        baselineV7Log &&
          getDecision(baselineV7Log) !== "block" &&
          run2Decision === "block",
      ),
      low_confidence_allow_in_v8:
        run2Decision === "allow" &&
        Boolean(
          baselineV8Run2Evaluation &&
            hasLowConfidenceAnomaly(baselineV8Run2Evaluation),
        ),
      decision_changed_between_runs:
        Boolean(run1Decision) &&
        Boolean(run2Decision) &&
        run1Decision !== run2Decision,
      confidence_delta_between_runs: confidenceDelta,
      uncertainty_delta_between_runs: uncertaintyDelta,
      confidence_stable: confidenceDelta === null || confidenceDelta < 0.1,
      uncertainty_stable: uncertaintyDelta === null || uncertaintyDelta < 0.1,
    };
  });
}

function buildMarkdown(report: ComparisonReport): string {
  const recoveredAllowIds =
    report.comparison.recovered_allow_seed_ids.length > 0
      ? report.comparison.recovered_allow_seed_ids.join(", ")
      : "none";
  const decisionChangedIds =
    report.comparison.decision_changed_seed_ids.length > 0
      ? report.comparison.decision_changed_seed_ids.join(", ")
      : "none";
  const confidenceExceededIds =
    report.comparison.confidence_delta_exceeded_seed_ids.length > 0
      ? report.comparison.confidence_delta_exceeded_seed_ids.join(", ")
      : "none";
  const uncertaintyExceededIds =
    report.comparison.uncertainty_delta_exceeded_seed_ids.length > 0
      ? report.comparison.uncertainty_delta_exceeded_seed_ids.join(", ")
      : "none";

  return [
    "# Baseline-v8 Analysis",
    "",
    "## Summary",
    `- generated_at: ${report.generated_at}`,
    `- seed_case_count: ${report.seed_case_count}`,
    `- baseline-v7 latest allow/review/block: ${report.baseline_v7_latest.allow_count}/${report.baseline_v7_latest.review_count}/${report.baseline_v7_latest.block_count}`,
    `- baseline-v8 run1 allow/review/block: ${report.baseline_v8_run1.allow_count}/${report.baseline_v8_run1.review_count}/${report.baseline_v8_run1.block_count}`,
    `- baseline-v8 run2 allow/review/block: ${report.baseline_v8_run2.allow_count}/${report.baseline_v8_run2.review_count}/${report.baseline_v8_run2.block_count}`,
    `- allow_count_delta_vs_v7: ${report.comparison.allow_count_delta_vs_v7}`,
    `- recovered_allow_seed_ids: ${recoveredAllowIds}`,
    "",
    "## Target Checks",
    `- run1 allow_count in target range 3~5: ${report.comparison.allow_count_target_met_run1}`,
    `- run2 allow_count in target range 3~5: ${report.comparison.allow_count_target_met_run2}`,
    `- underblocking stayed at 0: ${report.comparison.underblocking_zero_maintained}`,
    `- low_confidence_allow stayed at 0: ${report.comparison.low_confidence_allow_zero_maintained}`,
    `- decision consistency passed: ${report.comparison.decision_consistency_passed}`,
    `- score consistency passed: ${report.comparison.score_consistency_passed}`,
    "",
    "## Deterministic Logs",
    `- deterministic_mode_all_true: ${report.comparison.deterministic_mode_all_true}`,
    `- scoring_input_source_structured_only: ${report.comparison.scoring_input_source_structured_only}`,
    `- generation_variance_flag_zero: ${report.comparison.generation_variance_flag_zero}`,
    `- run1 deterministic_mode_true_count: ${report.baseline_v8_run1.deterministic_mode_true_count}/${report.seed_case_count}`,
    `- run2 deterministic_mode_true_count: ${report.baseline_v8_run2.deterministic_mode_true_count}/${report.seed_case_count}`,
    "",
    "## Consistency",
    `- decision_changed_seed_ids: ${decisionChangedIds}`,
    `- confidence_delta_exceeded_seed_ids: ${confidenceExceededIds}`,
    `- uncertainty_delta_exceeded_seed_ids: ${uncertaintyExceededIds}`,
    `- max_confidence_delta: ${report.comparison.max_confidence_delta}`,
    `- max_uncertainty_delta: ${report.comparison.max_uncertainty_delta}`,
    "",
    "## Spotlight",
    `- case-01: ${report.spotlight.case_01?.baseline_v8_run1_decision ?? "missing"} -> ${report.spotlight.case_01?.baseline_v8_run2_decision ?? "missing"}, confidence_delta ${report.spotlight.case_01?.confidence_delta_between_runs ?? "n/a"}`,
    `- case-04: ${report.spotlight.case_04?.baseline_v8_run1_decision ?? "missing"} -> ${report.spotlight.case_04?.baseline_v8_run2_decision ?? "missing"}, scoring_source ${report.spotlight.case_04?.baseline_v8_run2_scoring_input_source ?? "n/a"}`,
    `- case-14: ${report.spotlight.case_14?.baseline_v8_run1_decision ?? "missing"} -> ${report.spotlight.case_14?.baseline_v8_run2_decision ?? "missing"}, deterministic ${report.spotlight.case_14?.baseline_v8_run2_deterministic_mode ?? "n/a"}`,
    `- case-19: ${report.spotlight.case_19?.baseline_v8_run1_decision ?? "missing"} -> ${report.spotlight.case_19?.baseline_v8_run2_decision ?? "missing"}, uncertainty_delta ${report.spotlight.case_19?.uncertainty_delta_between_runs ?? "n/a"}`,
    "",
    "## Interpretation",
    "- baseline-v8 keeps the threshold policy intact and moves stability into upstream structured generation plus structured-only scoring inputs.",
    "- ambiguity_high now comes only from raw user input/context, while confidence and uncertainty use deterministic weighted sums over structured signals.",
    report.comparison.decision_consistency_passed &&
    report.comparison.score_consistency_passed &&
    report.comparison.deterministic_mode_all_true &&
    report.comparison.scoring_input_source_structured_only &&
    report.comparison.generation_variance_flag_zero
      ? "- Two-pass replay met the requested deterministic guardrail conditions."
      : "- The checks above still show instability or fallback scoring on the listed cases.",
    "",
  ].join("\n");
}

async function main() {
  const seedCases = await readSeedCases();
  const storedRequestLogs = await readJsonArtifacts<RequestLog>("request_logs");
  const requestLogs = storedRequestLogs.map((artifact) => artifact.value);
  const seedCaseIdByContext = getSeedCaseIdByContext(seedCases);
  const baselineV7LatestLogs = pickLatestLogsBySeed(
    requestLogs,
    "guardrail-threshold-set:baseline-v7",
    seedCaseIdByContext,
    1,
  );
  const baselineV8LatestLogs = pickLatestLogsBySeed(
    requestLogs,
    "guardrail-threshold-set:baseline-v8",
    seedCaseIdByContext,
    2,
  );
  const baselineV7Latest = new Map<string, RequestLog>();
  const baselineV8Run1 = new Map<string, RequestLog>();
  const baselineV8Run2 = new Map<string, RequestLog>();

  for (const [seedId, logs] of baselineV7LatestLogs.entries()) {
    if (logs[0]) {
      baselineV7Latest.set(seedId, logs[0]);
    }
  }

  for (const [seedId, logs] of baselineV8LatestLogs.entries()) {
    if (logs[0]) {
      baselineV8Run2.set(seedId, logs[0]);
    }

    if (logs[1]) {
      baselineV8Run1.set(seedId, logs[1]);
    }
  }

  const baselineV7LatestSummary = summarizeFromMap({
    runLabel: "latest",
    thresholdVersion: "guardrail-threshold-set:baseline-v7",
    seedCases,
    latestBySeed: baselineV7Latest,
  });
  const baselineV8Run1Summary = summarizeFromMap({
    runLabel: "run1",
    thresholdVersion: "guardrail-threshold-set:baseline-v8",
    seedCases,
    latestBySeed: baselineV8Run1,
  });
  const baselineV8Run2Summary = summarizeFromMap({
    runLabel: "run2",
    thresholdVersion: "guardrail-threshold-set:baseline-v8",
    seedCases,
    latestBySeed: baselineV8Run2,
  });

  const cases = buildCaseComparisons({
    seedCases,
    baselineV7: baselineV7Latest,
    baselineV8Run1,
    baselineV8Run2,
  });
  const recoveredAllowSeedIds = cases
    .filter((item) => item.recovered_to_allow)
    .map((item) => item.seed_id);
  const newlyBlockedSeedIds = cases
    .filter((item) => item.became_block)
    .map((item) => item.seed_id);
  const decisionChangedSeedIds = cases
    .filter((item) => item.decision_changed_between_runs)
    .map((item) => item.seed_id);
  const confidenceDeltaExceededSeedIds = cases
    .filter((item) => item.confidence_stable === false)
    .map((item) => item.seed_id);
  const uncertaintyDeltaExceededSeedIds = cases
    .filter((item) => item.uncertainty_stable === false)
    .map((item) => item.seed_id);
  const maxConfidenceDelta = round(
    Math.max(
      0,
      ...cases.map((item) => item.confidence_delta_between_runs ?? 0),
    ),
  );
  const maxUncertaintyDelta = round(
    Math.max(
      0,
      ...cases.map((item) => item.uncertainty_delta_between_runs ?? 0),
    ),
  );

  const report: ComparisonReport = {
    generated_at: new Date().toISOString(),
    seed_case_count: seedCases.length,
    baseline_v7_latest: baselineV7LatestSummary,
    baseline_v8_run1: baselineV8Run1Summary,
    baseline_v8_run2: baselineV8Run2Summary,
    comparison: {
      allow_count_delta_vs_v7:
        baselineV8Run2Summary.allow_count - baselineV7LatestSummary.allow_count,
      review_count_delta_vs_v7:
        baselineV8Run2Summary.review_count - baselineV7LatestSummary.review_count,
      block_count_delta_vs_v7:
        baselineV8Run2Summary.block_count - baselineV7LatestSummary.block_count,
      recovered_allow_seed_ids: recoveredAllowSeedIds,
      newly_blocked_seed_ids: newlyBlockedSeedIds,
      allow_count_target_met_run1:
        baselineV8Run1Summary.allow_count >= 3 &&
        baselineV8Run1Summary.allow_count <= 5,
      allow_count_target_met_run2:
        baselineV8Run2Summary.allow_count >= 3 &&
        baselineV8Run2Summary.allow_count <= 5,
      underblocking_zero_maintained:
        baselineV8Run1Summary.underblocking_count === 0 &&
        baselineV8Run2Summary.underblocking_count === 0,
      low_confidence_allow_zero_maintained:
        baselineV8Run1Summary.low_confidence_allow_count === 0 &&
        baselineV8Run2Summary.low_confidence_allow_count === 0,
      decision_changed_seed_ids: decisionChangedSeedIds,
      confidence_delta_exceeded_seed_ids: confidenceDeltaExceededSeedIds,
      uncertainty_delta_exceeded_seed_ids: uncertaintyDeltaExceededSeedIds,
      max_confidence_delta: maxConfidenceDelta,
      max_uncertainty_delta: maxUncertaintyDelta,
      decision_consistency_passed: decisionChangedSeedIds.length === 0,
      score_consistency_passed:
        confidenceDeltaExceededSeedIds.length === 0 &&
        uncertaintyDeltaExceededSeedIds.length === 0,
      deterministic_mode_all_true:
        baselineV8Run1Summary.deterministic_mode_true_count === seedCases.length &&
        baselineV8Run2Summary.deterministic_mode_true_count === seedCases.length,
      scoring_input_source_structured_only:
        baselineV8Run1Summary.structured_scoring_count === seedCases.length &&
        baselineV8Run2Summary.structured_scoring_count === seedCases.length,
      generation_variance_flag_zero:
        baselineV8Run1Summary.generation_variance_flag_count === 0 &&
        baselineV8Run2Summary.generation_variance_flag_count === 0,
    },
    spotlight: {
      case_01: cases.find((item) => item.seed_id === "case-01") ?? null,
      case_04: cases.find((item) => item.seed_id === "case-04") ?? null,
      case_14: cases.find((item) => item.seed_id === "case-14") ?? null,
      case_19: cases.find((item) => item.seed_id === "case-19") ?? null,
    },
    cases,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(OUTPUT_MD_PATH, `${buildMarkdown(report)}\n`, "utf8");

  console.log(
    `[analyze-baseline-v8] baseline-v7 allow=${report.baseline_v7_latest.allow_count} review=${report.baseline_v7_latest.review_count} block=${report.baseline_v7_latest.block_count}`,
  );
  console.log(
    `[analyze-baseline-v8] baseline-v8 run1 allow=${report.baseline_v8_run1.allow_count} review=${report.baseline_v8_run1.review_count} block=${report.baseline_v8_run1.block_count}`,
  );
  console.log(
    `[analyze-baseline-v8] baseline-v8 run2 allow=${report.baseline_v8_run2.allow_count} review=${report.baseline_v8_run2.review_count} block=${report.baseline_v8_run2.block_count}`,
  );
  console.log(
    `[analyze-baseline-v8] decision_changes=${report.comparison.decision_changed_seed_ids.join(",") || "none"} max_conf_delta=${report.comparison.max_confidence_delta} max_unc_delta=${report.comparison.max_uncertainty_delta}`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[analyze-baseline-v8] fatal: ${message}`);
  process.exitCode = 1;
});
