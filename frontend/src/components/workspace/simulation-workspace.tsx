import { useEffect, useState, type FormEvent } from "react";

import { AppShell, type WorkspaceView } from "@/components/app/app-shell";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { DecisionComposerPage } from "@/components/decision/decision-composer-page";
import { InsightsPage } from "@/components/insights/insights-page";
import { RecordsPage } from "@/components/records/records-page";
import { ReportPage } from "@/components/report/report-page";
import { useUiLocale } from "@/components/providers/ui-locale-provider";
import { useCasePresets } from "@/hooks/use-case-presets";
import { usePriorityCatalog } from "@/hooks/use-priority-catalog";
import { useSessionMemory } from "@/hooks/use-session-memory";
import { useSimulationSubmit } from "@/hooks/use-simulation-submit";
import {
  FALLBACK_MAX_PRIORITY_SELECTIONS,
  listPriorityGroupsForCategory,
  type PriorityLocale,
} from "@/lib/priorities";
import {
  initialForm,
  type FormState,
  type OptionFollowupState,
  type PrioritySelection,
} from "@/lib/simulation/form";
import type { CasePresetCategory } from "@/lib/types";

export default function SimulationWorkspace() {
  const { locale: uiLocale } = useUiLocale();
  const [activeView, setActiveView] = useState<WorkspaceView>("dashboard");
  const [form, setForm] = useState<FormState>(initialForm);
  const simulation = useSimulationSubmit();
  const sessionMemory = useSessionMemory();
  const {
    catalog: priorityCatalog,
    priorityError,
    isPriorityLoading,
  } = usePriorityCatalog();
  const maxPrioritySelections =
    priorityCatalog?.maxSelections ?? FALLBACK_MAX_PRIORITY_SELECTIONS;
  const {
    result,
    error,
    isLoading,
    latestVersion,
    progress,
    submit,
    submitReevaluation,
    resetOutput,
    versions,
  } = simulation;
  const {
    presets,
    selectedCategory,
    selectedPresetId,
    presetCategories,
    visiblePresets,
    presetError,
    isPresetLoading,
    applyPreset,
    handleCategoryChange,
  } = useCasePresets({
    locale: uiLocale,
    maxPrioritySelections,
    onApplyFormState: setForm,
    onClearSimulation: resetOutput,
  });
  const priorityGroups = priorityCatalog
    ? listPriorityGroupsForCategory(priorityCatalog, selectedCategory)
    : [];

  useEffect(() => {
    if (result && !isLoading) {
      setActiveView("report");
    }
  }, [isLoading, result]);

  function navigate(view: WorkspaceView) {
    setActiveView(view);
  }

  function startNew() {
    resetOutput();
    setActiveView("compose");
  }

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
    setActiveView("report");
    await submit(form, uiLocale, priorityCatalog, {
      priorMemory: sessionMemory.priorMemory,
    });
  }

  async function handleFollowupSubmit(followup: OptionFollowupState) {
    if (!latestVersion) {
      return;
    }

    setActiveView("report");
    await submitReevaluation(latestVersion, followup, uiLocale);
  }

  function applyPresetById(presetId: string) {
    const nextPreset = presets.find((preset) => preset.id === presetId);
    if (nextPreset) {
      applyPreset(nextPreset);
    }
  }

  function changeCategory(category: CasePresetCategory) {
    handleCategoryChange(category);
  }

  return (
    <AppShell
      activeView={activeView}
      onNavigate={navigate}
      onStartNew={startNew}
    >
      {activeView === "dashboard" ? (
        <DashboardPage
          locale={uiLocale as PriorityLocale}
          latestVersion={latestVersion}
          versions={versions}
          decisions={sessionMemory.decisions}
          presets={presets}
          onStartNew={startNew}
          onOpenReport={() => setActiveView("report")}
          onOpenRecords={() => setActiveView("records")}
        />
      ) : null}

      {activeView === "compose" ? (
        <DecisionComposerPage
          locale={uiLocale as PriorityLocale}
          form={form}
          isLoading={isLoading}
          priorityCatalog={priorityCatalog}
          priorityGroups={priorityGroups}
          isPriorityLoading={isPriorityLoading}
          priorityError={priorityError}
          selectedCategory={selectedCategory}
          selectedPresetId={selectedPresetId}
          presetCategories={presetCategories}
          visiblePresets={visiblePresets}
          presetError={presetError}
          isPresetLoading={isPresetLoading}
          maxPrioritySelections={maxPrioritySelections}
          onUpdateField={updateFormField}
          onUpdatePrioritySlot={updatePrioritySlot}
          onCategoryChange={changeCategory}
          onApplyPresetById={applyPresetById}
          onSubmit={handleSubmit}
        />
      ) : null}

      {activeView === "report" ? (
        <ReportPage
          locale={uiLocale as PriorityLocale}
          result={result}
          latestVersion={latestVersion}
          versions={versions}
          isLoading={isLoading}
          error={error}
          progress={progress}
          priorityCatalog={priorityCatalog}
          decisions={sessionMemory.decisions}
          sessionMemory={{
            saveDecision: sessionMemory.saveDecision,
            deleteDecision: sessionMemory.deleteDecision,
            clearDecisions: sessionMemory.clearDecisions,
            syncStatus: sessionMemory.syncStatus,
            syncError: sessionMemory.syncError,
          }}
          onStartNew={startNew}
          onSubmitReevaluation={handleFollowupSubmit}
        />
      ) : null}

      {activeView === "records" ? (
        <RecordsPage
          latestVersion={latestVersion}
          decisions={sessionMemory.decisions}
          sessionMemory={{
            saveDecision: sessionMemory.saveDecision,
            deleteDecision: sessionMemory.deleteDecision,
            clearDecisions: sessionMemory.clearDecisions,
            syncStatus: sessionMemory.syncStatus,
            syncError: sessionMemory.syncError,
          }}
          onStartNew={startNew}
        />
      ) : null}

      {activeView === "insights" ? (
        <InsightsPage
          latestVersion={latestVersion}
          versions={versions}
          decisions={sessionMemory.decisions}
          progress={progress}
        />
      ) : null}
    </AppShell>
  );
}
