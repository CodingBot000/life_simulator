import { getPriorityLabel } from "@/lib/priorities";
import type { PriorityCatalog, PriorityLocale } from "@/lib/priorities";
import type {
  MemoryDecisionRecord,
  PlannerResult,
  ScenarioResult,
  SimulationResponse,
  StateContext,
} from "@/lib/types";

import { formatUserFacingNarrative } from "./narrative";

export function TimelineCard({
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
        <ScenarioBlock
          label="3개월"
          value={formatUserFacingNarrative(scenario.three_months)}
        />
        <ScenarioBlock
          label="1년"
          value={formatUserFacingNarrative(scenario.one_year)}
        />
        <ScenarioBlock
          label="3년"
          value={formatUserFacingNarrative(scenario.three_years)}
        />
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

function hasCompleteRecentDecision(item: unknown): item is MemoryDecisionRecord {
  if (!item || typeof item !== "object") {
    return false;
  }

  const record = item as Record<string, unknown>;

  return (
    isNonBlankText(record.topic) &&
    isNonBlankText(record.selected_option) &&
    isNonBlankText(record.outcome_note)
  );
}

function isNonBlankText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function PlannerCard({ planner }: { planner: PlannerResult }) {
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
              {formatUserFacingNarrative(factor)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StateContextCard({
  stateContext,
  locale,
  priorityCatalog,
}: {
  stateContext: StateContext;
  locale: PriorityLocale;
  priorityCatalog?: PriorityCatalog | null;
}) {
  const { profile_state, situational_state, memory_state } =
    stateContext.user_state;
  const summary = stateContext.state_summary;
  const recentSimilarDecisions = memory_state.recent_similar_decisions.filter(
    hasCompleteRecentDecision,
  );

  return (
    <section className="card-surface rounded-[28px] p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="section-label">State Context</p>
          <h3 className="display-font mt-2 text-xl font-semibold text-slate-900">
            사용자 상태 요약
          </h3>
        </div>
        <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
          {stateContext.case_id}
        </span>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div className="rounded-[24px] border border-slate-900/8 bg-white/75 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Profile State
          </p>
          <div className="mt-3 grid gap-3">
            <div className="rounded-2xl border border-slate-900/8 bg-slate-50/80 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Risk Preference
              </p>
              <p className="mt-2 text-base font-semibold text-slate-950">
                {profile_state.risk_preference}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-900/8 bg-slate-50/80 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Decision Style
              </p>
              <p className="mt-2 text-base font-semibold text-slate-950">
                {profile_state.decision_style}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-900/8 bg-slate-50/80 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Top Priorities
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(profile_state.top_priorities.length > 0
                  ? profile_state.top_priorities
                  : ["none"]
                ).map((priority) => (
                  <span
                    key={priority}
                    className="rounded-full border border-amber-900/10 bg-amber-600/[0.08] px-3 py-1 text-sm font-medium text-amber-900"
                  >
                    {priority === "none"
                      ? "none"
                      : getPriorityLabel(priority, locale, priorityCatalog)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-900/8 bg-white/75 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Situational State
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {[
              ["career_stage", situational_state.career_stage],
              ["financial_pressure", situational_state.financial_pressure],
              ["time_pressure", situational_state.time_pressure],
              ["emotional_state", situational_state.emotional_state],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-900/8 bg-slate-50/80 p-4"
              >
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  {label}
                </p>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[24px] border border-slate-900/8 bg-white/75 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Memory State
          </p>
          <div className="mt-4 grid gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Recent Similar Decisions
              </p>
              <ul className="mt-2 grid gap-2">
                {recentSimilarDecisions.length > 0 ? (
                  recentSimilarDecisions.map((item, index) => (
                    <li
                      key={`${item.topic}-${item.selected_option}-${index}`}
                      className="rounded-2xl border border-slate-900/8 bg-slate-50/80 px-4 py-3 text-sm leading-7 text-slate-700"
                    >
                      {item.topic.trim()} / {item.selected_option.trim()} /{" "}
                      {item.outcome_note.trim()}
                    </li>
                  ))
                ) : (
                  <li className="rounded-2xl border border-slate-900/8 bg-slate-50/80 px-4 py-3 text-sm leading-7 text-slate-500">
                    none
                  </li>
                )}
              </ul>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Repeated Patterns
              </p>
              <ul className="mt-2 grid gap-2">
                {(memory_state.repeated_patterns.length > 0
                  ? memory_state.repeated_patterns
                  : ["none"]
                ).map((item) => (
                  <li
                    key={item}
                    className="rounded-2xl border border-slate-900/8 bg-slate-50/80 px-4 py-3 text-sm leading-7 text-slate-700"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Consistency Notes
              </p>
              <ul className="mt-2 grid gap-2">
                {(memory_state.consistency_notes.length > 0
                  ? memory_state.consistency_notes
                  : ["none"]
                ).map((item) => (
                  <li
                    key={item}
                    className="rounded-2xl border border-slate-900/8 bg-slate-50/80 px-4 py-3 text-sm leading-7 text-slate-700"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-900/8 bg-slate-950 p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">
            State Summary
          </p>
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">
                Decision Bias
              </p>
              <p className="mt-2 text-sm leading-7 text-white/90">
                {formatUserFacingNarrative(summary.decision_bias, locale, priorityCatalog)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">
                Current Constraint
              </p>
              <p className="mt-2 text-sm leading-7 text-white/90">
                {formatUserFacingNarrative(summary.current_constraint, locale, priorityCatalog)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">
                Agent Guidance
              </p>
              <p className="mt-2 text-sm leading-7 text-white/90">
                {formatUserFacingNarrative(summary.agent_guidance, locale, priorityCatalog)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function RoutingCard({
  routing,
}: {
  routing: SimulationResponse["routing"];
}) {
  const routingSummaryRows: Array<[string, string | number]> = [
    ["risk_band", routing.risk_profile.risk_band],
    ["complexity", routing.risk_profile.complexity],
    ["ambiguity", routing.risk_profile.ambiguity],
    ["state_unknown_count", routing.risk_profile.state_unknown_count],
    ["model_tier", routing.risk_profile.model_tier],
    ["execution_mode", routing.execution_mode],
  ];

  return (
    <section className="card-surface rounded-[28px] p-6">
      <div className="flex items-start gap-3">
        <div>
          <p className="section-label">Routing</p>
          <h3 className="display-font mt-2 text-xl font-semibold text-slate-900">
            실행 경로 요약
          </h3>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-900/8 bg-white/70 p-4 font-mono text-sm leading-7 text-slate-700">
        {routingSummaryRows.map(([label, value]) => (
          <p key={label}>
            <span>{label}=</span>
            <span className="font-bold text-blue-700">{value}</span>
          </p>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-900/8 bg-white/70 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          Selected Path
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {routing.selected_path.map((stage) => (
            <span
              key={stage}
              className="rounded-full border border-amber-900/10 bg-amber-600/[0.08] px-3 py-1 text-sm font-medium text-amber-900"
            >
              {stage}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-900/8 bg-white/70 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          Stage Model Plan
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {Object.entries(routing.stage_model_plan).map(([stage, model]) => (
            <div
              key={stage}
              className="rounded-2xl border border-slate-900/8 bg-slate-50/80 px-4 py-3 text-sm text-slate-700"
            >
              <span className="font-semibold text-slate-950">{stage}</span>: {model}
            </div>
          ))}
        </div>
      </div>

      {/* <ul className="mt-4 grid gap-3">
        {routing.reasons.map((reason, index) => (
          <li
            key={`${reason}-${index}`}
            className="rounded-2xl border border-slate-900/8 bg-white/70 px-4 py-3 text-sm leading-7 text-slate-700"
          >
            {reason}
          </li>
        ))}
      </ul> */}
    </section>
  );
}
