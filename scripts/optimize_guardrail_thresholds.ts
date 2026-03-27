import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  getGuardrailThresholdSet,
  resolveGuardrailThresholdCutoff,
  type GuardrailThresholdConfig,
} from "../src/config/guardrail-thresholds.ts";
import {
  computeThresholdObjective,
  type ThresholdObjectiveResult,
  type ThresholdPerformanceMetrics,
} from "../src/guardrail/threshold-objective.ts";
import {
  evaluateThresholdDataset,
  parseThresholdDataset,
  summarizeTriggerPatterns,
} from "../src/guardrail/threshold-evaluation.ts";

type CandidateResult = {
  thresholds: GuardrailThresholdConfig;
  raw_thresholds: {
    carefulMin: number;
    blockMin: number;
  };
  effective_thresholds: {
    carefulMin: number;
    blockMin: number;
  };
  metrics: ThresholdPerformanceMetrics;
  objective: ThresholdObjectiveResult;
};

function resolveSummaryPath(repoRoot: string): string {
  const envPath = process.env.GUARDRAIL_SUMMARY_PATH?.trim();

  if (!envPath) {
    return path.join(repoRoot, "playground", "outputs", "summary.md");
  }

  return path.isAbsolute(envPath) ? envPath : path.join(repoRoot, envPath);
}

function upsertSummarySection(summaryMarkdown: string, sectionBody: string): string {
  const heading = "## Guardrail Auto Optimization";
  const section = `${heading}\n\n${sectionBody.trim()}\n`;
  const existingSectionPattern =
    /(?:^|\n)## Guardrail Auto Optimization\n[\s\S]*?(?=\n## [^\n]+|\s*$)/;

  if (existingSectionPattern.test(summaryMarkdown)) {
    return summaryMarkdown.replace(existingSectionPattern, `\n${section}`);
  }

  return `${summaryMarkdown.trimEnd()}\n\n${section}`;
}

function buildRange(min: number, max: number, step: number): number[] {
  const values: number[] = [];

  for (let current = min; current <= max + 1e-9; current += step) {
    values.push(Number(current.toFixed(2)));
  }

  return values;
}

function buildCandidateValues(...groups: number[][]): number[] {
  return [...new Set(groups.flat().map((value) => Number(value.toFixed(2))))].sort(
    (left, right) => left - right,
  );
}

function compareCandidates(left: CandidateResult, right: CandidateResult): number {
  if (right.objective.total_score !== left.objective.total_score) {
    return right.objective.total_score - left.objective.total_score;
  }

  if (
    right.metrics.acceptable_match_rate !== left.metrics.acceptable_match_rate
  ) {
    return right.metrics.acceptable_match_rate - left.metrics.acceptable_match_rate;
  }

  if (right.metrics.preferred_match_rate !== left.metrics.preferred_match_rate) {
    return right.metrics.preferred_match_rate - left.metrics.preferred_match_rate;
  }

  const leftPenalty = left.metrics.overblocking + left.metrics.underblocking;
  const rightPenalty = right.metrics.overblocking + right.metrics.underblocking;
  if (leftPenalty !== rightPenalty) {
    return leftPenalty - rightPenalty;
  }

  if (left.raw_thresholds.carefulMin !== right.raw_thresholds.carefulMin) {
    return left.raw_thresholds.carefulMin - right.raw_thresholds.carefulMin;
  }

  return left.raw_thresholds.blockMin - right.raw_thresholds.blockMin;
}

async function main() {
  const repoRoot = process.cwd();
  const datasetPath = path.join(
    repoRoot,
    "data",
    "guardrail_threshold_dataset.jsonl",
  );
  const outputsRoot = path.join(repoRoot, "outputs");
  const outputPath = path.join(outputsRoot, "guardrail_threshold_optimized.json");
  const summaryMarkdownPath = resolveSummaryPath(repoRoot);

  await mkdir(outputsRoot, { recursive: true });
  await mkdir(path.dirname(summaryMarkdownPath), { recursive: true });

  const baselineThresholds = getGuardrailThresholdSet("baseline");
  const rawDataset = await readFile(datasetPath, "utf8");
  const datasetCases = parseThresholdDataset(rawDataset);

  const baselineEvaluation = evaluateThresholdDataset(datasetCases, {
    thresholdSetName: "baseline",
  });
  const baselineObjective = computeThresholdObjective(baselineEvaluation.metrics);

  const carefulCandidates = buildCandidateValues(
    [baselineThresholds.carefulMin],
    buildRange(0.4, 0.7, 0.05),
  );
  const blockCandidates = buildCandidateValues(
    [baselineThresholds.blockMin],
    buildRange(0.6, 0.9, 0.05),
  );

  const candidates: CandidateResult[] = [];

  for (const carefulMin of carefulCandidates) {
    for (const blockMin of blockCandidates) {
      const candidateThresholds: GuardrailThresholdConfig = {
        ...baselineThresholds,
        carefulMin,
        blockMin,
      };
      const effectiveCareful = resolveGuardrailThresholdCutoff(
        candidateThresholds.carefulMin,
        candidateThresholds,
      );
      const effectiveBlock = resolveGuardrailThresholdCutoff(
        candidateThresholds.blockMin,
        candidateThresholds,
      );

      if (effectiveCareful >= effectiveBlock) {
        continue;
      }

      const evaluation = evaluateThresholdDataset(datasetCases, {
        thresholds: candidateThresholds,
      });
      const objective = computeThresholdObjective(evaluation.metrics);

      candidates.push({
        thresholds: candidateThresholds,
        raw_thresholds: {
          carefulMin,
          blockMin,
        },
        effective_thresholds: {
          carefulMin: effectiveCareful,
          blockMin: effectiveBlock,
        },
        metrics: evaluation.metrics,
        objective,
      });
    }
  }

  if (candidates.length === 0) {
    throw new Error("No valid threshold candidates were generated.");
  }

  candidates.sort(compareCandidates);
  const bestCandidate = candidates[0];
  const optimizedEvaluation = evaluateThresholdDataset(datasetCases, {
    thresholds: bestCandidate.thresholds,
  });
  const baselineVsOptimized = {
    objective_score_delta: Number(
      (
        bestCandidate.objective.total_score - baselineObjective.total_score
      ).toFixed(4),
    ),
    preferred_match_rate_delta: Number(
      (
        bestCandidate.metrics.preferred_match_rate -
        baselineEvaluation.metrics.preferred_match_rate
      ).toFixed(2),
    ),
    acceptable_match_rate_delta: Number(
      (
        bestCandidate.metrics.acceptable_match_rate -
        baselineEvaluation.metrics.acceptable_match_rate
      ).toFixed(2),
    ),
    overblocking_delta:
      bestCandidate.metrics.overblocking - baselineEvaluation.metrics.overblocking,
    underblocking_delta:
      bestCandidate.metrics.underblocking - baselineEvaluation.metrics.underblocking,
  };

  const output = {
    search_space: {
      carefulMin_candidates: carefulCandidates,
      blockMin_candidates: blockCandidates,
      valid_combinations: candidates.length,
    },
    baseline: {
      thresholds: {
        carefulMin: baselineThresholds.carefulMin,
        blockMin: baselineThresholds.blockMin,
      },
      effective_thresholds: {
        carefulMin: resolveGuardrailThresholdCutoff(
          baselineThresholds.carefulMin,
          baselineThresholds,
        ),
        blockMin: resolveGuardrailThresholdCutoff(
          baselineThresholds.blockMin,
          baselineThresholds,
        ),
      },
      score: baselineObjective.total_score,
      metrics: baselineEvaluation.metrics,
    },
    best_threshold: {
      carefulMin: bestCandidate.raw_thresholds.carefulMin,
      blockMin: bestCandidate.raw_thresholds.blockMin,
      effective_carefulMin: bestCandidate.effective_thresholds.carefulMin,
      effective_blockMin: bestCandidate.effective_thresholds.blockMin,
    },
    score: bestCandidate.objective.total_score,
    metrics: bestCandidate.metrics,
    baseline_vs_optimized: baselineVsOptimized,
    improvement:
      bestCandidate.objective.total_score > baselineObjective.total_score
        ? "improved"
        : bestCandidate.objective.total_score === baselineObjective.total_score
          ? "same"
          : "regressed",
  };

  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  let existingSummary = "";
  try {
    existingSummary = await readFile(summaryMarkdownPath, "utf8");
  } catch {
    existingSummary = "# Summary\n";
  }

  const summarySection = [
    `- best threshold: carefulMin=${bestCandidate.raw_thresholds.carefulMin}, blockMin=${bestCandidate.raw_thresholds.blockMin}`,
    `- 기존 baseline vs optimized 비교: baseline score ${baselineObjective.total_score}, optimized score ${bestCandidate.objective.total_score}, preferred ${baselineEvaluation.metrics.preferred_match_rate} -> ${bestCandidate.metrics.preferred_match_rate}, acceptable ${baselineEvaluation.metrics.acceptable_match_rate} -> ${bestCandidate.metrics.acceptable_match_rate}`,
    `- 개선 여부: ${output.improvement}`,
    `- 과잉/과소 차단 패턴: overblocking ${summarizeTriggerPatterns(
      optimizedEvaluation.overblocking_cases,
    )}; underblocking ${summarizeTriggerPatterns(
      optimizedEvaluation.underblocking_cases,
    )}`,
  ].join("\n");

  const updatedSummary = upsertSummarySection(existingSummary, summarySection);
  await writeFile(summaryMarkdownPath, `${updatedSummary.trimEnd()}\n`, "utf8");

  console.info(
    `Optimized guardrail thresholds across ${candidates.length} combinations.`,
  );
  console.info(`Created ${path.relative(repoRoot, outputPath)}`);
  console.info(`Updated ${path.relative(repoRoot, summaryMarkdownPath)}`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
