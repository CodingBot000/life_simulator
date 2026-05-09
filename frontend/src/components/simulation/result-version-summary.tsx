import {
  compareSimulationResults,
  formatSignedPercent,
} from "@/lib/simulation/compare-results";
import type { SimulationResultVersion } from "@/lib/simulation/result-version";
import type { PriorityLocale } from "@/lib/priorities";

import { formatConfidence, formatUserFacingNarrative } from "./narrative";

export function ResultVersionSummary({
  locale,
  versions,
}: {
  locale: PriorityLocale;
  versions: SimulationResultVersion[];
}) {
  if (versions.length < 2) {
    return null;
  }

  const latest = versions[versions.length - 1];
  const previous = versions[versions.length - 2];
  const comparison = compareSimulationResults(
    previous.response,
    latest.response,
  );

  return (
    <section className="card-surface rounded-[28px] p-6">
      <p className="section-label">Result Versions</p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="display-font text-2xl font-semibold text-slate-950">
            재평가 변화 요약
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {previous.label} 결과는 보존하고, {latest.label} 결과를 최신 판단으로
            표시합니다.
          </p>
        </div>
        <span className="w-fit rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
          latest {latest.label}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <SummaryTile
          label="Recommendation"
          value={
            comparison.recommendationChanged
              ? `${comparison.previousDecision} -> ${comparison.latestDecision}`
              : `${comparison.latestDecision} 유지`
          }
        />
        <SummaryTile
          label="Confidence"
          value={formatSignedPercent(comparison.confidenceDelta)}
        />
        <SummaryTile
          label="Guardrail Mode"
          value={
            comparison.guardrailModeChanged
              ? `${previous.response.guardrail.final_mode} -> ${latest.response.guardrail.final_mode}`
              : latest.response.guardrail.final_mode
          }
        />
        <SummaryTile
          label="Execution Mode"
          value={
            comparison.executionModeChanged
              ? `${previous.response.routing.execution_mode} -> ${latest.response.routing.execution_mode}`
              : latest.response.routing.execution_mode
          }
        />
      </div>

      <details className="mt-5 rounded-2xl border border-slate-900/8 bg-white/70 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800">
          이전 결과 {previous.label} 보기
        </summary>
        <div className="mt-4 grid gap-3 text-sm leading-7 text-slate-700">
          <p>
            추천안: {previous.response.advisor.decision} · 신뢰도:{" "}
            {formatConfidence(previous.response.advisor.confidence)}
          </p>
          <p>{formatUserFacingNarrative(previous.response.advisor.reason, locale)}</p>
          <p className="rounded-2xl border border-slate-900/8 bg-slate-50/80 p-4">
            {formatUserFacingNarrative(
              previous.response.reflection.user_summary.summary,
              locale,
            )}
          </p>
        </div>
      </details>
    </section>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-900/8 bg-white/70 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}
