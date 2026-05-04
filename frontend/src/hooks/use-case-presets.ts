import { useEffect, useMemo, useState } from "react";

import { fetchCasePresets } from "@/lib/api/cases";
import type { FormState } from "@/lib/simulation/form";
import { buildFormState } from "@/lib/simulation/form";
import type { PriorityLocale } from "@/lib/priorities";
import type {
  CasePreset,
  CasePresetCategory,
  LocalizedText,
} from "@/lib/types";

const CASE_CATEGORY_ORDER: CasePresetCategory[] = [
  "career",
  "relationship",
  "finance",
  "living",
  "education",
  "health",
  "other",
];

export function getLocalizedText(
  labels: Partial<LocalizedText> | undefined,
  locale: PriorityLocale,
  fallback: string,
) {
  return labels?.[locale]?.trim() || labels?.ko?.trim() || labels?.en?.trim() || fallback;
}

function listPresetCategories(presets: CasePreset[], locale: PriorityLocale) {
  return CASE_CATEGORY_ORDER.map((category) => {
    const items = presets.filter((preset) => preset.category === category);

    if (items.length === 0) {
      return null;
    }

    return {
      category,
      label: getLocalizedText(
        items[0].categoryLabels,
        locale,
        items[0].categoryLabel,
      ),
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

export function useCasePresets({
  locale,
  onApplyFormState,
  onClearSimulation,
}: {
  locale: PriorityLocale;
  onApplyFormState: (form: FormState) => void;
  onClearSimulation: () => void;
}) {
  const [presets, setPresets] = useState<CasePreset[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<CasePresetCategory | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [presetError, setPresetError] = useState<string | null>(null);
  const [isPresetLoading, setIsPresetLoading] = useState(true);

  const presetCategories = useMemo(
    () => listPresetCategories(presets, locale),
    [locale, presets],
  );
  const visiblePresets = useMemo(
    () =>
      selectedCategory
        ? presets.filter((preset) => preset.category === selectedCategory)
        : presets,
    [presets, selectedCategory],
  );
  const selectedPreset = useMemo(
    () => presets.find((preset) => preset.id === selectedPresetId) ?? null,
    [presets, selectedPresetId],
  );

  function applyPreset(preset: CasePreset) {
    setSelectedCategory(preset.category);
    setSelectedPresetId(preset.id);
    onApplyFormState(buildFormState(preset.request));
    onClearSimulation();
  }

  function handleCategoryChange(category: CasePresetCategory) {
    setSelectedCategory(category);

    const nextPreset = presets.find((preset) => preset.category === category);

    if (nextPreset) {
      applyPreset(nextPreset);
    } else {
      setSelectedPresetId(null);
      onClearSimulation();
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadPresets() {
      try {
        setIsPresetLoading(true);
        setPresetError(null);

        const nextPresets = await fetchCasePresets(controller.signal);
        setPresets(nextPresets);

        if (nextPresets.length > 0) {
          const firstPreset = nextPresets[0];
          setSelectedCategory(firstPreset.category);
          setSelectedPresetId(firstPreset.id);
          onApplyFormState(buildFormState(firstPreset.request));
          onClearSimulation();
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
  }, [onApplyFormState, onClearSimulation]);

  return {
    presets,
    selectedCategory,
    selectedPresetId,
    selectedPreset,
    presetCategories,
    visiblePresets,
    presetError,
    isPresetLoading,
    applyPreset,
    handleCategoryChange,
  };
}
