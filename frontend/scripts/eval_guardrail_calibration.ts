import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  compareGuardrailModes,
  evaluateGuardrailInput,
  normalizeGuardrailMode,
  normalizeRiskLevel,
  type DatasetGuardrailMode,
  type GuardrailCalibrationBand,
  type GuardrailDatasetInput,
} from "../src/lib/guardrail-eval.ts";

interface RawCalibrationCase {
  id: string;
  input: GuardrailDatasetInput;
  expected: {
    risk_level: string;
    preferred_mode: string;
    acceptable_modes: string[];
    expected_confidence_band: string;
    expected_uncertainty_band: string;
  };
}

interface CalibrationCase {
  id: string;
  input: GuardrailDatasetInput;
  expected: {
    risk_level: ReturnType<typeof normalizeRiskLevel>;
    preferred_mode: DatasetGuardrailMode;
    acceptable_modes: DatasetGuardrailMode[];
    expected_confidence_band: GuardrailCalibrationBand;
    expected_uncertainty_band: GuardrailCalibrationBand;
  };
}

interface CalibrationDiffSummary {
  risk_level_match: boolean;
  preferred_mode_match: boolean;
  acceptable_mode_match: boolean;
  confidence_band_match: boolean;
  uncertainty_band_match: boolean;
  confidence_band_status: "match" | "overconfident" | "underconfident";
  uncertainty_band_status: "match" | "higher_than_expected" | "lower_than_expected";
}

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
  const heading = "## Guardrail Confidence Calibration";
  const section = `${heading}\n\n${sectionBody.trim()}\n`;
  const existingSectionPattern =
    /(?:^|\n)## Guardrail Confidence Calibration\n[\s\S]*?(?=\n## [^\n]+|\s*$)/;

  if (existingSectionPattern.test(summaryMarkdown)) {
    return summaryMarkdown.replace(existingSectionPattern, `\n${section}`);
  }

  return `${summaryMarkdown.trimEnd()}\n\n${section}`;
}

function normalizeBand(value: string): GuardrailCalibrationBand {
  const normalized = value.trim().toLowerCase();

  if (normalized === "low" || normalized === "medium" || normalized === "high") {
    return normalized;
  }

  throw new Error(`Unsupported calibration band: ${value}`);
}

function compareBands(
  actual: GuardrailCalibrationBand,
  expected: GuardrailCalibrationBand,
): number {
  const order: Record<GuardrailCalibrationBand, number> = {
    low: 0,
    medium: 1,
    high: 2,
  };

  return order[actual] - order[expected];
}

function summarizeIds(
  cases: Array<{
    id: string;
  }>,
): string {
  if (cases.length === 0) {
    return "없음";
  }

  return cases.slice(0, 4).map((item) => item.id).join(", ");
}

function summarizeBorderlinePatterns(
  cases: Array<{
    actual: {
      detected_triggers: string[];
      risk_level: string;
      confidence_band: string;
      uncertainty_band: string;
    };
  }>,
): string {
  if (cases.length === 0) {
    return "없음";
  }

  const counts = new Map<string, number>();

  for (const item of cases) {
    const triggerLabel =
      item.actual.detected_triggers.length > 0
        ? item.actual.detected_triggers.join("+")
        : "no_trigger";
    const key = `${triggerLabel} / risk=${item.actual.risk_level} / conf=${item.actual.confidence_band} / unc=${item.actual.uncertainty_band}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([pattern, count]) => `${pattern} (${count}건)`)
    .join(", ");
}

function normalizeCase(rawCase: RawCalibrationCase): CalibrationCase {
  return {
    id: rawCase.id,
    input: rawCase.input,
    expected: {
      risk_level: normalizeRiskLevel(rawCase.expected.risk_level),
      preferred_mode: normalizeGuardrailMode(rawCase.expected.preferred_mode),
      acceptable_modes: rawCase.expected.acceptable_modes.map((mode) =>
        normalizeGuardrailMode(mode),
      ),
      expected_confidence_band: normalizeBand(
        rawCase.expected.expected_confidence_band,
      ),
      expected_uncertainty_band: normalizeBand(
        rawCase.expected.expected_uncertainty_band,
      ),
    },
  };
}

async function main() {
  const repoRoot = process.cwd();
  const datasetPath = path.join(
    repoRoot,
    "data",
    "guardrail_calibration_dataset.jsonl",
  );
  const outputsRoot = path.join(repoRoot, "outputs");
  const casesOutputDir = path.join(outputsRoot, "guardrail_calibration_cases");
  const summaryOutputPath = path.join(
    outputsRoot,
    "guardrail_calibration_summary.json",
  );
  const summaryMarkdownPath = resolveSummaryPath(repoRoot);

  await mkdir(casesOutputDir, { recursive: true });
  await mkdir(path.dirname(summaryMarkdownPath), { recursive: true });

  const rawDataset = await readFile(datasetPath, "utf8");
  const seenIds = new Set<string>();
  const datasetCases = rawDataset
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => normalizeCase(JSON.parse(line) as RawCalibrationCase))
    .map((item) => {
      if (seenIds.has(item.id)) {
        throw new Error(`Duplicate calibration case id found: ${item.id}`);
      }

      seenIds.add(item.id);
      return item;
    });

  let preferredModeMatches = 0;
  let acceptableModeMatches = 0;
  let confidenceBandMatches = 0;
  let uncertaintyBandMatches = 0;

  const overconfidentCases: Array<{
    id: string;
    expected_confidence_band: GuardrailCalibrationBand;
    actual_confidence_band: GuardrailCalibrationBand;
    actual_mode: DatasetGuardrailMode;
  }> = [];
  const underconfidentCases: Array<{
    id: string;
    expected_confidence_band: GuardrailCalibrationBand;
    actual_confidence_band: GuardrailCalibrationBand;
    actual_mode: DatasetGuardrailMode;
  }> = [];
  const borderlineCases: Array<{
    id: string;
    actual: {
      detected_triggers: string[];
      risk_level: string;
      confidence_band: string;
      uncertainty_band: string;
    };
  }> = [];

  for (const item of datasetCases) {
    const actual = evaluateGuardrailInput(item.input);
    const riskLevelMatch = actual.risk_level === item.expected.risk_level;
    const preferredModeMatch = actual.guardrail_mode === item.expected.preferred_mode;
    const acceptableModeMatch = item.expected.acceptable_modes.includes(
      actual.guardrail_mode,
    );
    const confidenceBandMatch =
      actual.confidence_band === item.expected.expected_confidence_band;
    const uncertaintyBandMatch =
      actual.uncertainty_band === item.expected.expected_uncertainty_band;
    const confidenceBandComparison = compareBands(
      actual.confidence_band,
      item.expected.expected_confidence_band,
    );
    const uncertaintyBandComparison = compareBands(
      actual.uncertainty_band,
      item.expected.expected_uncertainty_band,
    );

    if (preferredModeMatch) {
      preferredModeMatches += 1;
    }

    if (acceptableModeMatch) {
      acceptableModeMatches += 1;
    }

    if (confidenceBandMatch) {
      confidenceBandMatches += 1;
    }

    if (uncertaintyBandMatch) {
      uncertaintyBandMatches += 1;
    }

    if (confidenceBandComparison > 0) {
      overconfidentCases.push({
        id: item.id,
        expected_confidence_band: item.expected.expected_confidence_band,
        actual_confidence_band: actual.confidence_band,
        actual_mode: actual.guardrail_mode,
      });
    } else if (confidenceBandComparison < 0) {
      underconfidentCases.push({
        id: item.id,
        expected_confidence_band: item.expected.expected_confidence_band,
        actual_confidence_band: actual.confidence_band,
        actual_mode: actual.guardrail_mode,
      });
    }

    if (
      (!preferredModeMatch && acceptableModeMatch) ||
      !confidenceBandMatch ||
      !uncertaintyBandMatch
    ) {
      borderlineCases.push({
        id: item.id,
        actual: {
          detected_triggers: actual.detected_triggers,
          risk_level: actual.risk_level,
          confidence_band: actual.confidence_band,
          uncertainty_band: actual.uncertainty_band,
        },
      });
    }

    const diffSummary: CalibrationDiffSummary = {
      risk_level_match: riskLevelMatch,
      preferred_mode_match: preferredModeMatch,
      acceptable_mode_match: acceptableModeMatch,
      confidence_band_match: confidenceBandMatch,
      uncertainty_band_match: uncertaintyBandMatch,
      confidence_band_status:
        confidenceBandComparison > 0
          ? "overconfident"
          : confidenceBandComparison < 0
            ? "underconfident"
            : "match",
      uncertainty_band_status:
        uncertaintyBandComparison > 0
          ? "higher_than_expected"
          : uncertaintyBandComparison < 0
            ? "lower_than_expected"
            : "match",
    };

    await writeFile(
      path.join(casesOutputDir, `${item.id}.json`),
      `${JSON.stringify(
        {
          input: item.input,
          expected: item.expected,
          actual: {
            risk_level: actual.risk_level,
            risk_score: actual.risk_score,
            confidence_score: actual.confidence_score,
            confidence_band: actual.confidence_band,
            uncertainty_score: actual.uncertainty_score,
            uncertainty_band: actual.uncertainty_band,
            mode: actual.guardrail_mode,
            raw_mode: actual.raw_guardrail_mode,
            reasoning_signals: actual.reasoning_signals,
            detected_triggers: actual.detected_triggers,
            reason: actual.reason,
          },
          diff_summary: diffSummary,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
  }

  const total = datasetCases.length;
  const summary = {
    total,
    mode_accuracy: total === 0 ? 0 : formatRate(preferredModeMatches / total),
    acceptable_match_rate:
      total === 0 ? 0 : formatRate(acceptableModeMatches / total),
    confidence_band_match_rate:
      total === 0 ? 0 : formatRate(confidenceBandMatches / total),
    uncertainty_band_match_rate:
      total === 0 ? 0 : formatRate(uncertaintyBandMatches / total),
    overconfident_cases: overconfidentCases,
    underconfident_cases: underconfidentCases,
  };

  await writeFile(summaryOutputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  let existingSummary = "";
  try {
    existingSummary = await readFile(summaryMarkdownPath, "utf8");
  } catch {
    existingSummary = "# Summary\n";
  }

  const summarySection = [
    `- mode accuracy: ${summary.mode_accuracy}`,
    `- acceptable match rate: ${summary.acceptable_match_rate}`,
    `- confidence band accuracy: ${summary.confidence_band_match_rate}`,
    `- uncertainty band accuracy: ${summary.uncertainty_band_match_rate}`,
    `- overconfident 패턴: ${summarizeIds(overconfidentCases)}`,
    `- underconfident 패턴: ${summarizeIds(underconfidentCases)}`,
    `- 새로 발견된 borderline 특징: ${summarizeBorderlinePatterns(borderlineCases)}`,
  ].join("\n");

  const updatedSummary = upsertSummarySection(existingSummary, summarySection);
  await writeFile(summaryMarkdownPath, `${updatedSummary.trimEnd()}\n`, "utf8");

  console.info(`Evaluated ${total} guardrail calibration cases.`);
  console.info(`Created ${path.relative(repoRoot, summaryOutputPath)}`);
  console.info(`Updated ${path.relative(repoRoot, summaryMarkdownPath)}`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
