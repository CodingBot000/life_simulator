import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  evaluateGuardrailInput,
  normalizeGuardrailMode,
  normalizeRiskLevel,
  type GuardrailDatasetCase,
} from "../src/lib/guardrail-eval.ts";

type FailCase = {
  id: string;
  expected: {
    risk_level: string;
    guardrail_mode: string;
  };
  actual: {
    risk_level: string;
    guardrail_mode: string;
    raw_guardrail_mode: string;
    triggers: string[];
  };
  diff: {
    risk_level_match: boolean;
    guardrail_mode_match: boolean;
  };
};

function formatAccuracy(value: number): string {
  return value.toFixed(2);
}

function resolveSummaryPath(repoRoot: string): string {
  const envPath = process.env.GUARDRAIL_SUMMARY_PATH?.trim();

  if (!envPath) {
    return path.join(repoRoot, "playground", "outputs", "summary.md");
  }

  return path.isAbsolute(envPath) ? envPath : path.join(repoRoot, envPath);
}

function buildFailurePatterns(failCases: FailCase[]): string {
  if (failCases.length === 0) {
    return "없음";
  }

  const counts = new Map<string, number>();

  for (const failCase of failCases) {
    if (!failCase.diff.risk_level_match) {
      const key = `risk ${failCase.expected.risk_level} -> ${failCase.actual.risk_level}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    if (!failCase.diff.guardrail_mode_match) {
      const key = `mode ${failCase.expected.guardrail_mode} -> ${failCase.actual.guardrail_mode}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([pattern, count]) => `${pattern} (${count}건)`)
    .join(", ");
}

function upsertGuardrailSection(summaryMarkdown: string, sectionBody: string): string {
  const heading = "## Guardrail Evaluation";
  const section = `${heading}\n\n${sectionBody.trim()}\n`;
  const existingSectionPattern =
    /(?:^|\n)## Guardrail Evaluation\n[\s\S]*?(?=\n## [^\n]+|\s*$)/;

  if (existingSectionPattern.test(summaryMarkdown)) {
    return summaryMarkdown.replace(existingSectionPattern, `\n${section}`);
  }

  const trimmed = summaryMarkdown.trimEnd();
  return `${trimmed}\n\n${section}`;
}

async function main() {
  const repoRoot = process.cwd();
  const datasetPath = path.join(repoRoot, "data", "guardrail_dataset.jsonl");
  const outputsRoot = path.join(repoRoot, "outputs");
  const casesOutputDir = path.join(outputsRoot, "guardrail_eval_cases");
  const summaryOutputPath = path.join(outputsRoot, "guardrail_eval_summary.json");
  const summaryMarkdownPath = resolveSummaryPath(repoRoot);

  await mkdir(casesOutputDir, { recursive: true });
  await mkdir(path.dirname(summaryMarkdownPath), { recursive: true });

  const rawDataset = await readFile(datasetPath, "utf8");
  const datasetCases = rawDataset
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as GuardrailDatasetCase);

  const seenIds = new Set<string>();
  let riskMatches = 0;
  let modeMatches = 0;
  const failCases: FailCase[] = [];

  for (const item of datasetCases) {
    if (seenIds.has(item.id)) {
      throw new Error(`Duplicate case id found in dataset: ${item.id}`);
    }

    seenIds.add(item.id);

    const actual = evaluateGuardrailInput(item.input);
    const expectedRiskLevel = normalizeRiskLevel(item.expected.risk_level);
    const expectedMode = normalizeGuardrailMode(item.expected.guardrail_mode);
    const riskLevelMatch = expectedRiskLevel === actual.risk_level;
    const guardrailModeMatch = expectedMode === actual.guardrail_mode;

    if (riskLevelMatch) {
      riskMatches += 1;
    }

    if (guardrailModeMatch) {
      modeMatches += 1;
    }

    const caseOutput = {
      input: item.input,
      expected: {
        risk_level: expectedRiskLevel,
        guardrail_mode: expectedMode,
        reason: item.expected.reason,
      },
      actual,
      diff: {
        risk_level_match: riskLevelMatch,
        guardrail_mode_match: guardrailModeMatch,
      },
    };

    await writeFile(
      path.join(casesOutputDir, `${item.id}.json`),
      `${JSON.stringify(caseOutput, null, 2)}\n`,
      "utf8",
    );

    if (!riskLevelMatch || !guardrailModeMatch) {
      failCases.push({
        id: item.id,
        expected: {
          risk_level: expectedRiskLevel,
          guardrail_mode: expectedMode,
        },
        actual: {
          risk_level: actual.risk_level,
          guardrail_mode: actual.guardrail_mode,
          raw_guardrail_mode: actual.raw_guardrail_mode,
          triggers: actual.guardrail_result.triggers,
        },
        diff: {
          risk_level_match: riskLevelMatch,
          guardrail_mode_match: guardrailModeMatch,
        },
      });
    }
  }

  const total = datasetCases.length;
  const riskAccuracy = total === 0 ? 0 : riskMatches / total;
  const modeAccuracy = total === 0 ? 0 : modeMatches / total;
  const summary = {
    total,
    risk_accuracy: Number(formatAccuracy(riskAccuracy)),
    mode_accuracy: Number(formatAccuracy(modeAccuracy)),
    fail_cases: failCases,
  };

  await writeFile(summaryOutputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  let existingSummary = "";
  try {
    existingSummary = await readFile(summaryMarkdownPath, "utf8");
  } catch {
    existingSummary = "# Summary\n";
  }

  const failurePatterns = buildFailurePatterns(failCases);
  const summarySection = [
    `- risk accuracy: ${formatAccuracy(riskAccuracy)}`,
    `- mode accuracy: ${formatAccuracy(modeAccuracy)}`,
    `- 주요 실패 패턴: ${failurePatterns}`,
  ].join("\n");

  const updatedSummary = upsertGuardrailSection(existingSummary, summarySection);
  await writeFile(summaryMarkdownPath, `${updatedSummary.trimEnd()}\n`, "utf8");

  console.info(`Evaluated ${total} guardrail cases.`);
  console.info(`Created ${path.relative(repoRoot, summaryOutputPath)}`);
  console.info(`Updated ${path.relative(repoRoot, summaryMarkdownPath)}`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
