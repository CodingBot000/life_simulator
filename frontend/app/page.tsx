"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import { useUiLocale } from "@/components/providers/ui-locale-provider";
import type {
  AbReasoningResult,
  AdvisorResult,
  CasePreset,
  CasePresetCategory,
  ExecutionMode,
  GuardrailResult,
  PlannerResult,
  ReflectionResult,
  RiskResult,
  RiskTolerance,
  SimulationRequest,
  SimulationProgressEvent,
  SimulationStageExecutionKind,
  SimulationStageName,
  ScenarioResult,
  SimulationResponse,
  StateContext,
} from "@/lib/types";
import { SIMULATION_STAGE_ORDER } from "@/lib/types";
import {
  getPriorityLabel,
  MAX_PRIORITY_SELECTIONS,
  PRIORITY_DEFINITIONS,
  PRIORITY_GROUP_LABELS,
  PRIORITY_GROUP_ORDER,
  type PriorityId,
  type PriorityLocale,
  listPriorityDefinitionsByGroup,
  normalizePriorityIds,
} from "@/lib/priorities";

type PrioritySelection = PriorityId | "";
type FormState = {
  age: string;
  job: string;
  risk_tolerance: RiskTolerance;
  priority: PrioritySelection[];
  optionA: string;
  optionB: string;
  context: string;
};

const initialForm: FormState = {
  age: "32",
  job: "developer",
  risk_tolerance: "medium",
  priority: ["stability", "income", "work_life_balance"],
  optionA: "현재 회사에 남는다",
  optionB: "스타트업으로 이직한다",
  context: "현재 연봉은 안정적이지만 성장 정체를 느끼고 있다.",
};

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080"
).replace(/\/$/u, "");

function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

const CASE_CATEGORY_ORDER: CasePresetCategory[] = [
  "career",
  "relationship",
  "finance",
  "living",
  "education",
  "health",
  "other",
];

type StageProgressStatus =
  | "pending"
  | "active"
  | "completed"
  | "skipped"
  | "failed";

type StageProgressEntry = {
  status: StageProgressStatus;
  executionKind: SimulationStageExecutionKind | null;
  model: string | null;
  fallbackUsed: boolean;
  fallbackReason: string | null;
};

type SimulationProgressState = {
  requestId: string | null;
  traceId: string | null;
  executionMode: ExecutionMode | null;
  selectedPath: string[];
  stages: Record<SimulationStageName, StageProgressEntry>;
};

const EXECUTION_MODE_LABELS: Record<ExecutionMode, string> = {
  light: "Light",
  standard: "Standard",
  careful: "Careful",
  full: "Full",
};

const STAGE_METADATA: Record<
  SimulationStageName,
  {
    label: string;
    summary: string;
  }
> = {
  state_loader: {
    label: "State Loader",
    summary: "입력 상태를 구조화합니다.",
  },
  planner: {
    label: "Planner",
    summary: "판단 프레임과 비교 요인을 정리합니다.",
  },
  scenario_a: {
    label: "Scenario A",
    summary: "선택지 A의 미래 시나리오를 펼칩니다.",
  },
  scenario_b: {
    label: "Scenario B",
    summary: "선택지 B의 미래 시나리오를 펼칩니다.",
  },
  risk_a: {
    label: "Risk A",
    summary: "선택지 A의 리스크를 평가합니다.",
  },
  risk_b: {
    label: "Risk B",
    summary: "선택지 B의 리스크를 평가합니다.",
  },
  ab_reasoning: {
    label: "A/B Reasoning",
    summary: "두 판단 후보를 비교합니다.",
  },
  guardrail: {
    label: "Guardrail",
    summary: "안전장치와 경고 신호를 점검합니다.",
  },
  advisor: {
    label: "Advisor",
    summary: "최종 판단을 정리합니다.",
  },
  reflection: {
    label: "Reflection",
    summary: "결과를 검토하고 보정합니다.",
  },
};

const STAGE_STATUS_LABELS: Record<StageProgressStatus, string> = {
  pending: "대기",
  active: "진행 중",
  completed: "완료",
  skipped: "건너뜀",
  failed: "실패",
};

const EXECUTION_KIND_LABELS: Record<SimulationStageExecutionKind, string> = {
  llm: "LLM",
  deterministic: "Rule",
  derived: "Derived",
};

const REFLECTION_COPY = {
  ko: {
    title: "결과 검증",
    cautions: "유의할 점",
    suggestedActions: "다음 제안",
  },
  en: {
    title: "Result Review",
    cautions: "Key Cautions",
    suggestedActions: "Suggested Actions",
  },
} as const;

const TEXT_TOKEN_REPLACEMENTS_BY_LOCALE: Record<
  PriorityLocale,
  Array<{
    pattern: RegExp;
    replacement: string;
  }>
> = {
  ko: [
    {
      pattern: /stateContext\.state_summary의 current_constraint/g,
      replacement: "상태 요약의 현재 제약",
    },
    {
      pattern: /state_summary\.current_constraint/g,
      replacement: "상태 요약의 현재 제약",
    },
    {
      pattern: /profile_state\.top_priorities/g,
      replacement: "핵심 우선순위",
    },
    {
      pattern: /user_state\.situational_state/g,
      replacement: "현재 상황",
    },
    {
      pattern: /user_state\.profile_state/g,
      replacement: "프로필 상태",
    },
    {
      pattern: /user_state\.memory_state/g,
      replacement: "기억 상태",
    },
    {
      pattern: /\bstateContext\.state_summary\b/g,
      replacement: "상태 요약",
    },
    {
      pattern: /\bstate_summary\b/g,
      replacement: "상태 요약",
    },
    {
      pattern: /\bprofile_state\b/g,
      replacement: "프로필 상태",
    },
    {
      pattern: /\bsituational_state\b/g,
      replacement: "현재 상황",
    },
    {
      pattern: /\bmemory_state\b/g,
      replacement: "기억 상태",
    },
    {
      pattern: /\bcurrent_constraint\b/g,
      replacement: "현재 제약",
    },
    {
      pattern: /\bdecision_bias\b/g,
      replacement: "판단 성향",
    },
    {
      pattern: /\bagent_guidance\b/g,
      replacement: "분석 가이드",
    },
    {
      pattern: /\btop_priorities\b/g,
      replacement: "핵심 우선순위",
    },
    {
      pattern: /\brisk_preference\b/g,
      replacement: "위험 선호도",
    },
    {
      pattern: /\bdecision_style\b/g,
      replacement: "의사결정 성향",
    },
    {
      pattern: /\bcareer_stage\b/g,
      replacement: "커리어 단계",
    },
    {
      pattern: /\bfinancial_pressure\b/g,
      replacement: "재정 압박",
    },
    {
      pattern: /\btime_pressure\b/g,
      replacement: "시간 압박",
    },
    {
      pattern: /\bemotional_state\b/g,
      replacement: "정서 상태",
    },
  ],
  en: [
    {
      pattern: /stateContext\.state_summary의 current_constraint/g,
      replacement: "the current constraint from the state summary",
    },
    {
      pattern: /state_summary\.current_constraint/g,
      replacement: "the current constraint from the state summary",
    },
    {
      pattern: /profile_state\.top_priorities/g,
      replacement: "core priorities",
    },
    {
      pattern: /user_state\.situational_state/g,
      replacement: "current situation",
    },
    {
      pattern: /user_state\.profile_state/g,
      replacement: "profile state",
    },
    {
      pattern: /user_state\.memory_state/g,
      replacement: "memory state",
    },
    {
      pattern: /\bstateContext\.state_summary\b/g,
      replacement: "state summary",
    },
    {
      pattern: /\bstate_summary\b/g,
      replacement: "state summary",
    },
    {
      pattern: /\bprofile_state\b/g,
      replacement: "profile state",
    },
    {
      pattern: /\bsituational_state\b/g,
      replacement: "current situation",
    },
    {
      pattern: /\bmemory_state\b/g,
      replacement: "memory state",
    },
    {
      pattern: /\bcurrent_constraint\b/g,
      replacement: "current constraint",
    },
    {
      pattern: /\bdecision_bias\b/g,
      replacement: "decision bias",
    },
    {
      pattern: /\bagent_guidance\b/g,
      replacement: "agent guidance",
    },
    {
      pattern: /\btop_priorities\b/g,
      replacement: "core priorities",
    },
    {
      pattern: /\brisk_preference\b/g,
      replacement: "risk preference",
    },
    {
      pattern: /\bdecision_style\b/g,
      replacement: "decision style",
    },
    {
      pattern: /\bcareer_stage\b/g,
      replacement: "career stage",
    },
    {
      pattern: /\bfinancial_pressure\b/g,
      replacement: "financial pressure",
    },
    {
      pattern: /\btime_pressure\b/g,
      replacement: "time pressure",
    },
    {
      pattern: /\bemotional_state\b/g,
      replacement: "emotional state",
    },
  ],
};

function createInitialProgressState(): SimulationProgressState {
  return {
    requestId: null,
    traceId: null,
    executionMode: null,
    selectedPath: [],
    stages: Object.fromEntries(
      SIMULATION_STAGE_ORDER.map((stageName) => [
        stageName,
        {
          status: "pending",
          executionKind: null,
          model: null,
          fallbackUsed: false,
          fallbackReason: null,
        },
      ]),
    ) as Record<SimulationStageName, StageProgressEntry>,
  };
}

function applyProgressEvent(
  current: SimulationProgressState,
  event: SimulationProgressEvent,
): SimulationProgressState {
  if (event.type === "request_started") {
    return {
      ...createInitialProgressState(),
      requestId: event.request_id,
      traceId: event.trace_id,
    };
  }

  const next: SimulationProgressState = {
    ...current,
    stages: { ...current.stages },
  };

  switch (event.type) {
    case "routing_resolved": {
      next.executionMode = event.execution_mode;
      next.selectedPath = [...event.selected_path];

      for (const stageName of event.skipped_stages) {
        next.stages[stageName] = {
          ...next.stages[stageName],
          status: "skipped",
        };
      }

      return next;
    }
    case "stage_started": {
      next.requestId = event.request_id;
      next.stages[event.stage_name] = {
        status: "active",
        executionKind: event.execution_kind,
        model: event.model ?? next.stages[event.stage_name].model,
        fallbackUsed: false,
        fallbackReason: null,
      };
      return next;
    }
    case "stage_completed": {
      next.requestId = event.request_id;
      next.stages[event.stage_name] = {
        status: "completed",
        executionKind: event.execution_kind,
        model: event.model ?? next.stages[event.stage_name].model,
        fallbackUsed: event.fallback_used ?? false,
        fallbackReason: event.fallback_reason ?? null,
      };
      return next;
    }
    case "error": {
      next.traceId = event.trace_id;

      const activeStage = (SIMULATION_STAGE_ORDER as readonly SimulationStageName[])
        .map((stageName) => ({
          stageName,
          entry: next.stages[stageName],
        }))
        .find(({ entry }) => entry.status === "active");

      if (activeStage) {
        next.stages[activeStage.stageName] = {
          ...activeStage.entry,
          status: "failed",
        };
      }

      return next;
    }
    case "result":
      next.requestId = event.request_id;
      return next;
    default:
      return next;
  }
}

function getCurrentStage(progress: SimulationProgressState): SimulationStageName | null {
  for (const stageName of SIMULATION_STAGE_ORDER) {
    if (progress.stages[stageName].status === "active") {
      return stageName;
    }
  }

  return null;
}

function hasProgressHistory(progress: SimulationProgressState): boolean {
  return Boolean(progress.requestId);
}

function isProgressFinished(progress: SimulationProgressState): boolean {
  return SIMULATION_STAGE_ORDER.every((stageName) => {
    const status = progress.stages[stageName].status;
    return status === "completed" || status === "skipped";
  });
}

function getProgressHeadline(progress: SimulationProgressState): string {
  const currentStage = getCurrentStage(progress);

  if (currentStage) {
    return `${STAGE_METADATA[currentStage].label} 실행 중`;
  }

  if (isProgressFinished(progress)) {
    return "모든 단계 실행이 완료되었습니다.";
  }

  if (progress.executionMode) {
    return `${EXECUTION_MODE_LABELS[progress.executionMode]} 경로가 확정되었습니다.`;
  }

  return "State Loader를 먼저 실행하며 실제 경로를 결정하고 있습니다.";
}

async function readSimulationProgressStream(
  response: Response,
  onEvent: (event: SimulationProgressEvent) => void,
): Promise<SimulationResponse> {
  const reader = response.body?.getReader();

  if (!reader) {
    throw new Error("진행 스트림을 열지 못했습니다.");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let streamResult: SimulationResponse | null = null;
  let streamError: string | null = null;

  function handleLine(rawLine: string) {
    const line = rawLine.trim();

    if (!line) {
      return;
    }

    const event = JSON.parse(line) as SimulationProgressEvent;
    onEvent(event);

    if (event.type === "result") {
      streamResult = event.response;
    }

    if (event.type === "error") {
      streamError = event.error;
    }
  }

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      handleLine(line);
    }

    if (done) {
      if (buffer.trim()) {
        handleLine(buffer);
      }
      break;
    }
  }

  if (streamError) {
    throw new Error(streamError);
  }

  if (!streamResult) {
    throw new Error("시뮬레이션 결과를 받지 못했습니다.");
  }

  return streamResult;
}

function formatUserFacingNarrative(
  text: string,
  locale: PriorityLocale = "ko",
): string {
  let formatted = text;

  for (const { pattern, replacement } of TEXT_TOKEN_REPLACEMENTS_BY_LOCALE[locale]) {
    formatted = formatted.replace(pattern, replacement);
  }

  for (const definition of [...PRIORITY_DEFINITIONS].sort(
    (left, right) => right.id.length - left.id.length,
  )) {
    const pattern = new RegExp(`\\b${definition.id}\\b`, "g");
    const replacement = definition.labels[locale];
    formatted = formatted.replace(pattern, replacement);
  }

  return formatted;
}

function buildPayload(form: FormState): SimulationRequest {
  return {
    userProfile: {
      age: Number(form.age),
      job: form.job.trim(),
      risk_tolerance: form.risk_tolerance,
      priority: normalizePriorityIds(form.priority.filter(Boolean)),
    },
    decision: {
      optionA: form.optionA.trim(),
      optionB: form.optionB.trim(),
      context: form.context.trim(),
    },
  };
}

function buildPrioritySlots(priorities: readonly PriorityId[]): PrioritySelection[] {
  const normalized = normalizePriorityIds(priorities);
  const slots: PrioritySelection[] = [...normalized];

  while (slots.length < MAX_PRIORITY_SELECTIONS) {
    slots.push("");
  }

  return slots;
}

function buildFormState(request: SimulationRequest): FormState {
  return {
    age: String(request.userProfile.age),
    job: request.userProfile.job,
    risk_tolerance: request.userProfile.risk_tolerance,
    priority: buildPrioritySlots(request.userProfile.priority),
    optionA: request.decision.optionA,
    optionB: request.decision.optionB,
    context: request.decision.context,
  };
}

function listPresetCategories(presets: CasePreset[]) {
  return CASE_CATEGORY_ORDER.map((category) => {
    const items = presets.filter((preset) => preset.category === category);

    if (items.length === 0) {
      return null;
    }

    return {
      category,
      label: items[0].categoryLabel,
    };
  }).filter(
    (
      option,
    ): option is {
      category: CasePresetCategory;
      label: string;
    } => Boolean(option),
  );
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
              {formatUserFacingNarrative(factor)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function StateContextCard({
  stateContext,
  locale,
}: {
  stateContext: StateContext;
  locale: PriorityLocale;
}) {
  const { profile_state, situational_state, memory_state } =
    stateContext.user_state;
  const summary = stateContext.state_summary;

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
                      : getPriorityLabel(priority, locale)}
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
                {memory_state.recent_similar_decisions.length > 0 ? (
                  memory_state.recent_similar_decisions.map((item, index) => (
                    <li
                      key={`${item.topic}-${item.selected_option}-${index}`}
                      className="rounded-2xl border border-slate-900/8 bg-slate-50/80 px-4 py-3 text-sm leading-7 text-slate-700"
                    >
                      {item.topic} / {item.selected_option} / {item.outcome_note}
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
                {formatUserFacingNarrative(summary.decision_bias)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">
                Current Constraint
              </p>
              <p className="mt-2 text-sm leading-7 text-white/90">
                {formatUserFacingNarrative(summary.current_constraint)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">
                Agent Guidance
              </p>
              <p className="mt-2 text-sm leading-7 text-white/90">
                {formatUserFacingNarrative(summary.agent_guidance)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RoutingCard({
  routing,
}: {
  routing: SimulationResponse["routing"];
}) {
  return (
    <section className="card-surface rounded-[28px] p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="section-label">Routing</p>
          <h3 className="display-font mt-2 text-xl font-semibold text-slate-900">
            실행 경로 요약
          </h3>
        </div>
        <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold uppercase text-white">
          {routing.execution_mode}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-900/8 bg-white/70 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Risk Band
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-950">
            {routing.risk_profile.risk_band}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-900/8 bg-white/70 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Complexity
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-950">
            {routing.risk_profile.complexity}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-900/8 bg-white/70 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Ambiguity
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-950">
            {routing.risk_profile.ambiguity}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-900/8 bg-white/70 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Model Tier
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-950">
            {routing.risk_profile.model_tier}
          </p>
        </div>
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

      <ul className="mt-4 grid gap-3">
        {routing.reasons.map((reason, index) => (
          <li
            key={`${reason}-${index}`}
            className="rounded-2xl border border-slate-900/8 bg-white/70 px-4 py-3 text-sm leading-7 text-slate-700"
          >
            {reason}
          </li>
        ))}
      </ul>
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

function AdvisorCard({ advisor }: { advisor: AdvisorResult }) {
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

function GuardrailCard({
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

function ReflectionCard({
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

function ProgressStageCard({
  stageName,
  index,
  entry,
}: {
  stageName: SimulationStageName;
  index: number;
  entry: StageProgressEntry;
}) {
  const metadata = STAGE_METADATA[stageName];
  const isActive = entry.status === "active";
  const isFallback = entry.fallbackUsed;
  const badgeLabel = isFallback
    ? "Fallback"
    : entry.model ?? (entry.executionKind ? EXECUTION_KIND_LABELS[entry.executionKind] : null);
  const displayStatusLabel = isFallback ? "Fallback 사용" : STAGE_STATUS_LABELS[entry.status];

  const toneClass =
    isFallback
      ? "border-orange-300 bg-orange-50 text-orange-950 shadow-[0_18px_40px_rgba(234,88,12,0.12)]"
      : entry.status === "completed"
      ? "border-slate-950 bg-slate-950 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
      : entry.status === "active"
        ? "animate-pulse border-amber-500/60 bg-amber-100 text-amber-950 shadow-[0_20px_44px_rgba(217,119,6,0.18)]"
        : entry.status === "skipped"
          ? "border-dashed border-slate-300 bg-slate-100/80 text-slate-500"
          : entry.status === "failed"
            ? "border-rose-300 bg-rose-50 text-rose-950 shadow-[0_18px_40px_rgba(190,24,93,0.12)]"
            : "border-slate-200 bg-white/90 text-slate-600";

  const metaToneClass =
    isFallback
      ? "text-orange-900/70"
      : entry.status === "completed"
      ? "text-white/70"
      : entry.status === "active"
        ? "text-amber-900/70"
        : entry.status === "failed"
          ? "text-rose-900/70"
          : "text-slate-400";

  return (
    <div
      className={`w-full max-w-[240px] rounded-[22px] border px-4 py-3 transition ${toneClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${metaToneClass}`}>
            {String(index + 1).padStart(2, "0")}
          </p>
          <p className="mt-2 text-sm font-semibold">{metadata.label}</p>
        </div>
        {badgeLabel ? (
          <span
            className={`max-w-[112px] break-all rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold leading-4 ${
              isFallback
                ? "border-orange-900/10 bg-white/80 text-orange-900"
                : entry.status === "completed"
                ? "border-white/20 bg-white/10 text-white"
                : entry.status === "active"
                  ? "border-amber-900/10 bg-white/70 text-amber-950"
                  : entry.status === "failed"
                    ? "border-rose-900/10 bg-white/70 text-rose-900"
                    : "border-slate-900/8 bg-white/80 text-slate-600"
            }`}
          >
            {badgeLabel}
          </span>
        ) : null}
      </div>
      <p className={`mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] ${metaToneClass}`}>
        {displayStatusLabel}
      </p>
      <p className={`mt-2 text-xs leading-6 ${isActive ? "text-amber-950/90" : isFallback ? "text-orange-950/80" : entry.status === "completed" ? "text-white/80" : entry.status === "failed" ? "text-rose-900/90" : "text-slate-500"}`}>
        {metadata.summary}
      </p>
      {entry.fallbackReason ? (
        <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-orange-900/80">
          {entry.fallbackReason}
        </p>
      ) : null}
    </div>
  );
}

function LoadingStageStrip({ progress }: { progress: SimulationProgressState }) {
  return (
    <div className="rounded-[24px] border border-slate-900/8 bg-white/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="section-label">Live Progress</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {getProgressHeadline(progress)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isProgressFinished(progress) ? (
            <span className="rounded-full border border-emerald-900/10 bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-900">
              completed
            </span>
          ) : null}
          {progress.executionMode ? (
            <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white">
              {EXECUTION_MODE_LABELS[progress.executionMode]}
            </span>
          ) : (
            <span className="rounded-full border border-amber-900/10 bg-amber-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-amber-900">
              routing
            </span>
          )}
          {progress.traceId ? (
            <span className="rounded-full border border-slate-900/8 bg-white px-3 py-1.5 text-xs font-medium text-slate-500">
              trace {progress.traceId.slice(0, 8)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
        {SIMULATION_STAGE_ORDER.map((stageName, index) => (
          <ProgressStageCard
            key={stageName}
            stageName={stageName}
            index={index}
            entry={progress.stages[stageName]}
          />
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const { locale: uiLocale } = useUiLocale();
  const [form, setForm] = useState<FormState>(initialForm);
  const [presets, setPresets] = useState<CasePreset[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<CasePresetCategory | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [presetError, setPresetError] = useState<string | null>(null);
  const [isPresetLoading, setIsPresetLoading] = useState(true);
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<SimulationProgressState>(() =>
    createInitialProgressState(),
  );
  const presetCategories = listPresetCategories(presets);
  const visiblePresets = selectedCategory
    ? presets.filter((preset) => preset.category === selectedCategory)
    : presets;
  const selectedPreset =
    presets.find((preset) => preset.id === selectedPresetId) ?? null;

  useEffect(() => {
    const controller = new AbortController();

    async function loadPresets() {
      try {
        setIsPresetLoading(true);
        setPresetError(null);

        const response = await fetch(apiUrl("/api/cases"), {
          signal: controller.signal,
        });
        const data = (await response.json()) as {
          cases?: CasePreset[];
          error?: string;
        };

        if (!response.ok || !data.cases) {
          throw new Error(data.error ?? "케이스 목록을 불러오지 못했습니다.");
        }

        setPresets(data.cases);

        if (data.cases.length > 0) {
          setSelectedCategory(data.cases[0].category);
          setSelectedPresetId(data.cases[0].id);
          setForm(buildFormState(data.cases[0].request));
          setResult(null);
          setError(null);
        }
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }

        setPresetError(
          loadError instanceof Error
            ? loadError.message
            : "케이스 목록을 불러오지 못했습니다.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsPresetLoading(false);
        }
      }
    }

    void loadPresets();

    return () => {
      controller.abort();
    };
  }, []);

  function applyPreset(preset: CasePreset) {
    setSelectedCategory(preset.category);
    setSelectedPresetId(preset.id);
    setForm(buildFormState(preset.request));
    setResult(null);
    setError(null);
  }

  function handleCategoryChange(category: CasePresetCategory) {
    setSelectedCategory(category);

    const nextPreset = presets.find((preset) => preset.category === category);

    if (nextPreset) {
      applyPreset(nextPreset);
    } else {
      setSelectedPresetId(null);
      setResult(null);
      setError(null);
    }
  }

  function updateFormField<Key extends keyof FormState>(
    key: Key,
    value: FormState[Key],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
    setResult(null);
    setError(null);
  }

  function updatePrioritySlot(index: number, value: PrioritySelection) {
    const nextPriority = [...form.priority];
    nextPriority[index] = value;

    const deduped = nextPriority.map((item, itemIndex) => {
      if (!item) {
        return item;
      }

      return nextPriority.findIndex((candidate) => candidate === item) === itemIndex
        ? item
        : "";
    });

    updateFormField("priority", deduped);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoading(true);
    setError(null);
    setResult(null);
    setProgress(createInitialProgressState());

    try {
      const response = await fetch(apiUrl("/api/simulate"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-simulate-stream": "ndjson",
          "x-ui-locale": uiLocale,
        },
        body: JSON.stringify(buildPayload(form)),
      });

      const contentType = response.headers.get("content-type") ?? "";

      if (contentType.includes("application/x-ndjson")) {
        const streamedResult = await readSimulationProgressStream(
          response,
          (progressEvent) => {
            setProgress((current) => applyProgressEvent(current, progressEvent));
          },
        );

        setResult(streamedResult);
        return;
      }

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
    <main className="mx-auto min-h-screen w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:min-w-[1120px] lg:px-8 lg:py-10 lg:[overflow-x:clip]">
      <div className="grid gap-8">
        <section className="card-surface-strong min-w-0 rounded-[36px] p-6 sm:p-8">
          <div className="max-w-3xl">
            <p className="section-label">Decision Simulator</p>
            <h1 className="display-font mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              의사결정 시뮬레이션 Agent MVP
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
              사용자 프로필과 두 가지 선택지를 입력하면 State Loader가 먼저
              사용자 상태를 구조화하고, 이어서 Planner, Scenario, Risk, A/B
              Reasoning, Guardrail, Advisor, Reflection 단계가 그 상태를
              공통으로 사용합니다. 실제 실행 경로는 요청 위험도에 따라
              `light`, `standard`, `careful`, `full` 중 하나로 선택됩니다.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {[
              "1. State Loader",
              "2. Planner",
              "3. Scenario A",
              "4. Scenario B",
              "5. Risk A",
              "6. Risk B",
              "7. A/B Reasoning",
              "8. Guardrail",
              "9. Advisor",
              "10. Reflection",
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
            <section className="grid gap-5 rounded-[28px] border border-slate-900/8 bg-white/70 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">Case Presets</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                   예시를 고르면 아래 입력창에 케이스별로 자동으로 채워집니다. 사용방법 이해를 돕기위한 예시일뿐 자유롭게 수정할 수 있습니다.
                  </p>
                </div>

                {selectedPreset ? (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => applyPreset(selectedPreset)}
                    className="inline-flex items-center justify-center rounded-full border border-slate-900/10 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900/20 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    다시 채우기
                  </button>
                ) : null}
              </div>

              {isPresetLoading ? (
                <div className="rounded-[24px] border border-slate-900/8 bg-slate-50/80 px-4 py-4 text-sm leading-7 text-slate-600">
                  케이스 목록을 불러오는 중입니다.
                </div>
              ) : null}

              {presetError ? (
                <div className="rounded-[24px] border border-rose-900/10 bg-rose-50/80 px-4 py-4 text-sm leading-7 text-rose-900">
                  {presetError}
                </div>
              ) : null}

              {!isPresetLoading && !presetError ? (
                <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)]">
                  <InputField label="카테고리">
                    <select
                      value={selectedCategory ?? ""}
                      disabled={isLoading || presetCategories.length === 0}
                      onChange={(event) =>
                        handleCategoryChange(
                          event.target.value as CasePresetCategory,
                        )
                      }
                      className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10"
                    >
                      {presetCategories.map((category) => (
                        <option key={category.category} value={category.category}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </InputField>

                  <InputField label="예시 케이스">
                    <select
                      value={selectedPresetId ?? ""}
                      disabled={isLoading || visiblePresets.length === 0}
                      onChange={(event) => {
                        const nextPreset = visiblePresets.find(
                          (preset) => preset.id === event.target.value,
                        );

                        if (nextPreset) {
                          applyPreset(nextPreset);
                        }
                      }}
                      className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10"
                    >
                      {visiblePresets.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.title}
                        </option>
                      ))}
                    </select>
                  </InputField>
                </div>
              ) : null}

              {/* {selectedPreset ? (
                <div className="rounded-[20px] border border-amber-900/10 bg-amber-50/70 px-4 py-3 text-sm leading-6 text-amber-950">
                  <span className="font-semibold">{selectedPreset.title}</span>
                  <span className="mx-2 text-amber-700/70">·</span>
                  <span className="block truncate sm:inline">
                    {selectedPreset.summary}
                  </span>
                </div>
              ) : null} */}
            </section>

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
                  onChange={(event) => updateFormField("age", event.target.value)}
                  className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10"
                />
              </InputField>

              <InputField label="직업">
                <input
                  required
                  type="text"
                  value={form.job}
                  onChange={(event) => updateFormField("job", event.target.value)}
                  className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10"
                />
              </InputField>

              <InputField label="리스크 허용도">
                <select
                  value={form.risk_tolerance}
                  onChange={(event) =>
                    updateFormField(
                      "risk_tolerance",
                      event.target.value as RiskTolerance,
                    )
                  }
                  className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10"
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
              </InputField>

              <InputField label="우선순위">
                <div className="grid gap-3">
                  {form.priority.map((priority, index) => (
                    <select
                      key={`priority-${index}`}
                      value={priority}
                      onChange={(event) =>
                        updatePrioritySlot(
                          index,
                          event.target.value as PrioritySelection,
                        )
                      }
                      className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10"
                    >
                      <option value="">
                        {index === 0 ? `${index + 1}순위 선택` : `${index + 1}순위 없음`}
                      </option>
                      {PRIORITY_GROUP_ORDER.map((group) => (
                        <optgroup
                          key={group}
                          label={PRIORITY_GROUP_LABELS[group][uiLocale]}
                        >
                          {listPriorityDefinitionsByGroup(group).map((definition) => (
                            <option
                              key={definition.id}
                              value={definition.id}
                              disabled={form.priority.some(
                                (selected, selectedIndex) =>
                                  selectedIndex !== index &&
                                  selected === definition.id,
                              )}
                            >
                              {definition.labels[uiLocale]}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  ))}
                  {/* <p className="text-xs leading-6 text-slate-500">
                    고유 id는 내부적으로 `quality_of_life` 같은 형식으로 유지되고,
                    화면에는 자연어 라벨만 표시됩니다.
                  </p> */}
                </div>
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
                    updateFormField("optionA", event.target.value)
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
                    updateFormField("optionB", event.target.value)
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
                    updateFormField("context", event.target.value)
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

        <section className="grid min-w-0 content-start gap-5">
          {hasProgressHistory(progress) ? (
            <LoadingStageStrip progress={progress} />
          ) : null}

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
              <h2 className="display-font mt-5 text-2xl font-semibold text-slate-950">
                Agent chain 실행 중
              </h2>
              <p className="mt-3">
                단계별 시작과 완료를 실시간으로 반영합니다. 현재 활성 단계는
                강조되어 보이고, 경로가 확정되면 건너뛴 단계와 실행된 단계를
                함께 구분해서 표시합니다.
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
                좌측 폼을 제출하면 state context를 먼저 만들고, 요청 위험도에
                따라 필요한 단계만 실행합니다. 실행 경로와 stage별 모델 계획도
                함께 표시됩니다.
              </p>
            </div>
          ) : null}

          {result ? (
            <>
              <RoutingCard routing={result.routing} />
              <StateContextCard stateContext={result.stateContext} locale={uiLocale} />
              <PlannerCard planner={result.planner} />
              {result.scenarioA ? (
                <TimelineCard title="선택지 A 시나리오" scenario={result.scenarioA} />
              ) : null}
              {result.scenarioB ? (
                <TimelineCard title="선택지 B 시나리오" scenario={result.scenarioB} />
              ) : null}
              {result.riskA ? <RiskCard title="Risk A" risk={result.riskA} /> : null}
              {result.riskB ? <RiskCard title="Risk B" risk={result.riskB} /> : null}
              {result.reasoning ? <ReasoningCard reasoning={result.reasoning} /> : null}
              <GuardrailCard
                guardrail={result.guardrail}
                derived={!result.routing.selected_path.includes("guardrail")}
              />
              <AdvisorCard advisor={result.advisor} />
              <ReflectionCard
                reflection={result.reflection}
                derived={!result.routing.selected_path.includes("reflection")}
                locale={uiLocale}
              />
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}
