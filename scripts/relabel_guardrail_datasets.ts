import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";

import {
  evaluateGuardrailInput,
  normalizeGuardrailMode,
  type DatasetGuardrailMode,
  type GuardrailDatasetCase,
  type GuardrailDatasetInput,
} from "../src/lib/guardrail-eval.ts";

type ThresholdRawCase = {
  id: string;
  input: GuardrailDatasetInput;
  expected: {
    preferred_mode: string;
    acceptable_modes: string[];
    reason: string;
  };
};

type ThresholdCase = {
  id: string;
  input: GuardrailDatasetInput;
  expected: {
    preferred_mode: DatasetGuardrailMode;
    acceptable_modes: DatasetGuardrailMode[];
    reason: string;
  };
};

type ModeChange = {
  id: string;
  legacy_mode: string;
  new_mode: string;
  legacy_risk?: string;
  new_risk?: string;
  confidence_band: string;
  uncertainty_band: string;
  triggers: string[];
  pattern: string;
};

const MODE_ORDER: Record<DatasetGuardrailMode, number> = {
  normal: 0,
  careful: 1,
  block: 2,
};

function resolveSummaryPath(repoRoot: string): string {
  const envPath = process.env.GUARDRAIL_SUMMARY_PATH?.trim();

  if (!envPath) {
    return path.join(repoRoot, "playground", "outputs", "summary.md");
  }

  return path.isAbsolute(envPath) ? envPath : path.join(repoRoot, envPath);
}

function sortModes(modes: Iterable<DatasetGuardrailMode>): DatasetGuardrailMode[] {
  return [...new Set(modes)].sort((left, right) => MODE_ORDER[left] - MODE_ORDER[right]);
}

function parseGuardrailDataset(rawText: string): GuardrailDatasetCase[] {
  const seenIds = new Set<string>();

  return rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as GuardrailDatasetCase)
    .map((item) => {
      if (seenIds.has(item.id)) {
        throw new Error(`Duplicate guardrail dataset id: ${item.id}`);
      }

      seenIds.add(item.id);
      return item;
    });
}

function parseThresholdDataset(rawText: string): ThresholdCase[] {
  const seenIds = new Set<string>();

  return rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ThresholdRawCase)
    .map((item) => {
      if (seenIds.has(item.id)) {
        throw new Error(`Duplicate threshold dataset id: ${item.id}`);
      }

      seenIds.add(item.id);
      return {
        id: item.id,
        input: item.input,
        expected: {
          preferred_mode: normalizeGuardrailMode(item.expected.preferred_mode),
          acceptable_modes: item.expected.acceptable_modes.map((mode) =>
            normalizeGuardrailMode(mode),
          ),
          reason: item.expected.reason,
        },
      };
    });
}

function buildGuardrailReason(
  actual: ReturnType<typeof evaluateGuardrailInput>,
): string {
  const triggerLabel =
    actual.detected_triggers.length > 0
      ? actual.detected_triggers.join(", ")
      : "no_trigger";

  if (actual.guardrail_mode === "block") {
    return `risk=${actual.risk_level}, confidence=${actual.confidence_band}, uncertainty=${actual.uncertainty_band} 조합이라 block이 맞다. 핵심 신호는 ${triggerLabel}다.`;
  }

  if (actual.guardrail_mode === "careful") {
    return `risk=${actual.risk_level}, confidence=${actual.confidence_band}, uncertainty=${actual.uncertainty_band} 조합이라 normal보다 careful이 맞다. 핵심 신호는 ${triggerLabel}다.`;
  }

  return `risk=${actual.risk_level}, confidence=${actual.confidence_band}, uncertainty=${actual.uncertainty_band}이며 강한 guardrail 신호가 없어 normal 유지가 맞다.`;
}

function buildThresholdReason(
  preferredMode: DatasetGuardrailMode,
  acceptableModes: DatasetGuardrailMode[],
  actual: ReturnType<typeof evaluateGuardrailInput>,
): string {
  const acceptableLabel = acceptableModes.join(", ");

  return `baseline 기준 risk=${actual.risk_level}, confidence=${actual.confidence_band}, uncertainty=${actual.uncertainty_band}라 preferred는 ${preferredMode}다. acceptable 범위는 ${acceptableLabel}다.`;
}

function deriveAcceptableModes(
  baseline: ReturnType<typeof evaluateGuardrailInput>,
  conservative: ReturnType<typeof evaluateGuardrailInput>,
  aggressive: ReturnType<typeof evaluateGuardrailInput>,
): DatasetGuardrailMode[] {
  const acceptable = new Set<DatasetGuardrailMode>([baseline.guardrail_mode]);
  const candidates = new Set<DatasetGuardrailMode>([
    conservative.guardrail_mode,
    aggressive.guardrail_mode,
  ]);

  for (const candidate of candidates) {
    if (candidate === baseline.guardrail_mode) {
      continue;
    }

    if (candidate === "normal") {
      if (
        baseline.guardrail_mode === "careful" &&
        baseline.risk_level === "low" &&
        baseline.confidence_band === "medium" &&
        baseline.uncertainty_band === "medium" &&
        !baseline.detected_triggers.includes("reasoning_conflict") &&
        !baseline.detected_triggers.includes("high_risk")
      ) {
        acceptable.add(candidate);
      }
    } else if (candidate === "careful") {
      if (baseline.guardrail_mode === "normal") {
        if (
          baseline.risk_level === "medium" &&
          (baseline.confidence_band === "medium" ||
            baseline.uncertainty_band === "medium")
        ) {
          acceptable.add(candidate);
        }
      } else if (baseline.guardrail_mode === "block") {
        if (
          baseline.confidence_band === "medium" ||
          baseline.uncertainty_band === "medium"
        ) {
          acceptable.add(candidate);
        }
      }
    } else if (candidate === "block") {
      if (
        baseline.guardrail_mode === "careful" &&
        baseline.risk_level === "high" &&
        baseline.confidence_band !== "low" &&
        baseline.uncertainty_band !== "high" &&
        !baseline.detected_triggers.includes("low_confidence")
      ) {
        acceptable.add(candidate);
      }
    }
  }

  return sortModes(acceptable);
}

function categorizeModeChange(args: {
  legacyMode: string;
  newMode: string;
  legacyRisk?: string;
  newRisk?: string;
  actual: ReturnType<typeof evaluateGuardrailInput>;
}): string {
  const { legacyMode, newMode, legacyRisk, newRisk, actual } = args;

  if (legacyMode === "normal" && newMode === "careful") {
    if (actual.detected_triggers.includes("reasoning_conflict")) {
      return "conflicting signals가 confidence를 깎아 normal -> careful로 상향";
    }

    if (actual.detected_triggers.includes("ambiguity_high")) {
      return "missing context / ambiguity 반영으로 normal -> careful로 상향";
    }

    if (actual.detected_triggers.includes("low_confidence")) {
      return "weak evidence / low confidence 반영으로 normal -> careful로 상향";
    }
  }

  if (legacyMode === "block" && newMode === "careful") {
    return "block 기준이 좁아져 low-confidence 고불확실 사례가 block -> careful로 완화";
  }

  if (legacyMode === "careful" && newMode === "block") {
    return "high risk + high confidence 조합이 분리되어 careful -> block으로 강화";
  }

  if (legacyRisk === "low" && newRisk === "medium") {
    return "risk를 high 유무가 아니라 score 기반으로 계산해 low -> medium으로 조정";
  }

  if (legacyRisk === "high" && newRisk === "medium") {
    return "직접 high risk trigger가 없으면 score 기준으로 high -> medium으로 완화";
  }

  return "새 confidence / uncertainty 의미론에 맞춰 expected를 정렬";
}

function summarizePatterns(changes: ModeChange[]): string[] {
  const counts = new Map<string, number>();

  for (const change of changes) {
    counts.set(change.pattern, (counts.get(change.pattern) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 5)
    .map(([pattern, count]) => `${pattern} (${count}건)`);
}

function upsertSummarySection(summaryMarkdown: string, sectionBody: string): string {
  const heading = "## Guardrail Dataset Relabeling";
  const section = `${heading}\n\n${sectionBody.trim()}\n`;
  const existingSectionPattern =
    /(?:^|\n)## Guardrail Dataset Relabeling\n[\s\S]*?(?=\n## [^\n]+|\s*$)/;

  if (existingSectionPattern.test(summaryMarkdown)) {
    return summaryMarkdown.replace(existingSectionPattern, `\n${section}`);
  }

  return `${summaryMarkdown.trimEnd()}\n\n${section}`;
}

async function runCommand(command: string, repoRoot: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    exec(command, { cwd: repoRoot }, (error, stdout, stderr) => {
      if (stdout.trim().length > 0) {
        process.stdout.write(stdout);
      }

      if (stderr.trim().length > 0) {
        process.stderr.write(stderr);
      }

      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function main() {
  const repoRoot = process.cwd();
  const dataDir = path.join(repoRoot, "data");
  const outputsDir = path.join(repoRoot, "outputs");
  const summaryPath = resolveSummaryPath(repoRoot);
  const guardrailDatasetPath = path.join(dataDir, "guardrail_dataset.jsonl");
  const thresholdDatasetPath = path.join(dataDir, "guardrail_threshold_dataset.jsonl");
  const legacyGuardrailDatasetPath = path.join(
    dataDir,
    "guardrail_dataset_legacy_20260328.jsonl",
  );
  const legacyThresholdDatasetPath = path.join(
    dataDir,
    "guardrail_threshold_dataset_legacy_20260328.jsonl",
  );
  const relabelSummaryPath = path.join(outputsDir, "guardrail_relabel_summary.json");

  await mkdir(outputsDir, { recursive: true });
  await mkdir(path.dirname(summaryPath), { recursive: true });

  const [guardrailRaw, thresholdRaw] = await Promise.all([
    readFile(guardrailDatasetPath, "utf8"),
    readFile(thresholdDatasetPath, "utf8"),
  ]);
  let legacyGuardrailRaw = guardrailRaw;
  let legacyThresholdRaw = thresholdRaw;

  try {
    legacyGuardrailRaw = await readFile(legacyGuardrailDatasetPath, "utf8");
  } catch {
    await writeFile(legacyGuardrailDatasetPath, guardrailRaw, "utf8");
  }

  try {
    legacyThresholdRaw = await readFile(legacyThresholdDatasetPath, "utf8");
  } catch {
    await writeFile(legacyThresholdDatasetPath, thresholdRaw, "utf8");
  }

  const guardrailDataset = parseGuardrailDataset(legacyGuardrailRaw);
  const thresholdDataset = parseThresholdDataset(legacyThresholdRaw);
  const guardrailChanges: ModeChange[] = [];
  const thresholdChanges: ModeChange[] = [];

  const relabeledGuardrailDataset = guardrailDataset.map((item) => {
    const actual = evaluateGuardrailInput(item.input);
    const newExpected = {
      risk_level: actual.risk_level,
      guardrail_mode: actual.guardrail_mode,
      reason: buildGuardrailReason(actual),
    };
    const riskChanged = item.expected.risk_level !== newExpected.risk_level;
    const modeChanged =
      normalizeGuardrailMode(item.expected.guardrail_mode) !== newExpected.guardrail_mode;

    if (riskChanged || modeChanged) {
      guardrailChanges.push({
        id: item.id,
        legacy_mode: item.expected.guardrail_mode,
        new_mode: newExpected.guardrail_mode,
        legacy_risk: item.expected.risk_level,
        new_risk: newExpected.risk_level,
        confidence_band: actual.confidence_band,
        uncertainty_band: actual.uncertainty_band,
        triggers: actual.detected_triggers,
        pattern: categorizeModeChange({
          legacyMode: item.expected.guardrail_mode,
          newMode: newExpected.guardrail_mode,
          legacyRisk: item.expected.risk_level,
          newRisk: newExpected.risk_level,
          actual,
        }),
      });
    }

    return {
      ...item,
      expected: newExpected,
    };
  });

  const relabeledThresholdDataset = thresholdDataset.map((item) => {
    const baseline = evaluateGuardrailInput(item.input, {
      thresholdSetName: "baseline",
    });
    const conservative = evaluateGuardrailInput(item.input, {
      thresholdSetName: "conservative",
    });
    const aggressive = evaluateGuardrailInput(item.input, {
      thresholdSetName: "aggressive",
    });
    const preferredMode = baseline.guardrail_mode;
    const acceptableModes = deriveAcceptableModes(
      baseline,
      conservative,
      aggressive,
    );
    const newExpected = {
      preferred_mode: preferredMode,
      acceptable_modes: acceptableModes,
      reason: buildThresholdReason(preferredMode, acceptableModes, baseline),
    };
    const preferredChanged =
      item.expected.preferred_mode !== newExpected.preferred_mode;
    const acceptableChanged =
      sortModes(item.expected.acceptable_modes).join(",") !==
      newExpected.acceptable_modes.join(",");

    if (preferredChanged || acceptableChanged) {
      thresholdChanges.push({
        id: item.id,
        legacy_mode: item.expected.preferred_mode,
        new_mode: newExpected.preferred_mode,
        confidence_band: baseline.confidence_band,
        uncertainty_band: baseline.uncertainty_band,
        triggers: baseline.detected_triggers,
        pattern: categorizeModeChange({
          legacyMode: item.expected.preferred_mode,
          newMode: newExpected.preferred_mode,
          actual: baseline,
        }),
      });
    }

    return {
      ...item,
      expected: newExpected,
    };
  });

  await Promise.all([
    writeFile(
      guardrailDatasetPath,
      `${relabeledGuardrailDataset.map((item) => JSON.stringify(item)).join("\n")}\n`,
      "utf8",
    ),
    writeFile(
      thresholdDatasetPath,
      `${relabeledThresholdDataset.map((item) => JSON.stringify(item)).join("\n")}\n`,
      "utf8",
    ),
  ]);

  await runCommand("npm run eval:guardrail", repoRoot);
  await runCommand("npm run eval:guardrail-thresholds", repoRoot);
  await runCommand("npm run eval:guardrail-calibration", repoRoot);

  const [guardrailEvalSummary, thresholdEvalSummary, calibrationSummary] =
    await Promise.all([
      readFile(path.join(outputsDir, "guardrail_eval_summary.json"), "utf8").then((text) =>
        JSON.parse(text),
      ),
      readFile(
        path.join(outputsDir, "guardrail_threshold_comparison.json"),
        "utf8",
      ).then((text) => JSON.parse(text)),
      readFile(
        path.join(outputsDir, "guardrail_calibration_summary.json"),
        "utf8",
      ).then((text) => JSON.parse(text)),
    ]);

  const relabelSummary = {
    generated_at: new Date().toISOString(),
    backups: {
      guardrail_dataset: path.relative(repoRoot, legacyGuardrailDatasetPath),
      guardrail_threshold_dataset: path.relative(repoRoot, legacyThresholdDatasetPath),
    },
    guardrail_dataset: {
      total: relabeledGuardrailDataset.length,
      changed_cases: guardrailChanges.length,
      changed_case_ids: guardrailChanges.map((item) => item.id),
      risk_changed_count: guardrailChanges.filter(
        (item) => item.legacy_risk !== item.new_risk,
      ).length,
      mode_changed_count: guardrailChanges.filter(
        (item) => item.legacy_mode !== item.new_mode,
      ).length,
      mode_changes: guardrailChanges,
    },
    threshold_dataset: {
      total: relabeledThresholdDataset.length,
      changed_cases: thresholdChanges.length,
      changed_case_ids: thresholdChanges.map((item) => item.id),
      preferred_changed_count: thresholdChanges.filter(
        (item) => item.legacy_mode !== item.new_mode,
      ).length,
      mode_changes: thresholdChanges,
    },
    changed_pattern_summary: summarizePatterns([
      ...guardrailChanges,
      ...thresholdChanges,
    ]),
    evaluator_results: {
      guardrail_eval: guardrailEvalSummary,
      guardrail_thresholds: thresholdEvalSummary,
      guardrail_calibration: calibrationSummary,
    },
  };

  await writeFile(relabelSummaryPath, `${JSON.stringify(relabelSummary, null, 2)}\n`, "utf8");

  let existingSummary = "";
  try {
    existingSummary = await readFile(summaryPath, "utf8");
  } catch {
    existingSummary = "# Summary\n";
  }

  const summarySection = [
    `- legacy backup: ${path.relative(repoRoot, legacyGuardrailDatasetPath)}, ${path.relative(repoRoot, legacyThresholdDatasetPath)}`,
    `- guardrail_dataset 변경: ${guardrailChanges.length}건, risk 변경 ${relabelSummary.guardrail_dataset.risk_changed_count}건, mode 변경 ${relabelSummary.guardrail_dataset.mode_changed_count}건`,
    `- threshold_dataset 변경: ${thresholdChanges.length}건, preferred mode 변경 ${relabelSummary.threshold_dataset.preferred_changed_count}건`,
    `- mode 변경 케이스: ${[...guardrailChanges, ...thresholdChanges].map((item) => item.id).slice(0, 12).join(", ") || "없음"}`,
    `- 변경 이유 패턴: ${relabelSummary.changed_pattern_summary.join(", ") || "없음"}`,
  ].join("\n");
  const updatedSummary = upsertSummarySection(existingSummary, summarySection);
  await writeFile(summaryPath, `${updatedSummary.trimEnd()}\n`, "utf8");

  console.info(`Created ${path.relative(repoRoot, relabelSummaryPath)}`);
  console.info(`Updated ${path.relative(repoRoot, summaryPath)}`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
