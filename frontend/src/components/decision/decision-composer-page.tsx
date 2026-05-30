import { useState, type FormEvent, type ReactNode } from "react";

import { InputField } from "@/components/simulation/shared";
import { Drawer } from "@/components/ui/drawer";
import { InlineBanner } from "@/components/ui/inline-banner";
import { getLocalizedText } from "@/hooks/use-case-presets";
import type {
  CasePresetCategory,
  RiskTolerance,
} from "@/lib/types";
import {
  getPriorityGroupLabel,
  listPriorityDefinitionsByGroup,
  type PriorityCatalog,
  type PriorityLocale,
} from "@/lib/priorities";
import type { FormState, PrioritySelection } from "@/lib/simulation/form";

export function DecisionComposerPage({
  locale,
  form,
  isLoading,
  priorityCatalog,
  priorityGroups,
  isPriorityLoading,
  priorityError,
  selectedCategory,
  selectedPresetId,
  presetCategories,
  visiblePresets,
  presetError,
  isPresetLoading,
  maxPrioritySelections,
  onUpdateField,
  onUpdatePrioritySlot,
  onCategoryChange,
  onApplyPresetById,
  onSubmit,
}: {
  locale: PriorityLocale;
  form: FormState;
  isLoading: boolean;
  priorityCatalog?: PriorityCatalog | null;
  priorityGroups: ReturnType<typeof import("@/lib/priorities").listPriorityGroupsForCategory>;
  isPriorityLoading: boolean;
  priorityError: string | null;
  selectedCategory: CasePresetCategory | null;
  selectedPresetId: string | null;
  presetCategories: Array<{ category: CasePresetCategory; label: string }>;
  visiblePresets: Array<{
    id: string;
    title: string;
    titleLabels?: Partial<Record<PriorityLocale, string>>;
  }>;
  presetError: string | null;
  isPresetLoading: boolean;
  maxPrioritySelections: number;
  onUpdateField: <Key extends keyof FormState>(
    key: Key,
    value: FormState[Key],
  ) => void;
  onUpdatePrioritySlot: (index: number, value: PrioritySelection) => void;
  onCategoryChange: (category: CasePresetCategory) => void;
  onApplyPresetById: (presetId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
}) {
  const [templateOpen, setTemplateOpen] = useState(false);

  return (
    <>
      <form className="grid gap-6" onSubmit={onSubmit}>
        <section className="card-surface-strong rounded-[32px] p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <p className="section-label">New Decision</p>
              <h2 className="display-font mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                새 의사결정 작성
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                무엇을 입력해야할지 모르시겠나요? 자동으로 채워주는 템플릿이
                준비되어있습니다.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setTemplateOpen(true)}
                  className="inline-flex items-center justify-center rounded-full border border-slate-900/10 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  템플릿에서 시작
                </button>
              </div>
            </div>

            <DraftSummary form={form} maxPrioritySelections={maxPrioritySelections} />
          </div>
        </section>

        <section className="card-surface rounded-[28px] p-5">
          <div className="grid gap-6">
            <ComposerSection title="상황" description="현재 고민을 정리합니다.">
              <ContextStep form={form} disabled={isLoading} onUpdateField={onUpdateField} />
            </ComposerSection>

            <ComposerSection title="선택지" description="비교할 두 가지 선택을 적습니다.">
              <OptionsStep form={form} disabled={isLoading} onUpdateField={onUpdateField} />
            </ComposerSection>

            <ComposerSection
              title="프로필"
              description="우선순위와 리스크 성향을 반영합니다."
            >
              <ProfileStep
                locale={locale}
                form={form}
                disabled={isLoading}
                priorityCatalog={priorityCatalog}
                priorityGroups={priorityGroups}
                isPriorityLoading={isPriorityLoading}
                priorityError={priorityError}
                onUpdateField={onUpdateField}
                onUpdatePrioritySlot={onUpdatePrioritySlot}
              />
            </ComposerSection>
          </div>

          <div className="mt-6 flex justify-end border-t border-slate-900/8 pt-5">
            <button
              type="submit"
              disabled={
                isLoading ||
                isPriorityLoading ||
                Boolean(priorityError) ||
                !priorityCatalog
              }
              className="inline-flex min-w-[220px] items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isLoading ? "리포트 생성 중..." : "리포트 생성"}
            </button>
          </div>
        </section>
      </form>

      <Drawer
        title="템플릿에서 시작"
        description="예시 케이스는 입력을 빠르게 이해하기 위한 출발점입니다. 적용 후 자유롭게 수정할 수 있습니다."
        isOpen={templateOpen}
        onClose={() => setTemplateOpen(false)}
      >
        {isPresetLoading ? (
          <InlineBanner title="템플릿을 불러오는 중입니다." />
        ) : null}
        {presetError ? (
          <InlineBanner tone="error" title="템플릿을 불러오지 못했습니다.">
            {presetError}
          </InlineBanner>
        ) : null}
        {!isPresetLoading && !presetError ? (
          <div className="grid gap-5">
            <InputField label="카테고리">
              <select
                value={selectedCategory ?? ""}
                disabled={isLoading || presetCategories.length === 0}
                onChange={(event) =>
                  onCategoryChange(event.target.value as CasePresetCategory)
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
                  onApplyPresetById(event.target.value);
                  setTemplateOpen(false);
                }}
                className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10"
              >
                {visiblePresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {getLocalizedText(preset.titleLabels, locale, preset.title)}
                  </option>
                ))}
              </select>
            </InputField>
          </div>
        ) : null}
      </Drawer>
    </>
  );
}

function ComposerSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-900/8 bg-white/65 p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function ContextStep({
  form,
  disabled,
  onUpdateField,
}: {
  form: FormState;
  disabled: boolean;
  onUpdateField: <Key extends keyof FormState>(
    key: Key,
    value: FormState[Key],
  ) => void;
}) {
  return (
    <InputField label="현재 상황 설명">
      <textarea
        required
        rows={4}
        value={form.context}
        disabled={disabled}
        onChange={(event) => onUpdateField("context", event.target.value)}
        className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10 disabled:cursor-not-allowed disabled:bg-slate-50"
      />
    </InputField>
  );
}

function OptionsStep({
  form,
  disabled,
  onUpdateField,
}: {
  form: FormState;
  disabled: boolean;
  onUpdateField: <Key extends keyof FormState>(
    key: Key,
    value: FormState[Key],
  ) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <InputField label="선택지 A">
        <input
          required
          type="text"
          value={form.optionA}
          disabled={disabled}
          onChange={(event) => onUpdateField("optionA", event.target.value)}
          className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10 disabled:cursor-not-allowed disabled:bg-slate-50"
        />
      </InputField>
      <InputField label="선택지 B">
        <input
          required
          type="text"
          value={form.optionB}
          disabled={disabled}
          onChange={(event) => onUpdateField("optionB", event.target.value)}
          className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10 disabled:cursor-not-allowed disabled:bg-slate-50"
        />
      </InputField>
    </div>
  );
}

function ProfileStep({
  locale,
  form,
  disabled,
  priorityCatalog,
  priorityGroups,
  isPriorityLoading,
  priorityError,
  onUpdateField,
  onUpdatePrioritySlot,
}: {
  locale: PriorityLocale;
  form: FormState;
  disabled: boolean;
  priorityCatalog?: PriorityCatalog | null;
  priorityGroups: ReturnType<typeof import("@/lib/priorities").listPriorityGroupsForCategory>;
  isPriorityLoading: boolean;
  priorityError: string | null;
  onUpdateField: <Key extends keyof FormState>(
    key: Key,
    value: FormState[Key],
  ) => void;
  onUpdatePrioritySlot: (index: number, value: PrioritySelection) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <InputField label="나이">
        <input
          required
          min={1}
          max={120}
          type="number"
          value={form.age}
          disabled={disabled}
          onChange={(event) => onUpdateField("age", event.target.value)}
          className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10 disabled:cursor-not-allowed disabled:bg-slate-50"
        />
      </InputField>
      <InputField label="직업">
        <input
          required
          type="text"
          value={form.job}
          disabled={disabled}
          onChange={(event) => onUpdateField("job", event.target.value)}
          className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10 disabled:cursor-not-allowed disabled:bg-slate-50"
        />
      </InputField>
      <InputField label="리스크 허용도">
        <select
          value={form.risk_tolerance}
          disabled={disabled}
          onChange={(event) =>
            onUpdateField("risk_tolerance", event.target.value as RiskTolerance)
          }
          className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10 disabled:cursor-not-allowed disabled:bg-slate-50"
        >
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
        </select>
      </InputField>
      <InputField label="우선순위">
        <div className="grid gap-3">
          {isPriorityLoading ? (
            <p className="rounded-2xl border border-slate-900/8 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
              우선순위 목록을 불러오는 중입니다.
            </p>
          ) : null}
          {priorityError ? (
            <p className="rounded-2xl border border-rose-900/10 bg-rose-50/80 px-4 py-3 text-sm text-rose-900">
              {priorityError}
            </p>
          ) : null}
          {form.priority.map((priority, index) => (
            <select
              key={`priority-${index}`}
              value={priority}
              disabled={
                disabled ||
                isPriorityLoading ||
                Boolean(priorityError) ||
                !priorityCatalog
              }
              onChange={(event) =>
                onUpdatePrioritySlot(index, event.target.value as PrioritySelection)
              }
              className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10 disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              <option value="">
                {index === 0 ? `${index + 1}순위 선택` : `${index + 1}순위 없음`}
              </option>
              {priorityGroups.map((group) => (
                <optgroup key={group.id} label={getPriorityGroupLabel(group, locale)}>
                  {(priorityCatalog
                    ? listPriorityDefinitionsByGroup(priorityCatalog, group.id)
                    : []
                  ).map((definition) => (
                    <option
                      key={definition.id}
                      value={definition.id}
                      disabled={form.priority.some(
                        (selected, selectedIndex) =>
                          selectedIndex !== index && selected === definition.id,
                      )}
                    >
                      {definition.labels[locale]}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          ))}
        </div>
      </InputField>
    </div>
  );
}

function DraftSummary({
  form,
  maxPrioritySelections,
}: {
  form: FormState;
  maxPrioritySelections: number;
}) {
  const filledPriorities = form.priority.filter(Boolean).length;

  return (
    <aside className="rounded-[24px] border border-slate-900/8 bg-white/75 p-5">
      <p className="section-label">Draft Summary</p>
      <div className="mt-4 grid gap-3 text-sm">
        <SummaryLine label="상황" value={form.context ? "작성됨" : "비어 있음"} />
        <SummaryLine label="선택지" value={`${form.optionA || "-"} / ${form.optionB || "-"}`} />
        <SummaryLine label="프로필" value={`${form.age}세 · ${form.job || "-"}`} />
        <SummaryLine
          label="우선순위"
          value={`${filledPriorities}/${maxPrioritySelections}`}
        />
      </div>
    </aside>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-950">{value}</span>
    </div>
  );
}
