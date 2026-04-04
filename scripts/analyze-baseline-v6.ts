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
  | "guardrail-threshold-set:baseline-v5"
  | "guardrail-threshold-set:baseline-v6";

type VersionSummary = {
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
  baseline_v5_decision: string | null;
  baseline_v6_decision: string | null;
  baseline_v5_confidence: number | null;
  baseline_v6_confidence: number | null;
  baseline_v5_uncertainty: number | null;
  baseline_v6_uncertainty: number | null;
  baseline_v5_triggers: string[];
  baseline_v6_triggers: string[];
  baseline_v6_safe_band_tier: SafeBandTier;
  recovered_to_allow: boolean;
  became_block: boolean;
  low_confidence_allow_in_v6: boolean;
};

type ComparisonReport = {
  generated_at: string;
  seed_case_count: number;
  baseline_v5: VersionSummary;
  baseline_v6: VersionSummary;
  comparison: {
    allow_count_delta: number;
    review_count_delta: number;
    block_count_delta: number;
    allow_rate_delta: number;
    review_rate_delta: number;
    block_rate_delta: number;
    underblocking_count_delta: number;
    overblocking_count_delta: number;
    low_confidence_allow_count_delta: number;
    review_rate_reduced: boolean;
    underblocking_zero_maintained: boolean;
    low_confidence_allow_zero_maintained: boolean;
    recovered_allow_seed_ids: string[];
    newly_blocked_seed_ids: string[];
    strict_safe_band_allow_count: number;
    relaxed_safe_band_allow_count: number;
  };
  spotlight: {
    case_03: CaseComparison | null;
    case_04: CaseComparison | null;
    case_12: CaseComparison | null;
    case_15: CaseComparison | null;
  };
  cases: CaseComparison[];
};

const OUTPUT_DIR = path.join(process.cwd(), "outputs", "monitoring");
const OUTPUT_JSON_PATH = path.join(OUTPUT_DIR, "baseline-v6-comparison.json");
const OUTPUT_MD_PATH = path.join(OUTPUT_DIR, "baseline-v6-analysis.md");
const SEED_INPUT_PATH = path.join(process.cwd(), "scripts", "seed-inputs.json");
const TARGET_VERSIONS: VersionKey[] = [
  "guardrail-threshold-set:baseline-v5",
  "guardrail-threshold-set:baseline-v6",
] as const;
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

function pickLatestBySeed(
  requestLogs: RequestLog[],
  thresholdVersion: VersionKey,
  seedCaseIdByContext: Map<string, string>,
): Map<string, RequestLog> {
  const latestBySeed = new Map<string, RequestLog>();

  for (const requestLog of requestLogs) {
    if (requestLog.versions.threshold_version !== thresholdVersion) {
      continue;
    }

    const seedId = seedCaseIdByContext.get(requestLog.input.user_query);
    if (!seedId) {
      continue;
    }

    const previous = latestBySeed.get(seedId);

    if (!previous || previous.timestamp < requestLog.timestamp) {
      latestBySeed.set(seedId, requestLog);
    }
  }

  return latestBySeed;
}

function summarizeVersion(params: {
  thresholdVersion: VersionKey;
  seedCases: SeedCase[];
  requestLogs: RequestLog[];
}): {
  summary: VersionSummary;
  latestBySeed: Map<string, RequestLog>;
} {
  const seedCaseIdByContext = getSeedCaseIdByContext(params.seedCases);
  const latestBySeed = pickLatestBySeed(
    params.requestLogs,
    params.thresholdVersion,
    seedCaseIdByContext,
  );
  const matchedLogs = params.seedCases
    .map((seedCase) => latestBySeed.get(seedCase.id))
    .filter((value): value is RequestLog => Boolean(value));
  const total = params.seedCases.length;
  const missingSeedIds = params.seedCases
    .map((seedCase) => seedCase.id)
    .filter((seedId) => !latestBySeed.has(seedId));
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
    summary: {
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
    },
    latestBySeed,
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
  baselineV5: Map<string, RequestLog>;
  baselineV6: Map<string, RequestLog>;
}): CaseComparison[] {
  return params.seedCases.map((seedCase) => {
    const baselineV5Log = params.baselineV5.get(seedCase.id) ?? null;
    const baselineV6Log = params.baselineV6.get(seedCase.id) ?? null;
    const baselineV5Decision = baselineV5Log?.guardrail.guardrail_derived.decision ?? null;
    const baselineV6Decision = baselineV6Log?.guardrail.guardrail_derived.decision ?? null;
    const baselineV6UnionFlags = baselineV6Log
      ? mergeFlags(
          baselineV6Log.guardrail.guardrail_derived.anomaly.anomaly_raw_based,
          baselineV6Log.guardrail.guardrail_derived.anomaly.anomaly_derived_based,
        )
      : null;

    return {
      seed_id: seedCase.id,
      category: seedCase.category,
      baseline_v5_decision: baselineV5Decision,
      baseline_v6_decision: baselineV6Decision,
      baseline_v5_confidence:
        baselineV5Log?.guardrail.guardrail_raw.confidence_score ?? null,
      baseline_v6_confidence:
        baselineV6Log?.guardrail.guardrail_raw.confidence_score ?? null,
      baseline_v5_uncertainty:
        baselineV5Log?.guardrail.guardrail_raw.uncertainty_score ?? null,
      baseline_v6_uncertainty:
        baselineV6Log?.guardrail.guardrail_raw.uncertainty_score ?? null,
      baseline_v5_triggers:
        baselineV5Log?.guardrail.guardrail_raw.detected_triggers ?? [],
      baseline_v6_triggers:
        baselineV6Log?.guardrail.guardrail_raw.detected_triggers ?? [],
      baseline_v6_safe_band_tier: inferSafeBandTier(baselineV6Log),
      recovered_to_allow:
        baselineV5Decision === "review" && baselineV6Decision === "allow",
      became_block:
        baselineV5Decision !== "block" && baselineV6Decision === "block",
      low_confidence_allow_in_v6:
        baselineV6Decision === "allow" &&
        Boolean(baselineV6UnionFlags?.low_confidence),
    };
  });
}

function buildMarkdown(report: ComparisonReport): string {
  const recoveredAllowIds =
    report.comparison.recovered_allow_seed_ids.length > 0
      ? report.comparison.recovered_allow_seed_ids.join(", ")
      : "none";
  const newlyBlockedIds =
    report.comparison.newly_blocked_seed_ids.length > 0
      ? report.comparison.newly_blocked_seed_ids.join(", ")
      : "none";

  return [
    "# Baseline-v6 Analysis",
    "",
    "## Summary",
    `- generated_at: ${report.generated_at}`,
    `- seed_case_count: ${report.seed_case_count}`,
    `- baseline-v5 allow/review/block: ${report.baseline_v5.allow_count}/${report.baseline_v5.review_count}/${report.baseline_v5.block_count}`,
    `- baseline-v6 allow/review/block: ${report.baseline_v6.allow_count}/${report.baseline_v6.review_count}/${report.baseline_v6.block_count}`,
    `- allow_count_delta: ${report.comparison.allow_count_delta}`,
    `- review_rate_delta: ${report.comparison.review_rate_delta}`,
    `- strict_safe_band_allow_count: ${report.comparison.strict_safe_band_allow_count}`,
    `- relaxed_safe_band_allow_count: ${report.comparison.relaxed_safe_band_allow_count}`,
    `- underblocking_zero_maintained: ${report.comparison.underblocking_zero_maintained}`,
    `- low_confidence_allow_zero_maintained: ${report.comparison.low_confidence_allow_zero_maintained}`,
    `- recovered_allow_seed_ids: ${recoveredAllowIds}`,
    `- newly_blocked_seed_ids: ${newlyBlockedIds}`,
    "",
    "## Target Checks",
    `- allow_count in target range 5~7: ${
      report.baseline_v6.allow_count >= 5 && report.baseline_v6.allow_count <= 7
    }`,
    `- review_rate reduced: ${report.comparison.review_rate_reduced}`,
    `- underblocking stayed at 0: ${report.comparison.underblocking_zero_maintained}`,
    `- low_confidence_allow stayed at 0: ${report.comparison.low_confidence_allow_zero_maintained}`,
    "",
    "## Spotlight",
    `- case-03: ${report.spotlight.case_03?.baseline_v5_decision ?? "missing"} -> ${report.spotlight.case_03?.baseline_v6_decision ?? "missing"}, tier ${report.spotlight.case_03?.baseline_v6_safe_band_tier ?? "none"}`,
    `- case-04: ${report.spotlight.case_04?.baseline_v5_decision ?? "missing"} -> ${report.spotlight.case_04?.baseline_v6_decision ?? "missing"}, tier ${report.spotlight.case_04?.baseline_v6_safe_band_tier ?? "none"}`,
    `- case-12: ${report.spotlight.case_12?.baseline_v5_decision ?? "missing"} -> ${report.spotlight.case_12?.baseline_v6_decision ?? "missing"}, tier ${report.spotlight.case_12?.baseline_v6_safe_band_tier ?? "none"}`,
    `- case-15: ${report.spotlight.case_15?.baseline_v5_decision ?? "missing"} -> ${report.spotlight.case_15?.baseline_v6_decision ?? "missing"}, triggers ${report.spotlight.case_15?.baseline_v6_triggers.join(", ") || "none"}`,
    "",
    "## Interpretation",
    "- baseline-v6 expands allow recovery into strict and relaxed safe bands, but only after excluding high_risk and low_confidence cases.",
    "- strict safe band should preserve case-01/case-04 style allows, while relaxed safe band should recover medium-risk ambiguity/conflict reviews that are still above the no-allow floor.",
    report.spotlight.case_15?.baseline_v6_decision === "review"
      ? `- case-15 stayed in review because ${report.spotlight.case_15.baseline_v6_triggers.join(", ")} remained active.`
      : "- case-15 recovered out of review in the fresh baseline-v6 run.",
    "",
  ].join("\n");
}

async function main() {
  const seedCases = await readSeedCases();
  const storedRequestLogs = await readJsonArtifacts<RequestLog>("request_logs");
  const requestLogs = storedRequestLogs.map((artifact) => artifact.value);
  const summaries = new Map<
    VersionKey,
    {
      summary: VersionSummary;
      latestBySeed: Map<string, RequestLog>;
    }
  >();

  for (const thresholdVersion of TARGET_VERSIONS) {
    summaries.set(
      thresholdVersion,
      summarizeVersion({
        thresholdVersion,
        seedCases,
        requestLogs,
      }),
    );
  }

  const baselineV5Summary = summaries.get(
    "guardrail-threshold-set:baseline-v5",
  );
  const baselineV6Summary = summaries.get(
    "guardrail-threshold-set:baseline-v6",
  );

  if (!baselineV5Summary || !baselineV6Summary) {
    throw new Error("baseline-v5 or baseline-v6 summary could not be built.");
  }

  const cases = buildCaseComparisons({
    seedCases,
    baselineV5: baselineV5Summary.latestBySeed,
    baselineV6: baselineV6Summary.latestBySeed,
  });
  const recoveredAllowSeedIds = cases
    .filter((item) => item.recovered_to_allow)
    .map((item) => item.seed_id);
  const newlyBlockedSeedIds = cases
    .filter((item) => item.became_block)
    .map((item) => item.seed_id);
  const strictSafeBandAllowCount = cases.filter(
    (item) => item.baseline_v6_safe_band_tier === "strict",
  ).length;
  const relaxedSafeBandAllowCount = cases.filter(
    (item) => item.baseline_v6_safe_band_tier === "relaxed",
  ).length;

  const report: ComparisonReport = {
    generated_at: new Date().toISOString(),
    seed_case_count: seedCases.length,
    baseline_v5: baselineV5Summary.summary,
    baseline_v6: baselineV6Summary.summary,
    comparison: {
      allow_count_delta:
        baselineV6Summary.summary.allow_count -
        baselineV5Summary.summary.allow_count,
      review_count_delta:
        baselineV6Summary.summary.review_count -
        baselineV5Summary.summary.review_count,
      block_count_delta:
        baselineV6Summary.summary.block_count -
        baselineV5Summary.summary.block_count,
      allow_rate_delta: round(
        baselineV6Summary.summary.allow_rate - baselineV5Summary.summary.allow_rate,
      ),
      review_rate_delta: round(
        baselineV6Summary.summary.review_rate -
          baselineV5Summary.summary.review_rate,
      ),
      block_rate_delta: round(
        baselineV6Summary.summary.block_rate - baselineV5Summary.summary.block_rate,
      ),
      underblocking_count_delta:
        baselineV6Summary.summary.underblocking_count -
        baselineV5Summary.summary.underblocking_count,
      overblocking_count_delta:
        baselineV6Summary.summary.overblocking_count -
        baselineV5Summary.summary.overblocking_count,
      low_confidence_allow_count_delta:
        baselineV6Summary.summary.low_confidence_allow_count -
        baselineV5Summary.summary.low_confidence_allow_count,
      review_rate_reduced:
        baselineV6Summary.summary.review_rate <
        baselineV5Summary.summary.review_rate,
      underblocking_zero_maintained:
        baselineV5Summary.summary.underblocking_count === 0 &&
        baselineV6Summary.summary.underblocking_count === 0,
      low_confidence_allow_zero_maintained:
        baselineV5Summary.summary.low_confidence_allow_count === 0 &&
        baselineV6Summary.summary.low_confidence_allow_count === 0,
      recovered_allow_seed_ids: recoveredAllowSeedIds,
      newly_blocked_seed_ids: newlyBlockedSeedIds,
      strict_safe_band_allow_count: strictSafeBandAllowCount,
      relaxed_safe_band_allow_count: relaxedSafeBandAllowCount,
    },
    spotlight: {
      case_03: cases.find((item) => item.seed_id === "case-03") ?? null,
      case_04: cases.find((item) => item.seed_id === "case-04") ?? null,
      case_12: cases.find((item) => item.seed_id === "case-12") ?? null,
      case_15: cases.find((item) => item.seed_id === "case-15") ?? null,
    },
    cases,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(OUTPUT_MD_PATH, `${buildMarkdown(report)}\n`, "utf8");

  console.log(
    `[analyze-baseline-v6] baseline-v5 allow=${report.baseline_v5.allow_count} review=${report.baseline_v5.review_count} block=${report.baseline_v5.block_count}`,
  );
  console.log(
    `[analyze-baseline-v6] baseline-v6 allow=${report.baseline_v6.allow_count} review=${report.baseline_v6.review_count} block=${report.baseline_v6.block_count}`,
  );
  console.log(
    `[analyze-baseline-v6] strict_allow=${strictSafeBandAllowCount} relaxed_allow=${relaxedSafeBandAllowCount} recovered_allow=${recoveredAllowSeedIds.join(",") || "none"}`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[analyze-baseline-v6] fatal: ${message}`);
  process.exitCode = 1;
});
