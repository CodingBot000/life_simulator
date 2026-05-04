import type { AbReasoningResult, RiskResult } from "@/lib/types";

import { formatUserFacingNarrative } from "./narrative";

export function RiskCard({
  title,
  risk,
}: {
  title: string;
  risk: RiskResult;
}) {
  const toneClass =
    risk.risk_level === "high"
      ? "bg-rose-600/[0.12] text-rose-900 border-rose-900/10"
      : risk.risk_level === "medium"
        ? "bg-amber-500/[0.12] text-amber-900 border-amber-900/10"
        : "bg-emerald-600/[0.12] text-emerald-900 border-emerald-900/10";

  return (
    <section className="card-surface rounded-[28px] p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="section-label">Risk</p>
          <h3 className="display-font mt-2 text-xl font-semibold text-slate-900">
            {title}
          </h3>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-sm font-semibold capitalize ${toneClass}`}
        >
          {risk.risk_level}
        </span>
      </div>
      <ul className="mt-5 grid gap-3">
        {risk.reasons.map((reason) => (
          <li
            key={reason}
            className="rounded-2xl border border-slate-900/8 bg-white/70 px-4 py-3 text-sm leading-7 text-slate-700"
          >
            {formatUserFacingNarrative(reason)}
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatReasoningSignal(label: string) {
  return label.replaceAll("_", " ");
}

function ReasoningLensCard({
  title,
  accentClass,
  reasoning,
}: {
  title: string;
  accentClass: string;
  reasoning: AbReasoningResult["reasoning"]["a_reasoning"];
}) {
  return (
    <div className="rounded-[24px] border border-slate-900/8 bg-white/75 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            {title}
          </p>
          <h4 className="mt-2 text-lg font-semibold text-slate-950">
            {reasoning.stance}
          </h4>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-sm font-semibold ${accentClass}`}
        >
          Option {reasoning.recommended_option}
        </span>
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-700">
        {formatUserFacingNarrative(reasoning.summary)}
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-900/8 bg-slate-50/80 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Confidence
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-950">
            {formatConfidence(reasoning.confidence)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-900/8 bg-slate-50/80 p-4 sm:col-span-2">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Key Assumptions
          </p>
          <ul className="mt-2 grid gap-2">
            {reasoning.key_assumptions.map((item) => (
              <li key={item} className="text-sm leading-7 text-slate-700">
                {formatUserFacingNarrative(item)}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-900/10 bg-emerald-50/70 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
            Pros
          </p>
          <ul className="mt-2 grid gap-2">
            {reasoning.pros.map((item) => (
              <li key={item} className="text-sm leading-7 text-slate-700">
                {formatUserFacingNarrative(item)}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-rose-900/10 bg-rose-50/70 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-800">
            Cons
          </p>
          <ul className="mt-2 grid gap-2">
            {reasoning.cons.map((item) => (
              <li key={item} className="text-sm leading-7 text-slate-700">
                {formatUserFacingNarrative(item)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function ReasoningCard({ reasoning }: { reasoning: AbReasoningResult }) {
  return (
    <section className="card-surface rounded-[28px] p-6">
      <p className="section-label">A/B Reasoning</p>
      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h3 className="display-font text-2xl font-semibold text-slate-950">
            판단 후보안 비교
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {reasoning.input_summary.planner_goal}
          </p>
        </div>
        <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
          Case {reasoning.case_id}
        </span>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <ReasoningLensCard
          title="Reasoning A"
          accentClass="border-emerald-900/10 bg-emerald-600/[0.12] text-emerald-900"
          reasoning={reasoning.reasoning.a_reasoning}
        />
        <ReasoningLensCard
          title="Reasoning B"
          accentClass="border-amber-900/10 bg-amber-500/[0.14] text-amber-950"
          reasoning={reasoning.reasoning.b_reasoning}
        />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[24px] border border-slate-900/8 bg-white/75 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Comparison
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            {formatUserFacingNarrative(reasoning.reasoning.comparison.reason)}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-900/10 bg-emerald-50/70 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
                Agreements
              </p>
              <ul className="mt-2 grid gap-2">
                {reasoning.reasoning.comparison.agreements.map((item) => (
                  <li key={item} className="text-sm leading-7 text-slate-700">
                    {formatUserFacingNarrative(item)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-rose-900/10 bg-rose-50/70 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-800">
                Conflicts
              </p>
              <ul className="mt-2 grid gap-2">
                {reasoning.reasoning.comparison.conflicts.map((item) => (
                  <li key={item} className="text-sm leading-7 text-slate-700">
                    {formatUserFacingNarrative(item)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-950">
            사용자 적합 옵션: {reasoning.reasoning.comparison.which_fits_user_better}
          </p>
        </div>

        <div className="rounded-[24px] border border-slate-900/8 bg-slate-950 p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">
            Final Selection
          </p>
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">
                Selected Reasoning
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {reasoning.reasoning.final_selection.selected_reasoning}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">
                Selected Option
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {reasoning.reasoning.final_selection.selected_option}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">
                Confidence
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {formatConfidence(
                  reasoning.reasoning.final_selection.decision_confidence,
                )}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-white/80">
            {formatUserFacingNarrative(
              reasoning.reasoning.final_selection.why_selected,
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

