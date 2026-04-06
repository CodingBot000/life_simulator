export type PriorityLocale = "ko" | "en";

export type PriorityGroup =
  | "core"
  | "career"
  | "relationship"
  | "finance"
  | "living"
  | "education"
  | "health";

export const MAX_PRIORITY_SELECTIONS = 3;

export const PRIORITY_GROUP_ORDER: readonly PriorityGroup[] = [
  "core",
  "career",
  "relationship",
  "finance",
  "living",
  "education",
  "health",
] as const;

export const PRIORITY_GROUP_LABELS = {
  core: {
    ko: "공통",
    en: "Core",
  },
  career: {
    ko: "커리어",
    en: "Career",
  },
  relationship: {
    ko: "관계",
    en: "Relationship",
  },
  finance: {
    ko: "재무",
    en: "Finance",
  },
  living: {
    ko: "거주",
    en: "Living",
  },
  education: {
    ko: "학습",
    en: "Education",
  },
  health: {
    ko: "건강",
    en: "Health",
  },
} as const satisfies Record<
  PriorityGroup,
  {
    ko: string;
    en: string;
  }
>;

export const PRIORITY_DEFINITIONS = [
  {
    id: "stability",
    group: "core",
    labels: { ko: "안정성", en: "Stability" },
  },
  {
    id: "growth",
    group: "core",
    labels: { ko: "성장", en: "Growth" },
  },
  {
    id: "income",
    group: "core",
    labels: { ko: "수입", en: "Income" },
  },
  {
    id: "independence",
    group: "core",
    labels: { ko: "독립성", en: "Independence" },
  },
  {
    id: "future_optionality",
    group: "core",
    labels: { ko: "미래 선택지", en: "Future optionality" },
  },
  {
    id: "quality_of_life",
    group: "core",
    labels: { ko: "삶의 질", en: "Quality of life" },
  },
  {
    id: "career_growth",
    group: "career",
    labels: { ko: "커리어 성장", en: "Career growth" },
  },
  {
    id: "career_opportunity",
    group: "career",
    labels: { ko: "커리어 기회", en: "Career opportunity" },
  },
  {
    id: "compensation",
    group: "career",
    labels: { ko: "보상 수준", en: "Compensation" },
  },
  {
    id: "experience",
    group: "career",
    labels: { ko: "경험 확장", en: "Experience" },
  },
  {
    id: "future_opportunity",
    group: "career",
    labels: { ko: "미래 기회", en: "Future opportunity" },
  },
  {
    id: "long_term_growth",
    group: "career",
    labels: { ko: "장기 성장", en: "Long-term growth" },
  },
  {
    id: "ownership",
    group: "career",
    labels: { ko: "주도권", en: "Ownership" },
  },
  {
    id: "short_term_income",
    group: "career",
    labels: { ko: "단기 수입", en: "Short-term income" },
  },
  {
    id: "compatibility",
    group: "relationship",
    labels: { ko: "궁합", en: "Compatibility" },
  },
  {
    id: "emotional_stability",
    group: "relationship",
    labels: { ko: "정서적 안정", en: "Emotional stability" },
  },
  {
    id: "family_planning",
    group: "relationship",
    labels: { ko: "가족 계획", en: "Family planning" },
  },
  {
    id: "long_term_compatibility",
    group: "relationship",
    labels: { ko: "장기적 궁합", en: "Long-term compatibility" },
  },
  {
    id: "personal_space",
    group: "relationship",
    labels: { ko: "개인 공간", en: "Personal space" },
  },
  {
    id: "relationship_stability",
    group: "relationship",
    labels: { ko: "관계 안정성", en: "Relationship stability" },
  },
  {
    id: "trust",
    group: "relationship",
    labels: { ko: "신뢰", en: "Trust" },
  },
  {
    id: "cost_of_living",
    group: "finance",
    labels: { ko: "생활비", en: "Cost of living" },
  },
  {
    id: "financial_efficiency",
    group: "finance",
    labels: { ko: "재무 효율", en: "Financial efficiency" },
  },
  {
    id: "financial_readiness",
    group: "finance",
    labels: { ko: "재정 준비도", en: "Financial readiness" },
  },
  {
    id: "financial_stability",
    group: "finance",
    labels: { ko: "재정 안정성", en: "Financial stability" },
  },
  {
    id: "future_flexibility",
    group: "finance",
    labels: { ko: "미래 유연성", en: "Future flexibility" },
  },
  {
    id: "safety_net",
    group: "finance",
    labels: { ko: "안전망", en: "Safety net" },
  },
  {
    id: "freedom",
    group: "living",
    labels: { ko: "자유", en: "Freedom" },
  },
  {
    id: "mental_space",
    group: "living",
    labels: { ko: "마음의 여유", en: "Mental space" },
  },
  {
    id: "support_system",
    group: "living",
    labels: { ko: "지원 체계", en: "Support system" },
  },
  {
    id: "time_efficiency",
    group: "living",
    labels: { ko: "시간 효율", en: "Time efficiency" },
  },
  {
    id: "employability",
    group: "education",
    labels: { ko: "취업 가능성", en: "Employability" },
  },
  {
    id: "expertise",
    group: "education",
    labels: { ko: "전문성", en: "Expertise" },
  },
  {
    id: "learning",
    group: "education",
    labels: { ko: "학습", en: "Learning" },
  },
  {
    id: "proof_of_ability",
    group: "education",
    labels: { ko: "실력 증명", en: "Proof of ability" },
  },
  {
    id: "skill_depth",
    group: "education",
    labels: { ko: "기술 깊이", en: "Skill depth" },
  },
  {
    id: "energy_management",
    group: "health",
    labels: { ko: "에너지 관리", en: "Energy management" },
  },
  {
    id: "health",
    group: "health",
    labels: { ko: "건강", en: "Health" },
  },
  {
    id: "stress_management",
    group: "health",
    labels: { ko: "스트레스 관리", en: "Stress management" },
  },
  {
    id: "sustainability",
    group: "health",
    labels: { ko: "지속 가능성", en: "Sustainability" },
  },
  {
    id: "work_life_balance",
    group: "health",
    labels: { ko: "워라밸", en: "Work-life balance" },
  },
] as const;

export type PriorityDefinition = (typeof PRIORITY_DEFINITIONS)[number];
export type PriorityId = PriorityDefinition["id"];

const PRIORITY_MAP = Object.fromEntries(
  PRIORITY_DEFINITIONS.map((definition) => [definition.id, definition]),
) as Record<PriorityId, PriorityDefinition>;

export function isPriorityId(value: string): value is PriorityId {
  return value in PRIORITY_MAP;
}

export function listPriorityDefinitionsByGroup(
  group: PriorityGroup,
): PriorityDefinition[] {
  return PRIORITY_DEFINITIONS.filter((definition) => definition.group === group);
}

export function normalizePriorityIds(values: readonly string[]): PriorityId[] {
  const seen = new Set<PriorityId>();
  const normalized: PriorityId[] = [];

  for (const raw of values) {
    const value = raw.trim();

    if (!isPriorityId(value) || seen.has(value)) {
      continue;
    }

    seen.add(value);
    normalized.push(value);

    if (normalized.length >= MAX_PRIORITY_SELECTIONS) {
      break;
    }
  }

  return normalized;
}

function humanizePriorityId(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getPriorityLabel(
  value: string,
  locale: PriorityLocale,
): string {
  if (!isPriorityId(value)) {
    return humanizePriorityId(value);
  }

  return PRIORITY_MAP[value].labels[locale];
}
