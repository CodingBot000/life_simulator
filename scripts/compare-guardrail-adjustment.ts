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
  | "guardrail-threshold-set:baseline"
  | "guardrail-threshold-set:baseline-v2";

type VersionSummary = {
  threshold_version: VersionKey;
  matched_seed_count: number;
  missing_seed_ids: string[];
  allow_count: number;
  review_count: number;
  block_count: number;
  block_rate: number;
  review_rate: number;
  underblocking_count: number;
  underblocking_rate: number;
  low_confidence_allow_count: number;
  low_confidence_allow_rate: number;
  low_confidence_anomaly_count: number;
  low_confidence_anomaly_rate: number;
  threshold_adjusted_count: number;
  threshold_adjusted_rate: number;
  calibration_adjusted_count: number;
  calibration_adjusted_rate: number;
};

type ComparisonReport = {
  generated_at: string;
  seed_case_count: number;
  baseline: VersionSummary;
  baseline_v2: VersionSummary;
  comparison: {
    underblocking_count_delta: number;
    underblocking_rate_delta: number;
    low_confidence_allow_count_delta: number;
    low_confidence_allow_rate_delta: number;
    block_count_delta: number;
    block_rate_delta: number;
    threshold_adjusted_count_delta: number;
    calibration_adjusted_count_delta: number;
    underblocking_reduced: boolean;
    low_confidence_allow_removed: boolean;
  };
};

const OUTPUT_DIR = path.join(process.cwd(), "outputs", "monitoring");
const OUTPUT_JSON_PATH = path.join(
  OUTPUT_DIR,
  "guardrail-adjustment-comparison.json",
);
const OUTPUT_MD_PATH = path.join(
  OUTPUT_DIR,
  "guardrail-adjustment-comparison.md",
);
const SEED_INPUT_PATH = path.join(process.cwd(), "scripts", "seed-inputs.json");
const TARGET_VERSIONS: VersionKey[] = [
  "guardrail-threshold-set:baseline",
  "guardrail-threshold-set:baseline-v2",
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
}): VersionSummary {
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
    threshold_version: params.thresholdVersion,
    matched_seed_count: matchedLogs.length,
    missing_seed_ids: missingSeedIds,
    allow_count: allowCount,
    review_count: reviewCount,
    block_count: blockCount,
    block_rate: safeRate(blockCount, total),
    review_rate: safeRate(reviewCount, total),
    underblocking_count: underblockingCount,
    underblocking_rate: safeRate(underblockingCount, total),
    low_confidence_allow_count: lowConfidenceAllowCount,
    low_confidence_allow_rate: safeRate(lowConfidenceAllowCount, total),
    low_confidence_anomaly_count: lowConfidenceAnomalyCount,
    low_confidence_anomaly_rate: safeRate(lowConfidenceAnomalyCount, total),
    threshold_adjusted_count: thresholdAdjustedCount,
    threshold_adjusted_rate: safeRate(thresholdAdjustedCount, total),
    calibration_adjusted_count: calibrationAdjustedCount,
    calibration_adjusted_rate: safeRate(calibrationAdjustedCount, total),
  };
}

function buildMarkdown(report: ComparisonReport): string {
  return [
    "# Guardrail Adjustment Comparison",
    "",
    `- generated_at: ${report.generated_at}`,
    `- seed_case_count: ${report.seed_case_count}`,
    "",
    "## baseline",
    `- matched_seed_count: ${report.baseline.matched_seed_count}`,
    `- missing_seed_ids: ${
      report.baseline.missing_seed_ids.length > 0
        ? report.baseline.missing_seed_ids.join(", ")
        : "none"
    }`,
    `- allow/review/block: ${report.baseline.allow_count}/${report.baseline.review_count}/${report.baseline.block_count}`,
    `- block_rate: ${report.baseline.block_rate}`,
    `- underblocking_count: ${report.baseline.underblocking_count}`,
    `- low_confidence_allow_count: ${report.baseline.low_confidence_allow_count}`,
    `- low_confidence_anomaly_count: ${report.baseline.low_confidence_anomaly_count}`,
    `- threshold_adjusted_count: ${report.baseline.threshold_adjusted_count}`,
    `- calibration_adjusted_count: ${report.baseline.calibration_adjusted_count}`,
    "",
    "## baseline-v2",
    `- matched_seed_count: ${report.baseline_v2.matched_seed_count}`,
    `- missing_seed_ids: ${
      report.baseline_v2.missing_seed_ids.length > 0
        ? report.baseline_v2.missing_seed_ids.join(", ")
        : "none"
    }`,
    `- allow/review/block: ${report.baseline_v2.allow_count}/${report.baseline_v2.review_count}/${report.baseline_v2.block_count}`,
    `- block_rate: ${report.baseline_v2.block_rate}`,
    `- underblocking_count: ${report.baseline_v2.underblocking_count}`,
    `- low_confidence_allow_count: ${report.baseline_v2.low_confidence_allow_count}`,
    `- low_confidence_anomaly_count: ${report.baseline_v2.low_confidence_anomaly_count}`,
    `- threshold_adjusted_count: ${report.baseline_v2.threshold_adjusted_count}`,
    `- calibration_adjusted_count: ${report.baseline_v2.calibration_adjusted_count}`,
    "",
    "## comparison",
    `- underblocking_count_delta: ${report.comparison.underblocking_count_delta}`,
    `- underblocking_rate_delta: ${report.comparison.underblocking_rate_delta}`,
    `- low_confidence_allow_count_delta: ${report.comparison.low_confidence_allow_count_delta}`,
    `- low_confidence_allow_rate_delta: ${report.comparison.low_confidence_allow_rate_delta}`,
    `- block_count_delta: ${report.comparison.block_count_delta}`,
    `- block_rate_delta: ${report.comparison.block_rate_delta}`,
    `- threshold_adjusted_count_delta: ${report.comparison.threshold_adjusted_count_delta}`,
    `- calibration_adjusted_count_delta: ${report.comparison.calibration_adjusted_count_delta}`,
    `- underblocking_reduced: ${report.comparison.underblocking_reduced}`,
    `- low_confidence_allow_removed: ${report.comparison.low_confidence_allow_removed}`,
    "",
  ].join("\n");
}

async function main() {
  const [seedCases, requestArtifacts] = await Promise.all([
    readSeedCases(),
    readJsonArtifacts<RequestLog>("request_logs"),
  ]);
  const requestLogs = requestArtifacts.map((artifact) => artifact.value);
  const baseline = summarizeVersion({
    thresholdVersion: TARGET_VERSIONS[0],
    seedCases,
    requestLogs,
  });
  const baselineV2 = summarizeVersion({
    thresholdVersion: TARGET_VERSIONS[1],
    seedCases,
    requestLogs,
  });
  const report: ComparisonReport = {
    generated_at: new Date().toISOString(),
    seed_case_count: seedCases.length,
    baseline,
    baseline_v2: baselineV2,
    comparison: {
      underblocking_count_delta: round(
        baselineV2.underblocking_count - baseline.underblocking_count,
      ),
      underblocking_rate_delta: round(
        baselineV2.underblocking_rate - baseline.underblocking_rate,
      ),
      low_confidence_allow_count_delta: round(
        baselineV2.low_confidence_allow_count -
          baseline.low_confidence_allow_count,
      ),
      low_confidence_allow_rate_delta: round(
        baselineV2.low_confidence_allow_rate -
          baseline.low_confidence_allow_rate,
      ),
      block_count_delta: round(baselineV2.block_count - baseline.block_count),
      block_rate_delta: round(baselineV2.block_rate - baseline.block_rate),
      threshold_adjusted_count_delta: round(
        baselineV2.threshold_adjusted_count - baseline.threshold_adjusted_count,
      ),
      calibration_adjusted_count_delta: round(
        baselineV2.calibration_adjusted_count -
          baseline.calibration_adjusted_count,
      ),
      underblocking_reduced:
        baselineV2.underblocking_count < baseline.underblocking_count,
      low_confidence_allow_removed:
        baseline.low_confidence_allow_count > 0 &&
        baselineV2.low_confidence_allow_count === 0,
    },
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await Promise.all([
    writeFile(OUTPUT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(OUTPUT_MD_PATH, buildMarkdown(report), "utf8"),
  ]);

  console.log(`[compare-guardrail-adjustment] wrote ${OUTPUT_JSON_PATH}`);
  console.log(`[compare-guardrail-adjustment] wrote ${OUTPUT_MD_PATH}`);
  console.log(
    `[compare-guardrail-adjustment] baseline block_rate=${baseline.block_rate} underblocking=${baseline.underblocking_count} low_confidence_allow=${baseline.low_confidence_allow_count}`,
  );
  console.log(
    `[compare-guardrail-adjustment] baseline-v2 block_rate=${baselineV2.block_rate} underblocking=${baselineV2.underblocking_count} low_confidence_allow=${baselineV2.low_confidence_allow_count}`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[compare-guardrail-adjustment] fatal: ${message}`);
  process.exitCode = 1;
});
