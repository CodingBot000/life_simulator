import { useState } from "react";
import type { FormEvent } from "react";

import { useUiLocale } from "@/components/providers/ui-locale-provider";
import { LoadingStageStrip } from "@/components/simulation/progress";
import {
  AdvisorCard,
  GuardrailCard,
  PlannerCard,
  ReasoningCard,
  ReflectionCard,
  RiskCard,
  RoutingCard,
  StateContextCard,
  TimelineCard,
} from "@/components/simulation/result-cards";
import { InputField } from "@/components/simulation/shared";
import { getLocalizedText, useCasePresets } from "@/hooks/use-case-presets";
import { useSimulationSubmit } from "@/hooks/use-simulation-submit";
import type {
  CasePresetCategory,
  RiskTolerance,
} from "@/lib/types";
import {
  PRIORITY_GROUP_LABELS,
  PRIORITY_GROUP_ORDER,
  type PriorityLocale,
  listPriorityDefinitionsByGroup,
} from "@/lib/priorities";
import {
  initialForm,
  type FormState,
  type PrioritySelection,
} from "@/lib/simulation/form";
import { hasProgressHistory } from "@/lib/simulation/progress";

export default function SimulationPage() {
  const { locale: uiLocale, setLocale: setUiLocale } = useUiLocale();
  const [form, setForm] = useState<FormState>(initialForm);
  const simulation = useSimulationSubmit();
  const {
    result,
    error,
    isLoading,
    progress,
    submit,
    resetOutput,
  } = simulation;
  const {
    selectedCategory,
    selectedPresetId,
    selectedPreset,
    presetCategories,
    visiblePresets,
    presetError,
    isPresetLoading,
    applyPreset,
    handleCategoryChange,
  } = useCasePresets({
    locale: uiLocale,
    onApplyFormState: setForm,
    onClearSimulation: resetOutput,
  });

  function updateFormField<Key extends keyof FormState>(
    key: Key,
    value: FormState[Key],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
    resetOutput();
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
    await submit(form, uiLocale);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:min-w-[1120px] lg:px-8 lg:py-10 lg:[overflow-x:clip]">
      <div className="grid gap-8">
        <section className="card-surface-strong min-w-0 rounded-[36px] p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
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

            <div
              aria-label="표시 언어"
              className="inline-flex w-fit shrink-0 rounded-full border border-slate-900/10 bg-white/80 p-1"
            >
              {[
                { locale: "ko", label: "한국어" },
                { locale: "en", label: "EN" },
              ].map((option) => {
                const isSelected = uiLocale === option.locale;

                return (
                  <button
                    key={option.locale}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setUiLocale(option.locale as PriorityLocale)}
                    className={[
                      "rounded-full px-3 py-1.5 text-sm font-semibold transition",
                      isSelected
                        ? "bg-slate-950 text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                    ].join(" ")}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
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
                          {getLocalizedText(
                            preset.titleLabels,
                            uiLocale,
                            preset.title,
                          )}
                        </option>
                      ))}
                    </select>
                  </InputField>
                </div>
              ) : null}

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
                모델 접근, 요청 제한, 실행 오류는 백엔드 응답으로 안내됩니다.
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
