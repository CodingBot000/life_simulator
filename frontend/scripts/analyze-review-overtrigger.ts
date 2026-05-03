import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { readJsonArtifacts } from "../src/lib/logger/logStore.ts";
import type { RequestLog } from "../src/lib/types.ts";

type SeedCase = {
  id: string;
  category: string;
  input: {
    decision: {
      context: string;
    };
  };
};

type DirectReviewGate =
  | "blocked_combo"
  | "high_risk"
  | "medium_risk_high_confidence"
  | "high_uncertainty"
  | "threshold_score_gate"
  | "low_confidence_medium_risk"
  | "normal";

type ReviewReasonBucket =
  | "medium_risk"
  | "conflict"
  | "low_confidence"
  | "composite";

type CaseAnalysis = {
  seed_id: string;
  category: string;
  query: string;
  decision: string;
  risk_level: string;
  confidence_score: number;
  uncertainty_score: number;
  threshold_score: number;
  careful_cutoff: number;
  block_cutoff: number;
  triggers: string[];
  reason_bucket: ReviewReasonBucket;
  dimensions: {
    medium_risk: boolean;
    conflict: boolean;
    low_confidence: boolean;
    composite: boolean;
  };
  base_rule_hits: {
    high_risk: boolean;
    medium_risk_high_confidence: boolean;
    high_uncertainty: boolean;
    threshold_score_gate: boolean;
    low_confidence_medium_risk: boolean;
    blocked_combo: boolean;
  };
  v2_rule_hits: {
    calibration_floor: boolean;
    medium_risk_strengthening: boolean;
    force_block_candidate: boolean;
  };
  ambiguity_sources: {
    state_unknown: boolean;
    low_final_confidence: boolean;
    ambiguous_wording_regex: boolean;
  };
  base_mode: string;
  final_mode: string;
  v2_changed_outcome: boolean;
  direct_review_gate: DirectReviewGate;
  why_review: string;
};

type TopRule = {
  rank: number;
  rule_id: string;
  support_count: number;
  direct_gate_count: number;
  explanation: string;
};

type AnalysisReport = {
  generated_at: string;
  threshold_version: string;
  total_review_cases: number;
  summary: {
    base_only_review_count: number;
    v2_changed_outcome_count: number;
    review_reason_bucket_counts: Record<ReviewReasonBucket, number>;
    rule_dimension_counts: {
      medium_risk: number;
      conflict: number;
      low_confidence: number;
      composite: number;
    };
    trigger_counts: Record<string, number>;
    base_rule_support_counts: Record<string, number>;
    direct_review_gate_counts: Record<DirectReviewGate, number>;
    v2_rule_support_counts: {
      calibration_floor: number;
      medium_risk_strengthening: number;
      force_block_candidate: number;
    };
    ambiguity_trigger_breakdown: {
      ambiguity_high_count: number;
      by_state_unknown: number;
      by_low_final_confidence: number;
      by_ambiguous_wording_regex: number;
    };
    score_distribution: {
      confidence_lt_0_2: number;
      confidence_0_2_to_0_4: number;
      confidence_ge_0_4: number;
      uncertainty_ge_0_9: number;
      uncertainty_0_66_to_0_9: number;
      uncertainty_lt_0_66: number;
    };
    top_overreview_rules: TopRule[];
    candidate_allow_restore_pool: {
      phase1_conflict_only_medium: string[];
      highest_priority: string[];
    };
    constraints: string[];
  };
  cases: CaseAnalysis[];
};

const OUTPUT_DIR = path.join(process.cwd(), "outputs", "monitoring");
const OUTPUT_JSON_PATH = path.join(
  OUTPUT_DIR,
  "review-overtrigger-analysis.json",
);
const OUTPUT_MD_PATH = path.join(
  OUTPUT_DIR,
  "baseline-v3-proposal.md",
);
const SEED_INPUT_PATH = path.join(process.cwd(), "scripts", "seed-inputs.json");
const TARGET_THRESHOLD_VERSION = "guardrail-threshold-set:baseline-v2";

function round(value: number): number {
  return Number(value.toFixed(4));
}

function incrementCounter(
  counter: Record<string, number>,
  key: string,
) {
  counter[key] = (counter[key] ?? 0) + 1;
}

async function readSeedCases(): Promise<SeedCase[]> {
  const raw = await readFile(SEED_INPUT_PATH, "utf8");
  return JSON.parse(raw) as SeedCase[];
}

function getLatestBySeed(
  seedCases: SeedCase[],
  requestLogs: RequestLog[],
): Map<string, { seed: SeedCase; requestLog: RequestLog }> {
  const seedByContext = new Map(
    seedCases.map((seedCase) => [seedCase.input.decision.context, seedCase]),
  );
  const latestBySeed = new Map<string, { seed: SeedCase; requestLog: RequestLog }>();

  for (const requestLog of requestLogs.sort((left, right) =>
    left.timestamp.localeCompare(right.timestamp),
  )) {
    const seedCase = seedByContext.get(requestLog.input.user_query);

    if (!seedCase) {
      continue;
    }

    latestBySeed.set(seedCase.id, {
      seed: seedCase,
      requestLog,
    });
  }

  return latestBySeed;
}

function computeBaseMode(raw: RequestLog["guardrail"]["guardrail_raw"]): string {
  const isHighRisk = raw.risk_score >= 0.75;
  const isMediumRisk = raw.risk_level === "medium";
  const isHighConfidence = raw.confidence_score >= 0.72;
  const isLowConfidence = raw.confidence_score < 0.42;
  const severeAmbiguityConflict =
    raw.reasoning_signals.conflicting_signals &&
    raw.reasoning_signals.missing_context &&
    raw.confidence_score >= 0.45 &&
    raw.threshold_score >= raw.effective_thresholds.blockMin &&
    (isMediumRisk || raw.uncertainty_score >= 0.75);

  if (
    (isHighRisk && isHighConfidence && raw.uncertainty_score < 0.45) ||
    severeAmbiguityConflict
  ) {
    return "blocked";
  }

  if (
    isHighRisk ||
    (isMediumRisk && isHighConfidence) ||
    raw.uncertainty_score >= 0.66 ||
    raw.threshold_score >= raw.effective_thresholds.carefulMin ||
    (isLowConfidence && isMediumRisk)
  ) {
    return "cautious";
  }

  return "normal";
}

function getDirectReviewGate(
  raw: RequestLog["guardrail"]["guardrail_raw"],
): DirectReviewGate {
  const isHighRisk = raw.risk_score >= 0.75;
  const isMediumRisk = raw.risk_level === "medium";
  const isHighConfidence = raw.confidence_score >= 0.72;
  const isLowConfidence = raw.confidence_score < 0.42;
  const blockedCombo =
    (isHighRisk && isHighConfidence && raw.uncertainty_score < 0.45) ||
    (raw.reasoning_signals.conflicting_signals &&
      raw.reasoning_signals.missing_context &&
      raw.confidence_score >= 0.45 &&
      raw.threshold_score >= raw.effective_thresholds.blockMin &&
      (isMediumRisk || raw.uncertainty_score >= 0.75));

  if (blockedCombo) {
    return "blocked_combo";
  }

  if (isHighRisk) {
    return "high_risk";
  }

  if (isMediumRisk && isHighConfidence) {
    return "medium_risk_high_confidence";
  }

  if (raw.uncertainty_score >= 0.66) {
    return "high_uncertainty";
  }

  if (raw.threshold_score >= raw.effective_thresholds.carefulMin) {
    return "threshold_score_gate";
  }

  if (isLowConfidence && isMediumRisk) {
    return "low_confidence_medium_risk";
  }

  return "normal";
}

function getReasonBucket(
  raw: RequestLog["guardrail"]["guardrail_raw"],
): ReviewReasonBucket {
  const mediumRisk = raw.risk_level === "medium";
  const conflict = raw.detected_triggers.includes("reasoning_conflict");
  const lowConfidence = raw.detected_triggers.includes("low_confidence");
  const activeCount = [mediumRisk, conflict, lowConfidence].filter(Boolean).length;

  if (activeCount >= 2) {
    return "composite";
  }

  if (mediumRisk) {
    return "medium_risk";
  }

  if (conflict) {
    return "conflict";
  }

  return "low_confidence";
}

function buildWhyReview(caseAnalysis: Omit<CaseAnalysis, "why_review">): string {
  const reasons: string[] = [];

  if (caseAnalysis.base_rule_hits.high_risk) {
    reasons.push("baseline base rule에서 high risk가 먼저 cautious를 만든다");
  }

  if (caseAnalysis.base_rule_hits.high_uncertainty) {
    reasons.push("uncertainty >= 0.66이 직접 review gate로 작동한다");
  }

  if (caseAnalysis.base_rule_hits.threshold_score_gate) {
    reasons.push(
      `threshold_score ${caseAnalysis.threshold_score} >= careful_cutoff ${caseAnalysis.careful_cutoff}라서 conflict score만으로도 review 경로가 열린다`,
    );
  }

  if (caseAnalysis.v2_rule_hits.calibration_floor) {
    reasons.push("v2 calibration floor(confidence < 0.6)가 allow 복귀를 막는다");
  }

  if (caseAnalysis.v2_rule_hits.medium_risk_strengthening) {
    reasons.push("medium-risk strengthening rule이 보조적으로 적용된다");
  }

  if (
    caseAnalysis.ambiguity_sources.ambiguous_wording_regex &&
    caseAnalysis.triggers.includes("ambiguity_high")
  ) {
    reasons.push("generated risk/scenario text의 ambiguity regex가 ambiguity_high를 보강한다");
  }

  return reasons.join("; ");
}

function buildCaseAnalysis(params: {
  seed: SeedCase;
  requestLog: RequestLog;
}): CaseAnalysis {
  const raw = params.requestLog.guardrail.guardrail_raw;
  const mediumRisk = raw.risk_level === "medium";
  const conflict = raw.detected_triggers.includes("reasoning_conflict");
  const lowConfidenceTrigger = raw.detected_triggers.includes("low_confidence");
  const lowConfidenceBand = raw.confidence_score < 0.6;
  const composite = [mediumRisk, conflict, lowConfidenceTrigger].filter(Boolean).length >= 2;
  const baseRuleHits = {
    high_risk: raw.risk_score >= 0.75,
    medium_risk_high_confidence:
      raw.risk_level === "medium" && raw.confidence_score >= 0.72,
    high_uncertainty: raw.uncertainty_score >= 0.66,
    threshold_score_gate:
      raw.threshold_score >= raw.effective_thresholds.carefulMin,
    low_confidence_medium_risk:
      raw.confidence_score < 0.42 && raw.risk_level === "medium",
    blocked_combo:
      (raw.risk_score >= 0.75 &&
        raw.confidence_score >= 0.72 &&
        raw.uncertainty_score < 0.45) ||
      (raw.reasoning_signals.conflicting_signals &&
        raw.reasoning_signals.missing_context &&
        raw.confidence_score >= 0.45 &&
        raw.threshold_score >= raw.effective_thresholds.blockMin &&
        (raw.risk_level === "medium" || raw.uncertainty_score >= 0.75)),
  };
  const v2RuleHits = {
    calibration_floor: raw.confidence_score < 0.6,
    medium_risk_strengthening:
      raw.risk_level === "medium" &&
      (raw.detected_triggers.includes("reasoning_conflict") ||
        raw.detected_triggers.includes("high_risk") ||
        raw.detected_triggers.includes("low_confidence") ||
        raw.confidence_score < 0.6 ||
        raw.confidence_score < 0.42),
    force_block_candidate:
      raw.risk_level === "medium" &&
      raw.detected_triggers.includes("reasoning_conflict") &&
      raw.detected_triggers.includes("high_risk") &&
      raw.confidence_score < 0.5 &&
      raw.threshold_score >= raw.effective_thresholds.blockMin,
  };
  const ambiguitySources = {
    state_unknown: raw.signals.state_unknown_count >= 2,
    low_final_confidence: raw.signals.final_confidence < 0.65,
    ambiguous_wording_regex: raw.reasoning_signals.ambiguous_wording,
  };
  const baseMode = computeBaseMode(raw);
  const finalMode = raw.raw_guardrail_mode;
  const caseAnalysis: Omit<CaseAnalysis, "why_review"> = {
    seed_id: params.seed.id,
    category: params.seed.category,
    query: params.requestLog.input.user_query,
    decision: params.requestLog.guardrail.guardrail_derived.decision,
    risk_level: raw.risk_level,
    confidence_score: round(raw.confidence_score),
    uncertainty_score: round(raw.uncertainty_score),
    threshold_score: round(raw.threshold_score),
    careful_cutoff: round(raw.effective_thresholds.carefulMin),
    block_cutoff: round(raw.effective_thresholds.blockMin),
    triggers: raw.detected_triggers,
    reason_bucket: getReasonBucket(raw),
    dimensions: {
      medium_risk: mediumRisk,
      conflict,
      low_confidence: lowConfidenceBand,
      composite,
    },
    base_rule_hits: baseRuleHits,
    v2_rule_hits: v2RuleHits,
    ambiguity_sources: ambiguitySources,
    base_mode: baseMode,
    final_mode: finalMode,
    v2_changed_outcome: baseMode !== finalMode,
    direct_review_gate: getDirectReviewGate(raw),
  };

  return {
    ...caseAnalysis,
    why_review: buildWhyReview(caseAnalysis),
  };
}

function buildTopRules(cases: CaseAnalysis[]): TopRule[] {
  const ruleDefs = [
    {
      rule_id: "baseline.threshold_score_gate_from_reasoning_conflict",
      support_count: cases.filter(
        (item) =>
          item.base_rule_hits.threshold_score_gate &&
          item.triggers.includes("reasoning_conflict"),
      ).length,
      direct_gate_count: cases.filter(
        (item) => item.direct_review_gate === "threshold_score_gate",
      ).length,
      explanation:
        "reasoning_conflict가 20/20에 존재하고 carefulMin=1이라 conflict score만으로도 review 경로가 열린다.",
    },
    {
      rule_id: "baseline_v2.calibration_floor_confidence_lt_0_6",
      support_count: cases.filter(
        (item) => item.v2_rule_hits.calibration_floor,
      ).length,
      direct_gate_count: cases.filter((item) => item.v2_changed_outcome).length,
      explanation:
        "confidence < 0.6 floor가 20/20에 걸려 allow 복구 여지를 모두 막는다. 현재 세트에서는 mode를 직접 바꾸진 않았지만 lock-in rule로 작동한다.",
    },
    {
      rule_id: "baseline.high_uncertainty_ge_0_66",
      support_count: cases.filter(
        (item) => item.base_rule_hits.high_uncertainty,
      ).length,
      direct_gate_count: cases.filter(
        (item) => item.direct_review_gate === "high_uncertainty",
      ).length,
      explanation:
        "uncertainty >= 0.66가 18/20에서 발생했고, 실제 direct review gate의 최다 원인이다.",
    },
  ];

  return ruleDefs.map((rule, index) => ({
    rank: index + 1,
    ...rule,
  }));
}

function buildMarkdown(report: AnalysisReport): string {
  const phase1 = report.summary.candidate_allow_restore_pool.phase1_conflict_only_medium;
  const highestPriority = report.summary.candidate_allow_restore_pool.highest_priority;

  return [
    "# Baseline-v3 Proposal",
    "",
    "## 핵심 관찰",
    `- baseline-v2 review 20건 중 ${report.summary.base_only_review_count}건은 v2 추가 규칙이 없어도 baseline base rule만으로 이미 review였다.`,
    `- reasoning_conflict는 20/20, calibration floor(confidence < 0.6)는 20/20, high_uncertainty는 18/20에 걸렸다.`,
    `- ambiguity_high는 19/20에서 발생했고, 이 중 ${report.summary.ambiguity_trigger_breakdown.by_ambiguous_wording_regex}건은 generated text의 ambiguity regex 영향도 포함한다.`,
    "",
    "## 상위 규칙 3개",
    ...report.summary.top_overreview_rules.map(
      (rule) =>
        `- ${rule.rank}. ${rule.rule_id}: support=${rule.support_count}, direct_gate=${rule.direct_gate_count}. ${rule.explanation}`,
    ),
    "",
    "## 해석",
    "- 과보수화의 직접 원인은 baseline-v2 추가 규칙보다 기존 base evaluator 쪽이 더 크다.",
    "- 특히 reasoning_conflict가 전 케이스에 깔린 상태에서 threshold gate가 너무 쉽게 열리고, confidence/uncertainty 스코어가 모두 safe band 아래로 떨어져 allow 후보가 사라졌다.",
    "- 따라서 baseline-v3는 threshold-only 조정보다 conflict/ambiguity/uncertainty 산식 보정이 우선이다.",
    "",
    "## baseline-v3 제안",
    "- `confidence < 0.6 => no allow` 정책은 유지한다. low_confidence_allow 금지는 계속 가져간다.",
    "- `reasoning_conflict` 단독으로는 review를 만들지 않도록 줄인다. 방법은 `escalationWeight 2 -> 1` 또는 conflict-only path에 별도 `carefulMin >= 3`를 두는 방식이 적절하다.",
    "- `medium risk strengthening`은 `confidence < 0.6` alone 조건을 제거하고, `low_confidence trigger` 또는 `ambiguity_high`가 동반될 때만 강화한다. 현재는 calibration floor와 중복된다.",
    "- ambiguity regex는 generated `scenario_text` / `risk_text`가 아니라 `user_input`과 user-context 텍스트에만 적용한다. 현재는 모델이 쓴 `불확실`, `애매` 같은 표현이 다시 ambiguity trigger를 증폭시킨다.",
    "- uncertainty / confidence 산식은 conflict, missing_context 패널티를 낮춰 conflict-only medium 케이스가 safe band(`confidence >= 0.62`, `uncertainty <= 0.38`)에 진입할 수 있게 보정한다.",
    "",
    "## allow 복구 후보",
    `- 1차 후보군: ${phase1.join(", ")}`,
    `- 최우선 후보: ${highestPriority.join(", ")}`,
    "- 위 후보들은 `high_risk`와 `low_confidence trigger`가 없어서 v3에서 가장 먼저 allow 복구 실험을 해볼 수 있다.",
    "- 반대로 high-risk 6건과 explicit low-confidence trigger 11건은 review/block 쪽에 남겨 두는 것이 underblocking 0 유지에 유리하다.",
    "",
  ].join("\n");
}

async function main() {
  const [seedCases, requestArtifacts] = await Promise.all([
    readSeedCases(),
    readJsonArtifacts<RequestLog>("request_logs"),
  ]);
  const requestLogs = requestArtifacts
    .map((artifact) => artifact.value)
    .filter((requestLog) => requestLog.versions.threshold_version === TARGET_THRESHOLD_VERSION);
  const latestBySeed = getLatestBySeed(seedCases, requestLogs);
  const reviewEntries = seedCases
    .map((seedCase) => latestBySeed.get(seedCase.id))
    .filter(
      (
        value,
      ): value is {
        seed: SeedCase;
        requestLog: RequestLog;
      } => value !== undefined,
    )
    .filter(
      (value) => value.requestLog.guardrail.guardrail_derived.decision === "review",
    );
  const cases = reviewEntries.map((value) => buildCaseAnalysis(value));
  const reviewReasonBucketCounts: Record<ReviewReasonBucket, number> = {
    medium_risk: 0,
    conflict: 0,
    low_confidence: 0,
    composite: 0,
  };
  const ruleDimensionCounts = {
    medium_risk: 0,
    conflict: 0,
    low_confidence: 0,
    composite: 0,
  };
  const triggerCounts: Record<string, number> = {};
  const baseRuleSupportCounts: Record<string, number> = {
    high_risk: 0,
    medium_risk_high_confidence: 0,
    high_uncertainty: 0,
    threshold_score_gate: 0,
    low_confidence_medium_risk: 0,
    blocked_combo: 0,
  };
  const directReviewGateCounts: Record<DirectReviewGate, number> = {
    blocked_combo: 0,
    high_risk: 0,
    medium_risk_high_confidence: 0,
    high_uncertainty: 0,
    threshold_score_gate: 0,
    low_confidence_medium_risk: 0,
    normal: 0,
  };
  const v2RuleSupportCounts = {
    calibration_floor: 0,
    medium_risk_strengthening: 0,
    force_block_candidate: 0,
  };
  const ambiguityTriggerBreakdown = {
    ambiguity_high_count: 0,
    by_state_unknown: 0,
    by_low_final_confidence: 0,
    by_ambiguous_wording_regex: 0,
  };
  const scoreDistribution = {
    confidence_lt_0_2: 0,
    confidence_0_2_to_0_4: 0,
    confidence_ge_0_4: 0,
    uncertainty_ge_0_9: 0,
    uncertainty_0_66_to_0_9: 0,
    uncertainty_lt_0_66: 0,
  };
  let baseOnlyReviewCount = 0;
  let v2ChangedOutcomeCount = 0;

  for (const item of cases) {
    incrementCounter(reviewReasonBucketCounts, item.reason_bucket);

    if (item.dimensions.medium_risk) {
      ruleDimensionCounts.medium_risk += 1;
    }

    if (item.dimensions.conflict) {
      ruleDimensionCounts.conflict += 1;
    }

    if (item.dimensions.low_confidence) {
      ruleDimensionCounts.low_confidence += 1;
    }

    if (item.dimensions.composite) {
      ruleDimensionCounts.composite += 1;
    }

    for (const trigger of item.triggers) {
      incrementCounter(triggerCounts, trigger);
    }

    for (const [key, value] of Object.entries(item.base_rule_hits)) {
      if (value) {
        incrementCounter(baseRuleSupportCounts, key);
      }
    }

    incrementCounter(directReviewGateCounts, item.direct_review_gate);

    if (item.v2_rule_hits.calibration_floor) {
      v2RuleSupportCounts.calibration_floor += 1;
    }

    if (item.v2_rule_hits.medium_risk_strengthening) {
      v2RuleSupportCounts.medium_risk_strengthening += 1;
    }

    if (item.v2_rule_hits.force_block_candidate) {
      v2RuleSupportCounts.force_block_candidate += 1;
    }

    if (item.triggers.includes("ambiguity_high")) {
      ambiguityTriggerBreakdown.ambiguity_high_count += 1;

      if (item.ambiguity_sources.state_unknown) {
        ambiguityTriggerBreakdown.by_state_unknown += 1;
      }

      if (item.ambiguity_sources.low_final_confidence) {
        ambiguityTriggerBreakdown.by_low_final_confidence += 1;
      }

      if (item.ambiguity_sources.ambiguous_wording_regex) {
        ambiguityTriggerBreakdown.by_ambiguous_wording_regex += 1;
      }
    }

    if (item.confidence_score < 0.2) {
      scoreDistribution.confidence_lt_0_2 += 1;
    } else if (item.confidence_score < 0.4) {
      scoreDistribution.confidence_0_2_to_0_4 += 1;
    } else {
      scoreDistribution.confidence_ge_0_4 += 1;
    }

    if (item.uncertainty_score >= 0.9) {
      scoreDistribution.uncertainty_ge_0_9 += 1;
    } else if (item.uncertainty_score >= 0.66) {
      scoreDistribution.uncertainty_0_66_to_0_9 += 1;
    } else {
      scoreDistribution.uncertainty_lt_0_66 += 1;
    }

    if (item.base_mode === item.final_mode) {
      baseOnlyReviewCount += 1;
    }

    if (item.v2_changed_outcome) {
      v2ChangedOutcomeCount += 1;
    }
  }

  const phase1ConflictOnlyMedium = cases
    .filter(
      (item) =>
        item.risk_level === "medium" &&
        !item.triggers.includes("high_risk") &&
        !item.triggers.includes("low_confidence"),
    )
    .map((item) => item.seed_id);
  const highestPriority = cases
    .filter((item) => item.seed_id === "case-01" || item.seed_id === "case-15")
    .map((item) => item.seed_id);
  const report: AnalysisReport = {
    generated_at: new Date().toISOString(),
    threshold_version: TARGET_THRESHOLD_VERSION,
    total_review_cases: cases.length,
    summary: {
      base_only_review_count: baseOnlyReviewCount,
      v2_changed_outcome_count: v2ChangedOutcomeCount,
      review_reason_bucket_counts: reviewReasonBucketCounts,
      rule_dimension_counts: ruleDimensionCounts,
      trigger_counts: triggerCounts,
      base_rule_support_counts: baseRuleSupportCounts,
      direct_review_gate_counts: directReviewGateCounts,
      v2_rule_support_counts: v2RuleSupportCounts,
      ambiguity_trigger_breakdown: ambiguityTriggerBreakdown,
      score_distribution: scoreDistribution,
      top_overreview_rules: buildTopRules(cases),
      candidate_allow_restore_pool: {
        phase1_conflict_only_medium: phase1ConflictOnlyMedium,
        highest_priority: highestPriority,
      },
      constraints: [
        "현재 20/20 모두 confidence < 0.6 이라 threshold-only 조정으로는 allow 복구가 불가능하다.",
        "현재 20/20 모두 base mode가 이미 cautious라 baseline-v2 추가 규칙은 결과를 바꾸기보다 review 상태를 기록/고착시키는 역할에 가깝다.",
        "underblocking 0을 유지하려면 high-risk 6건과 explicit low-confidence trigger 11건은 review/block 쪽에 남겨 두는 것이 안전하다.",
      ],
    },
    cases,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await Promise.all([
    writeFile(OUTPUT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(OUTPUT_MD_PATH, buildMarkdown(report), "utf8"),
  ]);

  console.log(`[analyze-review-overtrigger] wrote ${OUTPUT_JSON_PATH}`);
  console.log(`[analyze-review-overtrigger] wrote ${OUTPUT_MD_PATH}`);
  console.log(
    `[analyze-review-overtrigger] review_cases=${report.total_review_cases} base_only_review=${report.summary.base_only_review_count} v2_changed=${report.summary.v2_changed_outcome_count}`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[analyze-review-overtrigger] fatal: ${message}`);
  process.exitCode = 1;
});
