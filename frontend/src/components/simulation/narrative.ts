import { PRIORITY_DEFINITIONS, type PriorityLocale } from "@/lib/priorities";

export const REFLECTION_COPY = {
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

export function formatUserFacingNarrative(
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

export function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function formatReasoningSignal(label: string) {
  return label.replaceAll("_", " ");
}
