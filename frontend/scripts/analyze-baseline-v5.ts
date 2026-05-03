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
  | "guardrail-threshold-set:baseline-v4"
  | "guardrail-threshold-set:baseline-v5";

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

type CaseComparison = {
  seed_id: string;
  category: string;
  baseline_v4_decision: string | null;
  baseline_v5_decision: string | null;
  baseline_v4_confidence: number | null;
  baseline_v5_confidence: number | null;
  baseline_v4_uncertainty: number | null;
  baseline_v5_uncertainty: number | null;
  baseline_v4_triggers: string[];
  baseline_v5_triggers: string[];
  recovered_to_allow: boolean;
  became_block: boolean;
  low_confidence_allow_in_v5: boolean;
};

type ComparisonReport = {
  generated_at: string;
  seed_case_count: number;
  baseline_v4: VersionSummary;
  baseline_v5: VersionSummary;
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
  };
  spotlight: {
    case_04: CaseComparison | null;
    case_07: CaseComparison | null;
    case_15: CaseComparison | null;
  };
  cases: CaseComparison[];
};

const OUTPUT_DIR = path.join(process.cwd(), "outputs", "monitoring");
const OUTPUT_JSON_PATH = path.join(OUTPUT_DIR, "baseline-v5-comparison.json");
const OUTPUT_MD_PATH = path.join(OUTPUT_DIR, "baseline-v5-analysis.md");
const SEED_INPUT_PATH = path.join(process.cwd(), "scripts", "seed-inputs.json");
const TARGET_VERSIONS: VersionKey[] = [
  "guardrail-threshold-set:baseline-v4",
  "guardrail-threshold-set:baseline-v5",
] as const;

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

function buildCaseComparisons(params: {
  seedCases: SeedCase[];
  baselineV4: Map<string, RequestLog>;
  baselineV5: Map<string, RequestLog>;
}): CaseComparison[] {
  return params.seedCases.map((seedCase) => {
    const baselineV4Log = params.baselineV4.get(seedCase.id) ?? null;
    const baselineV5Log = params.baselineV5.get(seedCase.id) ?? null;
    const baselineV4Decision = baselineV4Log?.guardrail.guardrail_derived.decision ?? null;
    const baselineV5Decision = baselineV5Log?.guardrail.guardrail_derived.decision ?? null;
    const baselineV5UnionFlags = baselineV5Log
      ? mergeFlags(
          baselineV5Log.guardrail.guardrail_derived.anomaly.anomaly_raw_based,
          baselineV5Log.guardrail.guardrail_derived.anomaly.anomaly_derived_based,
        )
      : null;

    return {
      seed_id: seedCase.id,
      category: seedCase.category,
      baseline_v4_decision: baselineV4Decision,
      baseline_v5_decision: baselineV5Decision,
      baseline_v4_confidence:
        baselineV4Log?.guardrail.guardrail_raw.confidence_score ?? null,
      baseline_v5_confidence:
        baselineV5Log?.guardrail.guardrail_raw.confidence_score ?? null,
      baseline_v4_uncertainty:
        baselineV4Log?.guardrail.guardrail_raw.uncertainty_score ?? null,
      baseline_v5_uncertainty:
        baselineV5Log?.guardrail.guardrail_raw.uncertainty_score ?? null,
      baseline_v4_triggers:
        baselineV4Log?.guardrail.guardrail_raw.detected_triggers ?? [],
      baseline_v5_triggers:
        baselineV5Log?.guardrail.guardrail_raw.detected_triggers ?? [],
      recovered_to_allow:
        baselineV4Decision === "review" && baselineV5Decision === "allow",
      became_block:
        baselineV4Decision !== "block" && baselineV5Decision === "block",
      low_confidence_allow_in_v5:
        baselineV5Decision === "allow" &&
        Boolean(baselineV5UnionFlags?.low_confidence),
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
  const case07Triggers =
    report.spotlight.case_07?.baseline_v5_triggers.join(", ") || "none";
  const case15Triggers =
    report.spotlight.case_15?.baseline_v5_triggers.join(", ") || "none";

  return [
    "# Baseline-v5 Analysis",
    "",
    "## Summary",
    `- generated_at: ${report.generated_at}`,
    `- seed_case_count: ${report.seed_case_count}`,
    `- baseline-v4 allow/review/block: ${report.baseline_v4.allow_count}/${report.baseline_v4.review_count}/${report.baseline_v4.block_count}`,
    `- baseline-v5 allow/review/block: ${report.baseline_v5.allow_count}/${report.baseline_v5.review_count}/${report.baseline_v5.block_count}`,
    `- allow_count_delta: ${report.comparison.allow_count_delta}`,
    `- review_rate_delta: ${report.comparison.review_rate_delta}`,
    `- underblocking_zero_maintained: ${report.comparison.underblocking_zero_maintained}`,
    `- low_confidence_allow_zero_maintained: ${report.comparison.low_confidence_allow_zero_maintained}`,
    `- threshold_adjusted_count: ${report.baseline_v4.threshold_adjusted_count} -> ${report.baseline_v5.threshold_adjusted_count}`,
    `- calibration_adjusted_count: ${report.baseline_v4.calibration_adjusted_count} -> ${report.baseline_v5.calibration_adjusted_count}`,
    `- recovered_allow_seed_ids: ${recoveredAllowIds}`,
    `- newly_blocked_seed_ids: ${newlyBlockedIds}`,
    "",
    "## Target Checks",
    `- safe-band allow recovered: ${report.comparison.allow_count_delta > 0}`,
    `- review_rate reduced: ${report.comparison.review_rate_reduced}`,
    `- underblocking stayed at 0: ${report.comparison.underblocking_zero_maintained}`,
    `- low_confidence_allow stayed at 0: ${report.comparison.low_confidence_allow_zero_maintained}`,
    "",
    "## Spotlight",
    `- case-04: ${report.spotlight.case_04?.baseline_v4_decision ?? "missing"} -> ${report.spotlight.case_04?.baseline_v5_decision ?? "missing"}, confidence ${report.spotlight.case_04?.baseline_v4_confidence ?? "n/a"} -> ${report.spotlight.case_04?.baseline_v5_confidence ?? "n/a"}, uncertainty ${report.spotlight.case_04?.baseline_v4_uncertainty ?? "n/a"} -> ${report.spotlight.case_04?.baseline_v5_uncertainty ?? "n/a"}`,
    `- case-07: ${report.spotlight.case_07?.baseline_v4_decision ?? "missing"} -> ${report.spotlight.case_07?.baseline_v5_decision ?? "missing"}, triggers ${report.spotlight.case_07?.baseline_v5_triggers.join(", ") || "none"}`,
    `- case-15: ${report.spotlight.case_15?.baseline_v4_decision ?? "missing"} -> ${report.spotlight.case_15?.baseline_v5_decision ?? "missing"}, triggers ${report.spotlight.case_15?.baseline_v5_triggers.join(", ") || "none"}`,
    "",
    "## Interpretation",
    "- baseline-v5 only recovers allow for medium-risk safe-band cases where ambiguity is missing-context driven and low-confidence/high-risk signals are absent.",
    "- low_confidence_allow 금지 정책은 유지되므로 low_confidence trigger가 남은 케이스는 review에 남아야 한다.",
    report.spotlight.case_04?.baseline_v5_decision === "allow"
      ? "- case-04 recovered to allow as the representative safe-band ambiguity/conflict case."
      : "- case-04 did not recover, which means the safe-band rule is still too strict.",
    report.spotlight.case_07?.baseline_v5_decision === "review"
      ? `- case-07 stayed in review because the fresh baseline-v5 run still triggered ${case07Triggers}.`
      : "- case-07 recovered out of review; re-check low_confidence_allow policy if this was not intended.",
    report.spotlight.case_15?.baseline_v5_decision === "review"
      ? `- case-15 stayed in review because it still sits outside the safe band and keeps ${case15Triggers} active.`
      : "- case-15 recovered out of review in the fresh baseline-v5 run.",
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

  const baselineV4Summary = summaries.get(
    "guardrail-threshold-set:baseline-v4",
  );
  const baselineV5Summary = summaries.get(
    "guardrail-threshold-set:baseline-v5",
  );

  if (!baselineV4Summary || !baselineV5Summary) {
    throw new Error("baseline-v4 or baseline-v5 summary could not be built.");
  }

  const cases = buildCaseComparisons({
    seedCases,
    baselineV4: baselineV4Summary.latestBySeed,
    baselineV5: baselineV5Summary.latestBySeed,
  });
  const recoveredAllowSeedIds = cases
    .filter((item) => item.recovered_to_allow)
    .map((item) => item.seed_id);
  const newlyBlockedSeedIds = cases
    .filter((item) => item.became_block)
    .map((item) => item.seed_id);
  const report: ComparisonReport = {
    generated_at: new Date().toISOString(),
    seed_case_count: seedCases.length,
    baseline_v4: baselineV4Summary.summary,
    baseline_v5: baselineV5Summary.summary,
    comparison: {
      allow_count_delta:
        baselineV5Summary.summary.allow_count -
        baselineV4Summary.summary.allow_count,
      review_count_delta:
        baselineV5Summary.summary.review_count -
        baselineV4Summary.summary.review_count,
      block_count_delta:
        baselineV5Summary.summary.block_count -
        baselineV4Summary.summary.block_count,
      allow_rate_delta: round(
        baselineV5Summary.summary.allow_rate - baselineV4Summary.summary.allow_rate,
      ),
      review_rate_delta: round(
        baselineV5Summary.summary.review_rate -
          baselineV4Summary.summary.review_rate,
      ),
      block_rate_delta: round(
        baselineV5Summary.summary.block_rate - baselineV4Summary.summary.block_rate,
      ),
      underblocking_count_delta:
        baselineV5Summary.summary.underblocking_count -
        baselineV4Summary.summary.underblocking_count,
      overblocking_count_delta:
        baselineV5Summary.summary.overblocking_count -
        baselineV4Summary.summary.overblocking_count,
      low_confidence_allow_count_delta:
        baselineV5Summary.summary.low_confidence_allow_count -
        baselineV4Summary.summary.low_confidence_allow_count,
      review_rate_reduced:
        baselineV5Summary.summary.review_rate <
        baselineV4Summary.summary.review_rate,
      underblocking_zero_maintained:
        baselineV4Summary.summary.underblocking_count === 0 &&
        baselineV5Summary.summary.underblocking_count === 0,
      low_confidence_allow_zero_maintained:
        baselineV4Summary.summary.low_confidence_allow_count === 0 &&
        baselineV5Summary.summary.low_confidence_allow_count === 0,
      recovered_allow_seed_ids: recoveredAllowSeedIds,
      newly_blocked_seed_ids: newlyBlockedSeedIds,
    },
    spotlight: {
      case_04: cases.find((item) => item.seed_id === "case-04") ?? null,
      case_07: cases.find((item) => item.seed_id === "case-07") ?? null,
      case_15: cases.find((item) => item.seed_id === "case-15") ?? null,
    },
    cases,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(OUTPUT_MD_PATH, `${buildMarkdown(report)}\n`, "utf8");

  console.log(
    `[analyze-baseline-v5] baseline-v4 allow=${report.baseline_v4.allow_count} review=${report.baseline_v4.review_count} block=${report.baseline_v4.block_count}`,
  );
  console.log(
    `[analyze-baseline-v5] baseline-v5 allow=${report.baseline_v5.allow_count} review=${report.baseline_v5.review_count} block=${report.baseline_v5.block_count}`,
  );
  console.log(
    `[analyze-baseline-v5] recovered_allow=${recoveredAllowSeedIds.join(",") || "none"} newly_blocked=${newlyBlockedSeedIds.join(",") || "none"}`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[analyze-baseline-v5] fatal: ${message}`);
  process.exitCode = 1;
});
