import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { readJsonArtifacts } from "../src/lib/logger/logStore.ts";
import { buildReevaluationMismatch } from "../src/lib/monitoring/metrics.ts";
import { getAnomalySources } from "../src/lib/monitoring/anomalyDetector.ts";
import type {
  AnomalyFlags,
  AnomalyQueueEntry,
  GuardrailDecision,
  ReEvaluationResult,
  RequestLog,
  RiskTolerance,
} from "../src/lib/types.ts";

type MismatchCategory =
  | "underblocking_related"
  | "overblocking_related"
  | "low_confidence_related"
  | "conflict_related"
  | "high_confidence_wrong"
  | "boundary_shift_only";

type MismatchCaseRecord = {
  request_id: string;
  reeval_path: string;
  request_log_path: string | null;
  queue_source_path: string | null;
  reevaluated_at: string;
  mismatch: {
    decision_changed: boolean;
    risk_level_changed: boolean;
    output_mode_changed: boolean;
    raw_mode_changed: boolean;
  };
  original: {
    decision: GuardrailDecision;
    risk_level: RiskTolerance;
    output_mode: string;
    raw_mode: string;
    confidence: number;
    uncertainty: number;
    anomaly: {
      raw_based: AnomalyFlags;
      derived_based: AnomalyFlags;
      sources: string[];
    };
    versions: {
      threshold_version: string;
      prompt_version: string;
      evaluator_version: string;
    };
  };
  reevaluated: {
    decision: GuardrailDecision;
    risk_level: RiskTolerance;
    output_mode: string;
    raw_mode: string;
    confidence: number;
    uncertainty: number;
    anomaly: {
      raw_based: AnomalyFlags;
      derived_based: AnomalyFlags;
      sources: string[];
    };
  };
  decision_transition: string;
  risk_transition: string;
  primary_type: MismatchCategory;
  classification_reasons: string[];
  critical: boolean;
};

type MismatchSummary = {
  total_reeval_results: number;
  total_mismatches: number;
  mismatch_rate: number;
  by_type: Record<MismatchCategory, number>;
  by_decision_transition: Record<string, number>;
  by_risk_transition: Record<string, number>;
  by_threshold_version: Record<string, number>;
  by_prompt_version: Record<string, number>;
  by_evaluator_version: Record<string, number>;
  critical_mismatch_count: number;
};

type MismatchCluster = {
  cluster_key: string;
  count: number;
  mismatch_type: MismatchCategory;
  threshold_version: string;
  prompt_version: string;
  evaluator_version: string;
  decision_transition: string;
  risk_transition: string;
  request_ids: string[];
};

type RecommendationBundle = {
  thresholdCandidates: string[];
  calibrationCandidates: string[];
  immediateItems: string[];
  observeItems: string[];
};

const OUTPUT_DIR = path.join(process.cwd(), "outputs", "monitoring");

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

function decisionSeverity(decision: GuardrailDecision): number {
  if (decision === "block") {
    return 3;
  }

  if (decision === "review") {
    return 2;
  }

  return 1;
}

function incrementCounter(
  counter: Record<string, number>,
  key: string,
) {
  counter[key] = (counter[key] ?? 0) + 1;
}

function getRawMode(
  requestLog: ReEvaluationResult["reevaluated_guardrail"],
): string {
  return (
    requestLog.guardrail_raw.raw_guardrail_mode ??
    requestLog.guardrail_derived.summary.raw_guardrail_mode
  );
}

function classifyMismatchCase(
  requestLog: RequestLog,
  reeval: ReEvaluationResult,
  mismatch: NonNullable<ReturnType<typeof buildReevaluationMismatch>>,
): {
  primaryType: MismatchCategory;
  reasons: string[];
  critical: boolean;
} {
  const originalDerived = requestLog.guardrail.guardrail_derived;
  const reevaluatedDerived = reeval.reevaluated_guardrail.guardrail_derived;
  const combinedFlags = mergeFlags(
    originalDerived.anomaly.anomaly_raw_based,
    originalDerived.anomaly.anomaly_derived_based,
    reevaluatedDerived.anomaly.anomaly_raw_based,
    reevaluatedDerived.anomaly.anomaly_derived_based,
  );
  const tightenedDecision =
    decisionSeverity(reevaluatedDerived.decision) >
    decisionSeverity(originalDerived.decision);
  const loosenedDecision =
    decisionSeverity(reevaluatedDerived.decision) <
    decisionSeverity(originalDerived.decision);
  const highConfidenceWrong =
    (originalDerived.confidence >= 0.75 || reevaluatedDerived.confidence >= 0.75) &&
    (mismatch.decision_changed || mismatch.risk_level_changed);
  const reasons: string[] = [];

  if (
    combinedFlags.underblocking ||
    (tightenedDecision &&
      (reevaluatedDerived.risk_level === "high" || mismatch.risk_level_changed))
  ) {
    reasons.push("decision tightened or risk moved upward around a potentially underblocked case.");
    return {
      primaryType: "underblocking_related",
      reasons,
      critical: true,
    };
  }

  if (
    combinedFlags.overblocking ||
    (loosenedDecision &&
      (originalDerived.risk_level === "low" || reevaluatedDerived.risk_level === "low"))
  ) {
    reasons.push("decision loosened or low-risk block/review mismatch suggests overblocking.");
    return {
      primaryType: "overblocking_related",
      reasons,
      critical: true,
    };
  }

  if (
    combinedFlags.low_confidence &&
    (originalDerived.confidence < 0.6 || reevaluatedDerived.confidence < 0.6)
  ) {
    reasons.push("low confidence anomaly is present and confidence stayed below the safe band.");
    return {
      primaryType: "low_confidence_related",
      reasons,
      critical: false,
    };
  }

  if (combinedFlags.conflict) {
    reasons.push("conflict anomaly is present across raw/derived evaluation.");
    return {
      primaryType: "conflict_related",
      reasons,
      critical: true,
    };
  }

  if (highConfidenceWrong) {
    reasons.push("high confidence output still changed at re-eval, suggesting calibration drift.");
    return {
      primaryType: "high_confidence_wrong",
      reasons,
      critical: true,
    };
  }

  reasons.push("changes are limited to threshold boundary movement without strong anomaly signals.");
  return {
    primaryType: "boundary_shift_only",
    reasons,
    critical: false,
  };
}

function buildMismatchCaseRecord(params: {
  requestArtifact: { path: string; value: RequestLog };
  reevalArtifact: { path: string; value: ReEvaluationResult };
  queueArtifact?: { path: string; value: AnomalyQueueEntry };
}): MismatchCaseRecord | null {
  const mismatch = buildReevaluationMismatch(
    params.requestArtifact.value,
    params.reevalArtifact.value,
  );

  if (!mismatch) {
    return null;
  }

  const classification = classifyMismatchCase(
    params.requestArtifact.value,
    params.reevalArtifact.value,
    mismatch,
  );
  const originalDerived = params.requestArtifact.value.guardrail.guardrail_derived;
  const reevaluatedDerived = params.reevalArtifact.value.reevaluated_guardrail.guardrail_derived;

  return {
    request_id: params.requestArtifact.value.request_id,
    reeval_path: params.reevalArtifact.path,
    request_log_path: params.requestArtifact.path,
    queue_source_path: params.queueArtifact?.path ?? null,
    reevaluated_at: params.reevalArtifact.value.reevaluated_at,
    mismatch: {
      decision_changed: mismatch.decision_changed,
      risk_level_changed: mismatch.risk_level_changed,
      output_mode_changed: mismatch.output_mode_changed,
      raw_mode_changed: mismatch.raw_mode_changed,
    },
    original: {
      decision: originalDerived.decision,
      risk_level: originalDerived.risk_level,
      output_mode: originalDerived.output_mode,
      raw_mode: getRawMode(params.requestArtifact.value.guardrail),
      confidence: originalDerived.confidence,
      uncertainty: originalDerived.uncertainty,
      anomaly: {
        raw_based: originalDerived.anomaly.anomaly_raw_based,
        derived_based: originalDerived.anomaly.anomaly_derived_based,
        sources: getAnomalySources(originalDerived.anomaly),
      },
      versions: {
        threshold_version: params.requestArtifact.value.versions.threshold_version,
        prompt_version: params.requestArtifact.value.versions.prompt_version ?? "unknown",
        evaluator_version: params.requestArtifact.value.versions.evaluator_version,
      },
    },
    reevaluated: {
      decision: reevaluatedDerived.decision,
      risk_level: reevaluatedDerived.risk_level,
      output_mode: reevaluatedDerived.output_mode,
      raw_mode: getRawMode(params.reevalArtifact.value.reevaluated_guardrail),
      confidence: reevaluatedDerived.confidence,
      uncertainty: reevaluatedDerived.uncertainty,
      anomaly: {
        raw_based: reevaluatedDerived.anomaly.anomaly_raw_based,
        derived_based: reevaluatedDerived.anomaly.anomaly_derived_based,
        sources: getAnomalySources(reevaluatedDerived.anomaly),
      },
    },
    decision_transition: `${originalDerived.decision}->${reevaluatedDerived.decision}`,
    risk_transition: `${originalDerived.risk_level}->${reevaluatedDerived.risk_level}`,
    primary_type: classification.primaryType,
    classification_reasons: classification.reasons,
    critical: classification.critical,
  };
}

function buildSummary(
  totalReevalResults: number,
  mismatchCases: MismatchCaseRecord[],
): MismatchSummary {
  const byType: Record<MismatchCategory, number> = {
    underblocking_related: 0,
    overblocking_related: 0,
    low_confidence_related: 0,
    conflict_related: 0,
    high_confidence_wrong: 0,
    boundary_shift_only: 0,
  };
  const byDecisionTransition: Record<string, number> = {};
  const byRiskTransition: Record<string, number> = {};
  const byThresholdVersion: Record<string, number> = {};
  const byPromptVersion: Record<string, number> = {};
  const byEvaluatorVersion: Record<string, number> = {};

  for (const mismatchCase of mismatchCases) {
    byType[mismatchCase.primary_type] += 1;
    incrementCounter(byDecisionTransition, mismatchCase.decision_transition);
    incrementCounter(byRiskTransition, mismatchCase.risk_transition);
    incrementCounter(
      byThresholdVersion,
      mismatchCase.original.versions.threshold_version,
    );
    incrementCounter(byPromptVersion, mismatchCase.original.versions.prompt_version);
    incrementCounter(
      byEvaluatorVersion,
      mismatchCase.original.versions.evaluator_version,
    );
  }

  return {
    total_reeval_results: totalReevalResults,
    total_mismatches: mismatchCases.length,
    mismatch_rate: safeRate(mismatchCases.length, totalReevalResults),
    by_type: byType,
    by_decision_transition: byDecisionTransition,
    by_risk_transition: byRiskTransition,
    by_threshold_version: byThresholdVersion,
    by_prompt_version: byPromptVersion,
    by_evaluator_version: byEvaluatorVersion,
    critical_mismatch_count: mismatchCases.filter((caseItem) => caseItem.critical)
      .length,
  };
}

function buildClusters(
  mismatchCases: MismatchCaseRecord[],
): MismatchCluster[] {
  const clusters = new Map<string, MismatchCluster>();

  for (const mismatchCase of mismatchCases) {
    const key = [
      mismatchCase.primary_type,
      mismatchCase.original.versions.threshold_version,
      mismatchCase.original.versions.prompt_version,
      mismatchCase.original.versions.evaluator_version,
      mismatchCase.decision_transition,
      mismatchCase.risk_transition,
    ].join("|");
    const existing = clusters.get(key);

    if (existing) {
      existing.count += 1;
      existing.request_ids.push(mismatchCase.request_id);
      continue;
    }

    clusters.set(key, {
      cluster_key: key,
      count: 1,
      mismatch_type: mismatchCase.primary_type,
      threshold_version: mismatchCase.original.versions.threshold_version,
      prompt_version: mismatchCase.original.versions.prompt_version,
      evaluator_version: mismatchCase.original.versions.evaluator_version,
      decision_transition: mismatchCase.decision_transition,
      risk_transition: mismatchCase.risk_transition,
      request_ids: [mismatchCase.request_id],
    });
  }

  return [...clusters.values()].sort((left, right) => right.count - left.count);
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function buildRecommendations(
  mismatchCases: MismatchCaseRecord[],
  clusters: MismatchCluster[],
): RecommendationBundle {
  const thresholdCandidates: string[] = [];
  const calibrationCandidates: string[] = [];
  const immediateItems: string[] = [];
  const observeItems: string[] = [];
  const byType = mismatchCases.reduce<Record<MismatchCategory, MismatchCaseRecord[]>>(
    (accumulator, mismatchCase) => {
      accumulator[mismatchCase.primary_type].push(mismatchCase);
      return accumulator;
    },
    {
      underblocking_related: [],
      overblocking_related: [],
      low_confidence_related: [],
      conflict_related: [],
      high_confidence_wrong: [],
      boundary_shift_only: [],
    },
  );

  if (byType.underblocking_related.length > 0) {
    thresholdCandidates.push(
      `underblocking_related ${byType.underblocking_related.length}건: ${uniqueSorted(
        byType.underblocking_related.map((item) => item.original.versions.threshold_version),
      ).join(", ")} 기준에서 block/escalation 임계값 하향 후보를 검토하라.`,
    );
    immediateItems.push(
      `review->block 또는 risk 상승이 동반된 underblocking 관련 mismatch ${byType.underblocking_related.length}건은 즉시 threshold 재조정 대상이다.`,
    );
  }

  if (byType.overblocking_related.length > 0) {
    thresholdCandidates.push(
      `overblocking_related ${byType.overblocking_related.length}건: low-risk block/review 구간의 threshold 상향 후보를 검토하라.`,
    );
    immediateItems.push(
      `loosened decision으로 되돌아간 overblocking 관련 mismatch ${byType.overblocking_related.length}건을 샘플 리뷰하라.`,
    );
  }

  if (byType.conflict_related.length > 0) {
    thresholdCandidates.push(
      `conflict_related ${byType.conflict_related.length}건: rule/prompt/evaluator 해석 일관성 점검 후보로 묶어라.`,
    );
  }

  if (byType.low_confidence_related.length > 0) {
    calibrationCandidates.push(
      `low_confidence_related ${byType.low_confidence_related.length}건: confidence 0.6 미만 구간의 calibration 및 cautious escalation 규칙을 재검토하라.`,
    );
  }

  if (byType.high_confidence_wrong.length > 0) {
    calibrationCandidates.push(
      `high_confidence_wrong ${byType.high_confidence_wrong.length}건: high-confidence 구간 calibration drift 후보로 즉시 점검하라.`,
    );
    immediateItems.push(
      `high_confidence_wrong 반복은 calibration 테이블 수정이 필요할 가능성이 높다.`,
    );
  }

  if (byType.boundary_shift_only.length > 0) {
    observeItems.push(
      `boundary_shift_only ${byType.boundary_shift_only.length}건: 즉시 수정 대신 관찰 대상으로 분류하라.`,
    );
  }

  if (thresholdCandidates.length === 0) {
    thresholdCandidates.push("반복적인 threshold 계열 mismatch는 뚜렷하지 않다. 현재 threshold는 observe 상태로 유지하라.");
  }

  if (calibrationCandidates.length === 0) {
    calibrationCandidates.push("즉시 calibration 수정이 필요한 강한 신호는 제한적이다. low-confidence band를 중심으로 추세만 관찰하라.");
  }

  if (immediateItems.length === 0) {
    immediateItems.push("즉시 롤백이나 hotfix가 필요한 강한 mismatch 패턴은 없다.");
  }

  if (observeItems.length === 0) {
    const topCluster = clusters[0];
    observeItems.push(
      topCluster
        ? `가장 큰 반복 패턴은 ${topCluster.mismatch_type} / ${topCluster.decision_transition} / ${topCluster.risk_transition} 조합이므로 다음 배치까지 관찰을 지속하라.`
        : "반복 패턴이 충분하지 않아 관찰 지속 항목은 비어 있다.",
    );
  }

  return {
    thresholdCandidates,
    calibrationCandidates,
    immediateItems,
    observeItems,
  };
}

function buildMarkdownReport(params: {
  summary: MismatchSummary;
  clusters: MismatchCluster[];
  recommendations: RecommendationBundle;
}): string {
  const topTypeEntry =
    Object.entries(params.summary.by_type).sort((left, right) => right[1] - left[1])[0] ??
    null;
  const topClusters = params.clusters.slice(0, 5);

  return [
    "# Re-eval Mismatch Tuning Recommendations",
    "",
    "## 1. 핵심 요약",
    `- total re_eval_results: ${params.summary.total_reeval_results}`,
    `- total mismatches: ${params.summary.total_mismatches}`,
    `- mismatch rate: ${params.summary.mismatch_rate}`,
    `- top mismatch type: ${topTypeEntry ? `${topTypeEntry[0]} (${topTypeEntry[1]})` : "none"}`,
    `- critical mismatch count: ${params.summary.critical_mismatch_count}`,
    "",
    "## 2. mismatch 통계",
    `- by_type: ${JSON.stringify(params.summary.by_type)}`,
    `- by_decision_transition: ${JSON.stringify(params.summary.by_decision_transition)}`,
    `- by_risk_transition: ${JSON.stringify(params.summary.by_risk_transition)}`,
    `- by_threshold_version: ${JSON.stringify(params.summary.by_threshold_version)}`,
    `- by_prompt_version: ${JSON.stringify(params.summary.by_prompt_version)}`,
    `- by_evaluator_version: ${JSON.stringify(params.summary.by_evaluator_version)}`,
    "",
    "## 3. 반복 패턴 top 5",
    ...(topClusters.length > 0
      ? topClusters.map(
          (cluster, index) =>
            `${index + 1}. ${cluster.mismatch_type} | ${cluster.decision_transition} | ${cluster.risk_transition} | threshold=${cluster.threshold_version} | prompt=${cluster.prompt_version} | evaluator=${cluster.evaluator_version} | count=${cluster.count}`,
        )
      : ["1. 반복 패턴 없음"]),
    "",
    "## 4. threshold 수정 후보",
    ...params.recommendations.thresholdCandidates.map((item) => `- ${item}`),
    "",
    "## 5. calibration 수정 후보",
    ...params.recommendations.calibrationCandidates.map((item) => `- ${item}`),
    "",
    "## 6. 즉시 수정 필요 항목",
    ...params.recommendations.immediateItems.map((item) => `- ${item}`),
    "",
    "## 7. 관찰 지속 항목",
    ...params.recommendations.observeItems.map((item) => `- ${item}`),
    "",
  ].join("\n");
}

async function writeJsonOutput(fileName: string, payload: unknown) {
  await writeFile(
    path.join(OUTPUT_DIR, fileName),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const [requestArtifacts, reevalArtifacts, queueArtifacts] = await Promise.all([
    readJsonArtifacts<RequestLog>("request_logs"),
    readJsonArtifacts<ReEvaluationResult>("re_eval_results"),
    readJsonArtifacts<AnomalyQueueEntry>("anomaly_queue"),
  ]);
  const requestById = new Map(
    requestArtifacts.map((artifact) => [artifact.value.request_id, artifact]),
  );
  const queueByRequestId = new Map(
    queueArtifacts.map((artifact) => [artifact.value.request_log.request_id, artifact]),
  );
  const mismatchCases = reevalArtifacts
    .map((artifact) => {
      const requestArtifact = requestById.get(artifact.value.request_id);

      if (!requestArtifact) {
        return null;
      }

      return buildMismatchCaseRecord({
        requestArtifact,
        reevalArtifact: artifact,
        queueArtifact: queueByRequestId.get(artifact.value.request_id),
      });
    })
    .filter((value): value is MismatchCaseRecord => value !== null);
  const summary = buildSummary(reevalArtifacts.length, mismatchCases);
  const clusters = buildClusters(mismatchCases);
  const recommendations = buildRecommendations(mismatchCases, clusters);
  const markdown = buildMarkdownReport({
    summary,
    clusters,
    recommendations,
  });
  const topTypeEntry =
    Object.entries(summary.by_type).sort((left, right) => right[1] - left[1])[0] ??
    null;
  const recommendedActionCount =
    recommendations.thresholdCandidates.length +
    recommendations.calibrationCandidates.length +
    recommendations.immediateItems.length +
    recommendations.observeItems.length;

  await Promise.all([
    writeJsonOutput("mismatch-cases.json", mismatchCases),
    writeJsonOutput("mismatch-summary.json", summary),
    writeJsonOutput("mismatch-clusters.json", clusters),
    writeFile(
      path.join(OUTPUT_DIR, "tuning-recommendations.md"),
      markdown,
      "utf8",
    ),
  ]);

  console.log(`[analyze:reeval] total re_eval_results=${summary.total_reeval_results}`);
  console.log(`[analyze:reeval] total mismatches=${summary.total_mismatches}`);
  console.log(
    `[analyze:reeval] top mismatch type=${topTypeEntry ? topTypeEntry[0] : "none"}`,
  );
  console.log(
    `[analyze:reeval] critical mismatch count=${summary.critical_mismatch_count}`,
  );
  console.log(
    `[analyze:reeval] recommended action count=${recommendedActionCount}`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[analyze:reeval] fatal: ${message}`);
  process.exitCode = 1;
});
