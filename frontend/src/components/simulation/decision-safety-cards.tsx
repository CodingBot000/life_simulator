import type {
  AdvisorResult,
  GuardrailResult,
  ReflectionResult,
} from "@/lib/types";
import type { PriorityLocale } from "@/lib/priorities";

import {
  REFLECTION_COPY,
  formatConfidence,
  formatReasoningSignal,
  formatUserFacingNarrative,
} from "./narrative";

export function AdvisorCard({ advisor }: { advisor: AdvisorResult }) {
  const decisionLabel =
    advisor.decision === "undecided"
      ? "Undecided"
      : `Option ${advisor.decision}`;

  return (
    <section className="card-surface-strong rounded-[32px] p-6">
      <p className="section-label">Advisor</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <h3 className="display-font text-2xl font-semibold text-slate-950">
          최종 판단
        </h3>
        <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
          {decisionLabel}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-900/8 bg-white/70 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Decision
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-950">
            {advisor.decision}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-900/8 bg-white/70 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Decision Confidence
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-950">
            {formatConfidence(advisor.confidence)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-900/8 bg-white/70 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Guardrail Applied
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-950">
            {advisor.guardrail_applied ? "yes" : "no"}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-700">
        {formatUserFacingNarrative(advisor.reason)}
      </p>
      <p className="mt-3 rounded-2xl border border-slate-900/8 bg-white/70 p-4 text-sm leading-7 text-slate-700">
        {formatUserFacingNarrative(advisor.reasoning_basis.core_why)}
      </p>
    </section>
  );
}

export function GuardrailCard({
  guardrail,
  derived = false,
}: {
  guardrail: GuardrailResult;
  derived?: boolean;
}) {
  const activeReasoningSignals = Object.entries(guardrail.reasoning_signals)
    .filter(([, enabled]) => enabled)
    .map(([label]) => formatReasoningSignal(label));

  return (
    <section className="card-surface rounded-[28px] p-6">
      <p className="section-label">Guardrail</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <h3 className="display-font text-2xl font-semibold text-slate-950">
          결론 안전장치
        </h3>
        <div className="flex items-center gap-2">
          {derived ? (
            <span className="rounded-full border border-slate-900/10 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              derived
            </span>
          ) : null}
          <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
            {guardrail.final_mode}
          </span>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-900/8 bg-white/70 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Triggered
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-950">
            {guardrail.guardrail_triggered ? "yes" : "no"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-900/8 bg-white/70 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Risk Score
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-950">
            {formatConfidence(guardrail.risk_score)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-900/8 bg-white/70 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Confidence
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-950">
            {formatConfidence(guardrail.confidence_score)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-900/8 bg-white/70 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Uncertainty
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-950">
            {formatConfidence(guardrail.uncertainty_score)}
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-900/8 bg-white/70 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Triggers
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            {guardrail.triggers.length > 0
              ? guardrail.triggers.join(", ")
              : "none"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-900/8 bg-white/70 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Strategy
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            {guardrail.strategy.length > 0
              ? guardrail.strategy.join(", ")
              : "none"}
          </p>
        </div>
      </div>
      <div className="mt-3 rounded-2xl border border-slate-900/8 bg-white/70 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          Reasoning Signals
        </p>
        <p className="mt-2 text-sm leading-7 text-slate-700">
          {activeReasoningSignals.length > 0
            ? activeReasoningSignals.join(", ")
            : "none"}
        </p>
      </div>
    </section>
  );
}

export function ReflectionCard({
  reflection,
  derived = false,
  locale,
}: {
  reflection: ReflectionResult;
  derived?: boolean;
  locale: PriorityLocale;
}) {
  const reflectionCopy = REFLECTION_COPY[locale];
  const scoreEntries: Array<{
    label: keyof ReflectionResult["scores"];
    value: number;
  }> = [
    { label: "realism", value: reflection.scores.realism },
    { label: "consistency", value: reflection.scores.consistency },
    {
      label: "profile_alignment",
      value: reflection.scores.profile_alignment,
    },
    {
      label: "recommendation_clarity",
      value: reflection.scores.recommendation_clarity,
    },
  ];

  return (
    <section className="card-surface rounded-[28px] p-6">
      <p className="section-label">Reflection</p>
      <div className="mt-2 flex items-start justify-between gap-4">
        <h3 className="display-font text-2xl font-semibold text-slate-950">
          {reflectionCopy.title}
        </h3>
        {derived ? (
          <span className="rounded-full border border-slate-900/10 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
            derived
          </span>
        ) : null}
      </div>
      <p className="mt-4 rounded-2xl border border-slate-900/8 bg-white/70 p-4 text-sm leading-7 text-slate-700">
        {formatUserFacingNarrative(reflection.user_summary.headline, locale)}
      </p>
      <p className="mt-3 rounded-2xl border border-slate-900/8 bg-white/70 p-4 text-sm leading-7 text-slate-700">
        {formatUserFacingNarrative(reflection.user_summary.summary, locale)}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {scoreEntries.map((score) => (
          <div
            key={score.label}
            className="rounded-2xl border border-slate-900/8 bg-white/70 p-4"
          >
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              {score.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {score.value}
              <span className="ml-1 text-sm font-medium text-slate-500">/ 5</span>
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-900/8 bg-white/70 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Guardrail Needed
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-950">
            {reflection.guardrail_review.was_needed ? "yes" : "no"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-900/8 bg-white/70 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Guardrail Triggered
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-950">
            {reflection.guardrail_review.was_triggered ? "yes" : "no"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-900/8 bg-white/70 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Guardrail Review
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-950">
            {reflection.guardrail_review.correctness}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            {reflectionCopy.cautions}
          </p>
          <ul className="mt-3 grid gap-3">
            {reflection.user_summary.cautions.map((item, index) => (
              <li
                key={`caution-${index}`}
                className="rounded-2xl border border-rose-900/10 bg-rose-50/80 px-4 py-3 text-sm leading-7 text-slate-700"
              >
                {formatUserFacingNarrative(item, locale)}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            {reflectionCopy.suggestedActions}
          </p>
          <ul className="mt-3 grid gap-3">
            {reflection.user_summary.suggested_actions.map((item, index) => (
              <li
                key={`action-${index}`}
                className="rounded-2xl border border-amber-900/10 bg-amber-50/80 px-4 py-3 text-sm leading-7 text-slate-700"
              >
                {formatUserFacingNarrative(item, locale)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
