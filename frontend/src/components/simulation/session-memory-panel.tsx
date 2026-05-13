import { useEffect, useMemo, useState } from "react";

import { InputField } from "@/components/simulation/shared";
import type { SimulationRequest, SimulationResponse } from "@/lib/types";

type SelectedOptionMode = "A" | "B" | "deferred" | "custom";
type SavedSessionDecision = {
  id: string;
  topic: string;
  selected_option: string;
  outcome_note: string;
};
type SessionDecisionInput = {
  topic: string;
  selected_option: string;
  outcome_note: string;
  sourceRequestId?: string;
  sourceCaseId?: string;
};

export function SessionMemoryPanel({
  request,
  response,
  decisions,
  onSave,
  onDelete,
  onClear,
}: {
  request: SimulationRequest;
  response: SimulationResponse;
  decisions: SavedSessionDecision[];
  onSave: (input: SessionDecisionInput) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}) {
  const defaultTopic = useMemo(
    () => defaultMemoryTopic(request, response),
    [request, response],
  );
  const [topic, setTopic] = useState(defaultTopic);
  const [selectedMode, setSelectedMode] = useState<SelectedOptionMode>("A");
  const [customSelectedOption, setCustomSelectedOption] = useState("");
  const [outcomeNote, setOutcomeNote] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const selectedOption = optionText(selectedMode, request, customSelectedOption);
  const canSave =
    topic.trim().length > 0 &&
    selectedOption.trim().length > 0 &&
    outcomeNote.trim().length > 0;

  useEffect(() => {
    setTopic(defaultTopic);
    setSelectedMode("A");
    setCustomSelectedOption("");
    setOutcomeNote("");
    setStatus(null);
  }, [defaultTopic, response.request_id]);

  function handleSave() {
    if (!canSave) {
      setStatus("주제, 선택, 메모를 모두 입력해야 저장됩니다.");
      return;
    }

    onSave({
      topic,
      selected_option: selectedOption,
      outcome_note: outcomeNote,
      sourceRequestId: response.request_id,
      sourceCaseId: response.stateContext.case_id,
    });
    setOutcomeNote("");
    setStatus("저장되었습니다. 다음 시뮬레이션부터 반영됩니다.");
  }

  function handleDelete(id: string) {
    onDelete(id);
    setStatus("삭제되었습니다.");
  }

  function handleClear() {
    if (decisions.length === 0) {
      return;
    }

    if (!window.confirm("이 브라우저에 저장된 세션 메모리를 모두 삭제할까요?")) {
      return;
    }

    onClear();
    setStatus("전체 세션 메모리를 삭제했습니다.");
  }

  return (
    <section className="card-surface rounded-[28px] p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="section-label">Session Memory</p>
          <h3 className="display-font mt-2 text-xl font-semibold text-slate-900">
            이번 선택 기억
          </h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            이 브라우저에만 저장됩니다.
          </p>
        </div>
        <button
          type="button"
          disabled={decisions.length === 0}
          onClick={handleClear}
          className="inline-flex w-fit items-center justify-center rounded-full border border-rose-900/10 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-900 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          전체 초기화
        </button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
        <div className="grid gap-4 rounded-2xl border border-slate-900/8 bg-white/70 p-4">
          <InputField label="기억할 주제">
            <input
              type="text"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10"
            />
          </InputField>

          <InputField label="선택">
            <select
              value={selectedMode}
              onChange={(event) =>
                setSelectedMode(event.target.value as SelectedOptionMode)
              }
              className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10"
            >
              <option value="A">A: {request.decision.optionA}</option>
              <option value="B">B: {request.decision.optionB}</option>
              <option value="deferred">보류</option>
              <option value="custom">직접 입력</option>
            </select>
          </InputField>

          {selectedMode === "custom" ? (
            <InputField label="직접 입력 선택">
              <input
                type="text"
                value={customSelectedOption}
                onChange={(event) => setCustomSelectedOption(event.target.value)}
                className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10"
              />
            </InputField>
          ) : null}

          <InputField label="메모">
            <textarea
              rows={3}
              value={outcomeNote}
              onChange={(event) => setOutcomeNote(event.target.value)}
              className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10"
            />
          </InputField>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              disabled={!canSave}
              onClick={handleSave}
              className="inline-flex w-fit items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              저장
            </button>
            {status ? (
              <p className="text-sm leading-7 text-slate-600">{status}</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-900/8 bg-white/70 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Saved Decisions
          </p>
          <ul className="mt-3 grid gap-2">
            {decisions.length > 0 ? (
              decisions.map((decision) => (
                <li
                  key={decision.id}
                  className="rounded-2xl border border-slate-900/8 bg-slate-50/80 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {decision.topic}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-700">
                        {decision.selected_option}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {decision.outcome_note}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(decision.id)}
                      className="shrink-0 rounded-full border border-slate-900/10 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))
            ) : (
              <li className="rounded-2xl border border-slate-900/8 bg-slate-50/80 px-4 py-3 text-sm leading-7 text-slate-500">
                none
              </li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}

function defaultMemoryTopic(
  request: SimulationRequest,
  response: SimulationResponse,
) {
  const plannerType = response.planner.decision_type.trim();
  if (plannerType) {
    return plannerType;
  }

  return request.decision.context.trim() || "decision";
}

function optionText(
  mode: SelectedOptionMode,
  request: SimulationRequest,
  customSelectedOption: string,
) {
  if (mode === "A") {
    return request.decision.optionA;
  }
  if (mode === "B") {
    return request.decision.optionB;
  }
  if (mode === "deferred") {
    return "보류";
  }
  return customSelectedOption;
}
