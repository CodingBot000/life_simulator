"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";

import type {
  AbReasoningResult,
  AdvisorResult,
  DecisionInput,
  PlannerResult,
  ReflectionResult,
  RiskResult,
  RiskTolerance,
  ScenarioResult,
  SimulationResponse,
  UserProfile,
} from "@/lib/types";

type FormState = {
  age: string;
  job: string;
  risk_tolerance: RiskTolerance;
  priority: string;
  optionA: string;
  optionB: string;
  context: string;
};

const initialForm: FormState = {
  age: "32",
  job: "developer",
  risk_tolerance: "medium",
  priority: "stability,income,work_life_balance",
  optionA: "현재 회사에 남는다",
  optionB: "스타트업으로 이직한다",
  context: "현재 연봉은 안정적이지만 성장 정체를 느끼고 있다.",
};

function buildPayload(form: FormState): {
  userProfile: UserProfile;
  decision: DecisionInput;
} {
  return {
    userProfile: {
      age: Number(form.age),
      job: form.job.trim(),
      risk_tolerance: form.risk_tolerance,
      priority: form.priority
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    },
    decision: {
      optionA: form.optionA.trim(),
      optionB: form.optionB.trim(),
      context: form.context.trim(),
    },
  };
}

function InputField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function TimelineCard({
  title,
  scenario,
}: {
  title: string;
  scenario: ScenarioResult;
}) {
  return (
    <section className="card-surface rounded-[28px] p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="section-label">Scenario</p>
          <h3 className="display-font mt-2 text-xl font-semibold text-slate-900">
            {title}
          </h3>
        </div>
      </div>
      <div className="grid gap-4">
        <ScenarioBlock label="3개월" value={scenario.three_months} />
        <ScenarioBlock label="1년" value={scenario.one_year} />
        <ScenarioBlock label="3년" value={scenario.three_years} />
      </div>
    </section>
  );
}

function ScenarioBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-amber-900/10 bg-white/70 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
        {label}
      </p>
      <p className="mt-2 text-sm leading-7 text-slate-700">{value}</p>
    </div>
  );
}

function PlannerCard({ planner }: { planner: PlannerResult }) {
  return (
    <section className="card-surface rounded-[28px] p-6">
      <p className="section-label">Planner</p>
      <h3 className="display-font mt-2 text-xl font-semibold text-slate-900">
        의사결정 프레임
      </h3>
      <div className="mt-5 rounded-2xl border border-slate-900/8 bg-white/70 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          decision_type
        </p>
        <p className="mt-2 text-base font-semibold text-slate-900">
          {planner.decision_type}
        </p>
      </div>
      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          factors
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {planner.factors.map((factor) => (
            <span
              key={factor}
              className="rounded-full border border-amber-900/10 bg-amber-600/[0.08] px-3 py-1 text-sm font-medium text-amber-900"
            >
              {factor}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function RiskCard({
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
            {reason}
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
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
      <p className="mt-4 text-sm leading-7 text-slate-700">{reasoning.summary}</p>
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
                {item}
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
                {item}
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
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ReasoningCard({ reasoning }: { reasoning: AbReasoningResult }) {
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
            {reasoning.reasoning.comparison.reason}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-900/10 bg-emerald-50/70 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
                Agreements
              </p>
              <ul className="mt-2 grid gap-2">
                {reasoning.reasoning.comparison.agreements.map((item) => (
                  <li key={item} className="text-sm leading-7 text-slate-700">
                    {item}
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
                    {item}
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
            {reasoning.reasoning.final_selection.why_selected}
          </p>
        </div>
      </div>
    </section>
  );
}

function AdvisorCard({ advisor }: { advisor: AdvisorResult }) {
  return (
    <section className="card-surface-strong rounded-[32px] p-6">
      <p className="section-label">Advisor</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <h3 className="display-font text-2xl font-semibold text-slate-950">
          최종 추천
        </h3>
        <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
          Option {advisor.recommended_option}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-900/8 bg-white/70 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Selected Reasoning
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-950">
            {advisor.reasoning_basis.selected_reasoning}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-900/8 bg-white/70 p-4 sm:col-span-2">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Decision Confidence
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-950">
            {formatConfidence(advisor.reasoning_basis.decision_confidence)}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-700">{advisor.reason}</p>
      <p className="mt-3 rounded-2xl border border-slate-900/8 bg-white/70 p-4 text-sm leading-7 text-slate-700">
        {advisor.reasoning_basis.core_why}
      </p>
    </section>
  );
}

function ReflectionCard({ reflection }: { reflection: ReflectionResult }) {
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
          결과 검증
        </h3>
      </div>
      <p className="mt-4 rounded-2xl border border-slate-900/8 bg-white/70 p-4 text-sm leading-7 text-slate-700">
        {reflection.overall_comment}
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

      <div className="mt-6 grid gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Issues
          </p>
          <ul className="mt-3 grid gap-3">
            {reflection.issues.map((issue, index) => (
              <li
                key={`${issue.type}-${index}`}
                className="rounded-2xl border border-rose-900/10 bg-rose-50/80 px-4 py-3 text-sm leading-7 text-slate-700"
              >
                <span className="mr-2 rounded-full bg-rose-900 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                  {issue.type}
                </span>
                {issue.description}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Improvements
          </p>
          <ul className="mt-3 grid gap-3">
            {reflection.improvement_suggestions.map((item, index) => (
              <li
                key={`${item.target}-${index}`}
                className="rounded-2xl border border-amber-900/10 bg-amber-50/80 px-4 py-3 text-sm leading-7 text-slate-700"
              >
                <span className="mr-2 rounded-full bg-amber-700 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                  {item.target}
                </span>
                {item.suggestion}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPayload(form)),
      });

      const data = (await response.json()) as SimulationResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "시뮬레이션 실행 중 오류가 발생했습니다.");
      }

      setResult(data);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="grid gap-8 xl:grid-cols-[1.04fr_0.96fr]">
        <section className="card-surface-strong rounded-[36px] p-6 sm:p-8">
          <div className="max-w-3xl">
            <p className="section-label">Decision Simulator</p>
            <h1 className="display-font mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              의사결정 시뮬레이션 Agent MVP
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
              사용자 프로필과 두 가지 선택지를 입력하면 Planner, Scenario,
              Risk, A/B Reasoning, Advisor, Reflection 순서의 8단계 체인으로
              결과 생성과 검증을 함께 수행합니다.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {[
              "1. Planner",
              "2. Scenario A",
              "3. Scenario B",
              "4. Risk A",
              "5. Risk B",
              "6. A/B Reasoning",
              "7. Advisor",
              "8. Reflection",
            ].map((step) => (
              <span
                key={step}
                className="rounded-full border border-slate-900/8 bg-white/70 px-3 py-1 text-sm text-slate-700"
              >
                {step}
              </span>
            ))}
          </div>

          <form className="mt-8 grid gap-8" onSubmit={handleSubmit}>
            <section className="grid gap-4 rounded-[28px] border border-slate-900/8 bg-white/70 p-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <p className="section-label">User Profile</p>
              </div>

              <InputField label="나이">
                <input
                  required
                  min={1}
                  max={120}
                  type="number"
                  value={form.age}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      age: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10"
                />
              </InputField>

              <InputField label="직업">
                <input
                  required
                  type="text"
                  value={form.job}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      job: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10"
                />
              </InputField>

              <InputField label="리스크 허용도">
                <select
                  value={form.risk_tolerance}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      risk_tolerance: event.target.value as RiskTolerance,
                    }))
                  }
                  className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10"
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
              </InputField>

              <InputField label="우선순위">
                <input
                  required
                  type="text"
                  value={form.priority}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      priority: event.target.value,
                    }))
                  }
                  placeholder="stability,income,work_life_balance"
                  className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10"
                />
              </InputField>
            </section>

            <section className="grid gap-4 rounded-[28px] border border-slate-900/8 bg-white/70 p-5">
              <p className="section-label">Decision</p>

              <InputField label="선택지 A">
                <input
                  required
                  type="text"
                  value={form.optionA}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      optionA: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10"
                />
              </InputField>

              <InputField label="선택지 B">
                <input
                  required
                  type="text"
                  value={form.optionB}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      optionB: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10"
                />
              </InputField>

              <InputField label="현재 상황 설명">
                <textarea
                  required
                  rows={5}
                  value={form.context}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      context: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10"
                />
              </InputField>
            </section>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-7 text-slate-500">
                OpenAI API Key가 없거나 응답이 비정상이면 서버에서 명확한
                에러를 반환합니다.
              </p>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex min-w-[220px] items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isLoading ? "시뮬레이션 실행 중..." : "시뮬레이션 실행"}
              </button>
            </div>
          </form>
        </section>

        <section className="grid content-start gap-5 xl:sticky xl:top-8 xl:self-start">
          {error ? (
            <div className="rounded-[28px] border border-rose-900/10 bg-white/80 p-6 shadow-[0_20px_60px_rgba(127,29,29,0.08)]">
              <p className="section-label" style={{ color: "var(--danger)" }}>
                Error
              </p>
              <h2 className="display-font mt-2 text-2xl font-semibold text-rose-950">
                실행 실패
              </h2>
              <p className="mt-3 text-sm leading-7 text-rose-900/90">{error}</p>
            </div>
          ) : null}

          {isLoading ? (
            <div
              aria-busy="true"
              className="card-surface rounded-[28px] p-6 text-sm leading-7 text-slate-600"
            >
              <p className="section-label">Loading</p>
              <h2 className="display-font mt-2 text-2xl font-semibold text-slate-950">
                Agent chain 실행 중
              </h2>
              <p className="mt-3">
                Planner부터 A/B Reasoning, Reflection까지 순서대로 실행하고
                있습니다. 응답이 도착하면 결과 카드가 자동으로 채워집니다.
              </p>
            </div>
          ) : null}

          {!isLoading && !result && !error ? (
            <div className="card-surface rounded-[28px] p-6">
              <p className="section-label">Ready</p>
              <h2 className="display-font mt-2 text-2xl font-semibold text-slate-950">
                결과 대기 중
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                좌측 폼을 제출하면 Planner, 시나리오, 리스크, A/B reasoning,
                최종 추천, reflection 검증 결과가 카드 형태로 정리됩니다.
              </p>
            </div>
          ) : null}

          {result ? (
            <>
              <PlannerCard planner={result.planner} />
              <TimelineCard title="선택지 A 시나리오" scenario={result.scenarioA} />
              <TimelineCard title="선택지 B 시나리오" scenario={result.scenarioB} />
              <RiskCard title="Risk A" risk={result.riskA} />
              <RiskCard title="Risk B" risk={result.riskB} />
              <ReasoningCard reasoning={result.reasoning} />
              <AdvisorCard advisor={result.advisor} />
              <ReflectionCard reflection={result.reflection} />
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}
