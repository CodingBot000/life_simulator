import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  COMPARISON_GUARDRAIL_THRESHOLD_SET_NAMES,
} from "../src/config/guardrail-thresholds.ts";
import {
  evaluateThresholdDataset,
  parseThresholdDataset,
  summarizeTriggerPatterns,
} from "../src/guardrail/threshold-evaluation.ts";
import type { ThresholdPerformanceMetrics } from "../src/guardrail/threshold-objective.ts";

type ComparisonGuardrailThresholdSetName =
  (typeof COMPARISON_GUARDRAIL_THRESHOLD_SET_NAMES)[number];

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

function recommendThresholdSet(
  metricsBySet: Record<ComparisonGuardrailThresholdSetName, ThresholdPerformanceMetrics>,
): ComparisonGuardrailThresholdSetName {
  const sorted = [...COMPARISON_GUARDRAIL_THRESHOLD_SET_NAMES].sort((left, right) => {
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
  const datasetCases = parseThresholdDataset(rawDataset);
  const evaluationsBySet = Object.fromEntries(
    COMPARISON_GUARDRAIL_THRESHOLD_SET_NAMES.map((setName) => [
      setName,
      evaluateThresholdDataset(datasetCases, {
        thresholdSetName: setName,
      }),
    ]),
  ) as Record<
    ComparisonGuardrailThresholdSetName,
    ReturnType<typeof evaluateThresholdDataset>
  >;
  const metricsBySet = Object.fromEntries(
    COMPARISON_GUARDRAIL_THRESHOLD_SET_NAMES.map((setName) => [
      setName,
      evaluationsBySet[setName].metrics,
    ]),
  ) as Record<ComparisonGuardrailThresholdSetName, ThresholdPerformanceMetrics>;
  const total = datasetCases.length;

  for (const [index, item] of datasetCases.entries()) {
    const diffSummary = {
      preferred_matches: [] as string[],
      acceptable_matches: [] as string[],
      overblocking: [] as string[],
      underblocking: [] as string[],
    };

    const caseOutput: Record<string, unknown> = {
      input: item.input,
      expected: item.expected,
    };

    for (const setName of COMPARISON_GUARDRAIL_THRESHOLD_SET_NAMES) {
      const caseEvaluation = evaluationsBySet[setName].case_results[index];
      caseOutput[setName] = caseEvaluation.actual;

      if (caseEvaluation.diff.preferred_match) {
        diffSummary.preferred_matches.push(setName);
      }

      if (caseEvaluation.diff.acceptable_match) {
        diffSummary.acceptable_matches.push(setName);
      }

      if (caseEvaluation.diff.overblocking) {
        diffSummary.overblocking.push(setName);
      }

      if (caseEvaluation.diff.underblocking) {
        diffSummary.underblocking.push(setName);
      }
    }

    caseOutput.diff_summary = diffSummary;

    await writeFile(
      path.join(casesOutputDir, `${item.id}.json`),
      `${JSON.stringify(caseOutput, null, 2)}\n`,
      "utf8",
    );
  }

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

  const overblockingPatterns = COMPARISON_GUARDRAIL_THRESHOLD_SET_NAMES.map(
    (setName) =>
      `${setName}: ${summarizeTriggerPatterns(
        evaluationsBySet[setName].overblocking_cases,
      )}`,
  ).join(" / ");
  const underblockingPatterns = COMPARISON_GUARDRAIL_THRESHOLD_SET_NAMES.map(
    (setName) =>
      `${setName}: ${summarizeTriggerPatterns(
        evaluationsBySet[setName].underblocking_cases,
      )}`,
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
