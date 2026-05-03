import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { readJsonArtifacts } from "../src/lib/logger/logStore.ts";
import type { AnomalyFlags, RequestLog } from "../src/lib/types.ts";

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
  | "guardrail-threshold-set:baseline-v6"
  | "guardrail-threshold-set:baseline-v7";

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
};

type SafeBandTier = "strict" | "relaxed" | "none";

type CaseComparison = {
  seed_id: string;
  category: string;
  baseline_v6_decision: string | null;
  baseline_v7_run1_decision: string | null;
  baseline_v7_run2_decision: string | null;
  baseline_v6_confidence: number | null;
  baseline_v7_run1_confidence: number | null;
  baseline_v7_run2_confidence: number | null;
  baseline_v6_uncertainty: number | null;
  baseline_v7_run1_uncertainty: number | null;
  baseline_v7_run2_uncertainty: number | null;
  baseline_v7_run2_triggers: string[];
  baseline_v7_run2_safe_band_tier: SafeBandTier;
  recovered_to_allow: boolean;
  became_block: boolean;
  low_confidence_allow_in_v7: boolean;
  decision_changed_between_runs: boolean;
  confidence_delta_between_runs: number | null;
  uncertainty_delta_between_runs: number | null;
  confidence_stable: boolean;
  uncertainty_stable: boolean;
};

type ComparisonReport = {
  generated_at: string;
  seed_case_count: number;
  baseline_v6_latest: VersionSummary;
  baseline_v7_run1: VersionSummary;
  baseline_v7_run2: VersionSummary;
  comparison: {
    allow_count_delta_vs_v6: number;
    review_count_delta_vs_v6: number;
    block_count_delta_vs_v6: number;
    recovered_allow_seed_ids: string[];
    newly_blocked_seed_ids: string[];
    strict_safe_band_allow_count: number;
    relaxed_safe_band_allow_count: number;
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
  };
  spotlight: {
    case_01: CaseComparison | null;
    case_14: CaseComparison | null;
    case_15: CaseComparison | null;
    case_19: CaseComparison | null;
  };
  cases: CaseComparison[];
};

const OUTPUT_DIR = path.join(process.cwd(), "outputs", "monitoring");
const OUTPUT_JSON_PATH = path.join(OUTPUT_DIR, "baseline-v7-comparison.json");
const OUTPUT_MD_PATH = path.join(OUTPUT_DIR, "baseline-v7-analysis.md");
const SEED_INPUT_PATH = path.join(process.cwd(), "scripts", "seed-inputs.json");
const STRICT_CONFIDENCE_MIN = 0.65;
const STRICT_UNCERTAINTY_MAX = 0.45;
const RELAXED_CONFIDENCE_MIN = 0.6;
const RELAXED_UNCERTAINTY_MAX = 0.55;

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

  for (const requestLog of matchedLogs) {
    const decision = requestLog.guardrail.guardrail_derived.decision;
    const unionFlags = mergeFlags(
      requestLog.guardrail.guardrail_derived.anomaly.anomaly_raw_based,
      requestLog.guardrail.guardrail_derived.anomaly.anomaly_derived_based,
    );

    if (decision === "allow") {
      allowCount += 1;
    } else if (decision === "review") {
      reviewCount += 1;
    } else if (decision === "block") {
      blockCount += 1;
    }

    if (unionFlags.underblocking) {
      underblockingCount += 1;
    }

    if (unionFlags.overblocking) {
      overblockingCount += 1;
    }

    if (unionFlags.low_confidence) {
      lowConfidenceAnomalyCount += 1;
    }

    if (unionFlags.low_confidence && decision === "allow") {
      lowConfidenceAllowCount += 1;
    }

    if (requestLog.guardrail.guardrail_raw.threshold_adjusted === true) {
      thresholdAdjustedCount += 1;
    }

    if (requestLog.guardrail.guardrail_raw.calibration_adjusted === true) {
      calibrationAdjustedCount += 1;
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
  };
}

function inferSafeBandTier(requestLog: RequestLog | null): SafeBandTier {
  if (!requestLog || requestLog.guardrail.guardrail_derived.decision !== "allow") {
    return "none";
  }

  const raw = requestLog.guardrail.guardrail_raw;
  const hasHighRisk = raw.detected_triggers.includes("high_risk");
  const hasLowConfidence = raw.detected_triggers.includes("low_confidence");

  if (hasHighRisk || hasLowConfidence) {
    return "none";
  }

  if (
    raw.confidence_score >= STRICT_CONFIDENCE_MIN &&
    raw.uncertainty_score <= STRICT_UNCERTAINTY_MAX
  ) {
    return "strict";
  }

  if (
    raw.confidence_score >= RELAXED_CONFIDENCE_MIN &&
    raw.uncertainty_score <= RELAXED_UNCERTAINTY_MAX
  ) {
    return "relaxed";
  }

  return "none";
}

function buildCaseComparisons(params: {
  seedCases: SeedCase[];
  baselineV6: Map<string, RequestLog>;
  baselineV7Run1: Map<string, RequestLog>;
  baselineV7Run2: Map<string, RequestLog>;
}): CaseComparison[] {
  return params.seedCases.map((seedCase) => {
    const baselineV6Log = params.baselineV6.get(seedCase.id) ?? null;
    const baselineV7Run1Log = params.baselineV7Run1.get(seedCase.id) ?? null;
    const baselineV7Run2Log = params.baselineV7Run2.get(seedCase.id) ?? null;
    const run1Decision =
      baselineV7Run1Log?.guardrail.guardrail_derived.decision ?? null;
    const run2Decision =
      baselineV7Run2Log?.guardrail.guardrail_derived.decision ?? null;
    const baselineV7UnionFlags = baselineV7Run2Log
      ? mergeFlags(
          baselineV7Run2Log.guardrail.guardrail_derived.anomaly.anomaly_raw_based,
          baselineV7Run2Log.guardrail.guardrail_derived.anomaly.anomaly_derived_based,
        )
      : null;
    const confidenceDelta =
      baselineV7Run1Log && baselineV7Run2Log
        ? round(
            Math.abs(
              baselineV7Run2Log.guardrail.guardrail_raw.confidence_score -
                baselineV7Run1Log.guardrail.guardrail_raw.confidence_score,
            ),
          )
        : null;
    const uncertaintyDelta =
      baselineV7Run1Log && baselineV7Run2Log
        ? round(
            Math.abs(
              baselineV7Run2Log.guardrail.guardrail_raw.uncertainty_score -
                baselineV7Run1Log.guardrail.guardrail_raw.uncertainty_score,
            ),
          )
        : null;

    return {
      seed_id: seedCase.id,
      category: seedCase.category,
      baseline_v6_decision:
        baselineV6Log?.guardrail.guardrail_derived.decision ?? null,
      baseline_v7_run1_decision: run1Decision,
      baseline_v7_run2_decision: run2Decision,
      baseline_v6_confidence:
        baselineV6Log?.guardrail.guardrail_raw.confidence_score ?? null,
      baseline_v7_run1_confidence:
        baselineV7Run1Log?.guardrail.guardrail_raw.confidence_score ?? null,
      baseline_v7_run2_confidence:
        baselineV7Run2Log?.guardrail.guardrail_raw.confidence_score ?? null,
      baseline_v6_uncertainty:
        baselineV6Log?.guardrail.guardrail_raw.uncertainty_score ?? null,
      baseline_v7_run1_uncertainty:
        baselineV7Run1Log?.guardrail.guardrail_raw.uncertainty_score ?? null,
      baseline_v7_run2_uncertainty:
        baselineV7Run2Log?.guardrail.guardrail_raw.uncertainty_score ?? null,
      baseline_v7_run2_triggers:
        baselineV7Run2Log?.guardrail.guardrail_raw.detected_triggers ?? [],
      baseline_v7_run2_safe_band_tier: inferSafeBandTier(baselineV7Run2Log),
      recovered_to_allow:
        baselineV6Log?.guardrail.guardrail_derived.decision === "review" &&
        run2Decision === "allow",
      became_block:
        baselineV6Log?.guardrail.guardrail_derived.decision !== "block" &&
        run2Decision === "block",
      low_confidence_allow_in_v7:
        run2Decision === "allow" && Boolean(baselineV7UnionFlags?.low_confidence),
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
    "# Baseline-v7 Analysis",
    "",
    "## Summary",
    `- generated_at: ${report.generated_at}`,
    `- seed_case_count: ${report.seed_case_count}`,
    `- baseline-v6 latest allow/review/block: ${report.baseline_v6_latest.allow_count}/${report.baseline_v6_latest.review_count}/${report.baseline_v6_latest.block_count}`,
    `- baseline-v7 run1 allow/review/block: ${report.baseline_v7_run1.allow_count}/${report.baseline_v7_run1.review_count}/${report.baseline_v7_run1.block_count}`,
    `- baseline-v7 run2 allow/review/block: ${report.baseline_v7_run2.allow_count}/${report.baseline_v7_run2.review_count}/${report.baseline_v7_run2.block_count}`,
    `- allow_count_delta_vs_v6: ${report.comparison.allow_count_delta_vs_v6}`,
    `- strict_safe_band_allow_count: ${report.comparison.strict_safe_band_allow_count}`,
    `- relaxed_safe_band_allow_count: ${report.comparison.relaxed_safe_band_allow_count}`,
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
    "## Consistency",
    `- decision_changed_seed_ids: ${decisionChangedIds}`,
    `- confidence_delta_exceeded_seed_ids: ${confidenceExceededIds}`,
    `- uncertainty_delta_exceeded_seed_ids: ${uncertaintyExceededIds}`,
    `- max_confidence_delta: ${report.comparison.max_confidence_delta}`,
    `- max_uncertainty_delta: ${report.comparison.max_uncertainty_delta}`,
    "",
    "## Spotlight",
    `- case-01: ${report.spotlight.case_01?.baseline_v7_run1_decision ?? "missing"} -> ${report.spotlight.case_01?.baseline_v7_run2_decision ?? "missing"}, confidence_delta ${report.spotlight.case_01?.confidence_delta_between_runs ?? "n/a"}`,
    `- case-14: ${report.spotlight.case_14?.baseline_v7_run1_decision ?? "missing"} -> ${report.spotlight.case_14?.baseline_v7_run2_decision ?? "missing"}, tier ${report.spotlight.case_14?.baseline_v7_run2_safe_band_tier ?? "none"}`,
    `- case-15: ${report.spotlight.case_15?.baseline_v7_run1_decision ?? "missing"} -> ${report.spotlight.case_15?.baseline_v7_run2_decision ?? "missing"}, tier ${report.spotlight.case_15?.baseline_v7_run2_safe_band_tier ?? "none"}`,
    `- case-19: ${report.spotlight.case_19?.baseline_v7_run1_decision ?? "missing"} -> ${report.spotlight.case_19?.baseline_v7_run2_decision ?? "missing"}, uncertainty_delta ${report.spotlight.case_19?.uncertainty_delta_between_runs ?? "n/a"}`,
    "",
    "## Interpretation",
    "- baseline-v7 shifts the work from threshold tuning to score stabilization by narrowing confidence and uncertainty volatility.",
    "- low_confidence is treated as an allow-stop rule ahead of safe band evaluation, so score stabilization only helps cases that stay above that protection line.",
    report.comparison.decision_consistency_passed &&
    report.comparison.score_consistency_passed
      ? "- Two-pass replay stayed within the requested decision and score consistency limits."
      : "- Two-pass replay still shows instability on the seed ids listed above.",
    "",
  ].join("\n");
}

async function main() {
  const seedCases = await readSeedCases();
  const storedRequestLogs = await readJsonArtifacts<RequestLog>("request_logs");
  const requestLogs = storedRequestLogs.map((artifact) => artifact.value);
  const seedCaseIdByContext = getSeedCaseIdByContext(seedCases);
  const baselineV6LatestLogs = pickLatestLogsBySeed(
    requestLogs,
    "guardrail-threshold-set:baseline-v6",
    seedCaseIdByContext,
    1,
  );
  const baselineV7LatestLogs = pickLatestLogsBySeed(
    requestLogs,
    "guardrail-threshold-set:baseline-v7",
    seedCaseIdByContext,
    2,
  );
  const baselineV6Latest = new Map<string, RequestLog>();
  const baselineV7Run1 = new Map<string, RequestLog>();
  const baselineV7Run2 = new Map<string, RequestLog>();

  for (const [seedId, logs] of baselineV6LatestLogs.entries()) {
    if (logs[0]) {
      baselineV6Latest.set(seedId, logs[0]);
    }
  }

  for (const [seedId, logs] of baselineV7LatestLogs.entries()) {
    if (logs[0]) {
      baselineV7Run2.set(seedId, logs[0]);
    }

    if (logs[1]) {
      baselineV7Run1.set(seedId, logs[1]);
    }
  }

  const baselineV6LatestSummary = summarizeFromMap({
    runLabel: "latest",
    thresholdVersion: "guardrail-threshold-set:baseline-v6",
    seedCases,
    latestBySeed: baselineV6Latest,
  });
  const baselineV7Run1Summary = summarizeFromMap({
    runLabel: "run1",
    thresholdVersion: "guardrail-threshold-set:baseline-v7",
    seedCases,
    latestBySeed: baselineV7Run1,
  });
  const baselineV7Run2Summary = summarizeFromMap({
    runLabel: "run2",
    thresholdVersion: "guardrail-threshold-set:baseline-v7",
    seedCases,
    latestBySeed: baselineV7Run2,
  });

  const cases = buildCaseComparisons({
    seedCases,
    baselineV6: baselineV6Latest,
    baselineV7Run1,
    baselineV7Run2,
  });
  const recoveredAllowSeedIds = cases
    .filter((item) => item.recovered_to_allow)
    .map((item) => item.seed_id);
  const newlyBlockedSeedIds = cases
    .filter((item) => item.became_block)
    .map((item) => item.seed_id);
  const strictSafeBandAllowCount = cases.filter(
    (item) => item.baseline_v7_run2_safe_band_tier === "strict",
  ).length;
  const relaxedSafeBandAllowCount = cases.filter(
    (item) => item.baseline_v7_run2_safe_band_tier === "relaxed",
  ).length;
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
    baseline_v6_latest: baselineV6LatestSummary,
    baseline_v7_run1: baselineV7Run1Summary,
    baseline_v7_run2: baselineV7Run2Summary,
    comparison: {
      allow_count_delta_vs_v6:
        baselineV7Run2Summary.allow_count - baselineV6LatestSummary.allow_count,
      review_count_delta_vs_v6:
        baselineV7Run2Summary.review_count - baselineV6LatestSummary.review_count,
      block_count_delta_vs_v6:
        baselineV7Run2Summary.block_count - baselineV6LatestSummary.block_count,
      recovered_allow_seed_ids: recoveredAllowSeedIds,
      newly_blocked_seed_ids: newlyBlockedSeedIds,
      strict_safe_band_allow_count: strictSafeBandAllowCount,
      relaxed_safe_band_allow_count: relaxedSafeBandAllowCount,
      allow_count_target_met_run1:
        baselineV7Run1Summary.allow_count >= 3 &&
        baselineV7Run1Summary.allow_count <= 5,
      allow_count_target_met_run2:
        baselineV7Run2Summary.allow_count >= 3 &&
        baselineV7Run2Summary.allow_count <= 5,
      underblocking_zero_maintained:
        baselineV7Run1Summary.underblocking_count === 0 &&
        baselineV7Run2Summary.underblocking_count === 0,
      low_confidence_allow_zero_maintained:
        baselineV7Run1Summary.low_confidence_allow_count === 0 &&
        baselineV7Run2Summary.low_confidence_allow_count === 0,
      decision_changed_seed_ids: decisionChangedSeedIds,
      confidence_delta_exceeded_seed_ids: confidenceDeltaExceededSeedIds,
      uncertainty_delta_exceeded_seed_ids: uncertaintyDeltaExceededSeedIds,
      max_confidence_delta: maxConfidenceDelta,
      max_uncertainty_delta: maxUncertaintyDelta,
      decision_consistency_passed: decisionChangedSeedIds.length === 0,
      score_consistency_passed:
        confidenceDeltaExceededSeedIds.length === 0 &&
        uncertaintyDeltaExceededSeedIds.length === 0,
    },
    spotlight: {
      case_01: cases.find((item) => item.seed_id === "case-01") ?? null,
      case_14: cases.find((item) => item.seed_id === "case-14") ?? null,
      case_15: cases.find((item) => item.seed_id === "case-15") ?? null,
      case_19: cases.find((item) => item.seed_id === "case-19") ?? null,
    },
    cases,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(OUTPUT_MD_PATH, `${buildMarkdown(report)}\n`, "utf8");

  console.log(
    `[analyze-baseline-v7] baseline-v6 allow=${report.baseline_v6_latest.allow_count} review=${report.baseline_v6_latest.review_count} block=${report.baseline_v6_latest.block_count}`,
  );
  console.log(
    `[analyze-baseline-v7] baseline-v7 run1 allow=${report.baseline_v7_run1.allow_count} review=${report.baseline_v7_run1.review_count} block=${report.baseline_v7_run1.block_count}`,
  );
  console.log(
    `[analyze-baseline-v7] baseline-v7 run2 allow=${report.baseline_v7_run2.allow_count} review=${report.baseline_v7_run2.review_count} block=${report.baseline_v7_run2.block_count}`,
  );
  console.log(
    `[analyze-baseline-v7] decision_changes=${report.comparison.decision_changed_seed_ids.join(",") || "none"} max_conf_delta=${report.comparison.max_confidence_delta} max_unc_delta=${report.comparison.max_uncertainty_delta}`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[analyze-baseline-v7] fatal: ${message}`);
  process.exitCode = 1;
});
