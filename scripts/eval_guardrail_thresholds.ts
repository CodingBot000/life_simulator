import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  GUARDRAIL_THRESHOLD_SET_NAMES,
  type GuardrailThresholdSetName,
} from "../src/config/guardrail-thresholds.ts";
import {
  compareGuardrailModes,
  evaluateGuardrailInput,
  normalizeGuardrailMode,
  type DatasetGuardrailMode,
  type GuardrailDatasetInput,
} from "../src/lib/guardrail-eval.ts";

type ThresholdDatasetCase = {
  id: string;
  input: GuardrailDatasetInput;
  expected: {
    preferred_mode: DatasetGuardrailMode | "normal" | "careful" | "block";
    acceptable_modes: Array<DatasetGuardrailMode | "normal" | "careful" | "block">;
    reason: string;
  };
};

type ThresholdCaseResult = ReturnType<typeof evaluateGuardrailInput>;

type SetMetrics = {
  preferred_match_count: number;
  preferred_match_rate: number;
  acceptable_match_count: number;
  acceptable_match_rate: number;
  overblocking: number;
  underblocking: number;
};

function formatRate(value: number): number {
  return Number(value.toFixed(2));
}

function resolveSummaryPath(repoRoot: string): string {
  const envPath = process.env.GUARDRAIL_SUMMARY_PATH?.trim();

  if (!envPath) {
    return path.join(repoRoot, "playground", "outputs", "summary.md");
  }

  return path.isAbsolute(envPath) ? envPath : path.join(repoRoot, envPath);
}

function upsertSummarySection(summaryMarkdown: string, sectionBody: string): string {
  const heading = "## Guardrail Threshold Tuning";
  const section = `${heading}\n\n${sectionBody.trim()}\n`;
  const existingSectionPattern =
    /(?:^|\n)## Guardrail Threshold Tuning\n[\s\S]*?(?=\n## [^\n]+|\s*$)/;

  if (existingSectionPattern.test(summaryMarkdown)) {
    return summaryMarkdown.replace(existingSectionPattern, `\n${section}`);
  }

  return `${summaryMarkdown.trimEnd()}\n\n${section}`;
}

function isAcceptableMode(
  actualMode: DatasetGuardrailMode,
  acceptableModes: DatasetGuardrailMode[],
): boolean {
  return acceptableModes.includes(actualMode);
}

function summarizePattern(cases: Array<{ triggers: string[] }>): string {
  if (cases.length === 0) {
    return "없음";
  }

  const counts = new Map<string, number>();

  for (const item of cases) {
    const key = item.triggers.length > 0 ? item.triggers.join("+") : "no_trigger";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 2)
    .map(([pattern, count]) => `${pattern} (${count}건)`)
    .join(", ");
}

function recommendThresholdSet(
  metricsBySet: Record<GuardrailThresholdSetName, SetMetrics>,
): GuardrailThresholdSetName {
  const sorted = [...GUARDRAIL_THRESHOLD_SET_NAMES].sort((left, right) => {
    const a = metricsBySet[left];
    const b = metricsBySet[right];

    if (b.acceptable_match_rate !== a.acceptable_match_rate) {
      return b.acceptable_match_rate - a.acceptable_match_rate;
    }

    if (b.preferred_match_rate !== a.preferred_match_rate) {
      return b.preferred_match_rate - a.preferred_match_rate;
    }

    const aPenalty = a.overblocking + a.underblocking;
    const bPenalty = b.overblocking + b.underblocking;
    if (aPenalty !== bPenalty) {
      return aPenalty - bPenalty;
    }

    return left.localeCompare(right);
  });

  return sorted[0];
}

async function main() {
  const repoRoot = process.cwd();
  const datasetPath = path.join(
    repoRoot,
    "data",
    "guardrail_threshold_dataset.jsonl",
  );
  const outputsRoot = path.join(repoRoot, "outputs");
  const casesOutputDir = path.join(outputsRoot, "guardrail_threshold_cases");
  const comparisonOutputPath = path.join(
    outputsRoot,
    "guardrail_threshold_comparison.json",
  );
  const summaryMarkdownPath = resolveSummaryPath(repoRoot);

  await mkdir(casesOutputDir, { recursive: true });
  await mkdir(path.dirname(summaryMarkdownPath), { recursive: true });

  const rawDataset = await readFile(datasetPath, "utf8");
  const datasetCases = rawDataset
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ThresholdDatasetCase);

  const seenIds = new Set<string>();
  const metricsAccumulator = Object.fromEntries(
    GUARDRAIL_THRESHOLD_SET_NAMES.map((setName) => [
      setName,
      {
        preferred_match_count: 0,
        acceptable_match_count: 0,
        overblocking: 0,
        underblocking: 0,
      },
    ]),
  ) as Record<
    GuardrailThresholdSetName,
    Omit<SetMetrics, "preferred_match_rate" | "acceptable_match_rate">
  >;

  const patternAccumulator = Object.fromEntries(
    GUARDRAIL_THRESHOLD_SET_NAMES.map((setName) => [
      setName,
      {
        overblocking: [] as Array<{ triggers: string[] }>,
        underblocking: [] as Array<{ triggers: string[] }>,
      },
    ]),
  ) as Record<
    GuardrailThresholdSetName,
    {
      overblocking: Array<{ triggers: string[] }>;
      underblocking: Array<{ triggers: string[] }>;
    }
  >;

  for (const item of datasetCases) {
    if (seenIds.has(item.id)) {
      throw new Error(`Duplicate case id found in threshold dataset: ${item.id}`);
    }

    seenIds.add(item.id);

    const preferredMode = normalizeGuardrailMode(item.expected.preferred_mode);
    const acceptableModes = item.expected.acceptable_modes.map((mode) =>
      normalizeGuardrailMode(mode),
    );

    const resultsBySet = Object.fromEntries(
      GUARDRAIL_THRESHOLD_SET_NAMES.map((setName) => [
        setName,
        evaluateGuardrailInput(item.input, {
          thresholdSetName: setName,
        }),
      ]),
    ) as Record<GuardrailThresholdSetName, ThresholdCaseResult>;

    const diffSummary = {
      preferred_matches: [] as string[],
      acceptable_matches: [] as string[],
      overblocking: [] as string[],
      underblocking: [] as string[],
    };

    for (const setName of GUARDRAIL_THRESHOLD_SET_NAMES) {
      const result = resultsBySet[setName];
      const actualMode = result.guardrail_mode;
      const preferredMatch = actualMode === preferredMode;
      const acceptableMatch = isAcceptableMode(actualMode, acceptableModes);

      if (preferredMatch) {
        metricsAccumulator[setName].preferred_match_count += 1;
        diffSummary.preferred_matches.push(setName);
      }

      if (acceptableMatch) {
        metricsAccumulator[setName].acceptable_match_count += 1;
        diffSummary.acceptable_matches.push(setName);
      }

      const acceptableFloor = acceptableModes.reduce((current, mode) =>
        compareGuardrailModes(mode, current) < 0 ? mode : current,
      );
      const acceptableCeiling = acceptableModes.reduce((current, mode) =>
        compareGuardrailModes(mode, current) > 0 ? mode : current,
      );

      if (!acceptableMatch && compareGuardrailModes(actualMode, acceptableCeiling) > 0) {
        metricsAccumulator[setName].overblocking += 1;
        diffSummary.overblocking.push(setName);
        patternAccumulator[setName].overblocking.push({
          triggers: result.detected_triggers,
        });
      } else if (
        !acceptableMatch &&
        compareGuardrailModes(actualMode, acceptableFloor) < 0
      ) {
        metricsAccumulator[setName].underblocking += 1;
        diffSummary.underblocking.push(setName);
        patternAccumulator[setName].underblocking.push({
          triggers: result.detected_triggers,
        });
      }
    }

    await writeFile(
      path.join(casesOutputDir, `${item.id}.json`),
      `${JSON.stringify(
        {
          input: item.input,
          expected: {
            preferred_mode: preferredMode,
            acceptable_modes: acceptableModes,
            reason: item.expected.reason,
          },
          baseline: resultsBySet.baseline,
          conservative: resultsBySet.conservative,
          aggressive: resultsBySet.aggressive,
          diff_summary: diffSummary,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
  }

  const total = datasetCases.length;
  const metricsBySet = Object.fromEntries(
    GUARDRAIL_THRESHOLD_SET_NAMES.map((setName) => [
      setName,
      {
        preferred_match_count: metricsAccumulator[setName].preferred_match_count,
        preferred_match_rate: formatRate(
          metricsAccumulator[setName].preferred_match_count / total,
        ),
        acceptable_match_count: metricsAccumulator[setName].acceptable_match_count,
        acceptable_match_rate: formatRate(
          metricsAccumulator[setName].acceptable_match_count / total,
        ),
        overblocking: metricsAccumulator[setName].overblocking,
        underblocking: metricsAccumulator[setName].underblocking,
      },
    ]),
  ) as Record<GuardrailThresholdSetName, SetMetrics>;

  const recommendedThresholdSet = recommendThresholdSet(metricsBySet);
  const output = {
    total,
    baseline: metricsBySet.baseline,
    conservative: metricsBySet.conservative,
    aggressive: metricsBySet.aggressive,
    recommended_threshold_set: recommendedThresholdSet,
  };

  await writeFile(comparisonOutputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  let existingSummary = "";
  try {
    existingSummary = await readFile(summaryMarkdownPath, "utf8");
  } catch {
    existingSummary = "# Summary\n";
  }

  const overblockingPatterns = GUARDRAIL_THRESHOLD_SET_NAMES.map(
    (setName) =>
      `${setName}: ${summarizePattern(patternAccumulator[setName].overblocking)}`,
  ).join(" / ");
  const underblockingPatterns = GUARDRAIL_THRESHOLD_SET_NAMES.map(
    (setName) =>
      `${setName}: ${summarizePattern(patternAccumulator[setName].underblocking)}`,
  ).join(" / ");

  const summarySection = [
    `- baseline 성능: preferred ${metricsBySet.baseline.preferred_match_rate}, acceptable ${metricsBySet.baseline.acceptable_match_rate}, overblocking ${metricsBySet.baseline.overblocking}, underblocking ${metricsBySet.baseline.underblocking}`,
    `- conservative 성능: preferred ${metricsBySet.conservative.preferred_match_rate}, acceptable ${metricsBySet.conservative.acceptable_match_rate}, overblocking ${metricsBySet.conservative.overblocking}, underblocking ${metricsBySet.conservative.underblocking}`,
    `- aggressive 성능: preferred ${metricsBySet.aggressive.preferred_match_rate}, acceptable ${metricsBySet.aggressive.acceptable_match_rate}, overblocking ${metricsBySet.aggressive.overblocking}, underblocking ${metricsBySet.aggressive.underblocking}`,
    `- 추천 threshold set: ${recommendedThresholdSet}`,
    `- 발견된 과잉 차단 / 과소 차단 패턴: overblocking ${overblockingPatterns}; underblocking ${underblockingPatterns}`,
  ].join("\n");

  const updatedSummary = upsertSummarySection(existingSummary, summarySection);
  await writeFile(summaryMarkdownPath, `${updatedSummary.trimEnd()}\n`, "utf8");

  console.info(`Compared ${total} guardrail threshold cases.`);
  console.info(`Created ${path.relative(repoRoot, comparisonOutputPath)}`);
  console.info(`Updated ${path.relative(repoRoot, summaryMarkdownPath)}`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
