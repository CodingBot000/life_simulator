import type { PriorityLocale } from "./priorities.ts";

export type OutputGlossaryEntry = {
  id: string;
  source: string;
  labels: Record<PriorityLocale, string>;
};

export const USER_FACING_OUTPUT_GLOSSARY: OutputGlossaryEntry[] = [
  {
    id: "workload",
    source: "workload",
    labels: { ko: "업무 부담", en: "workload" },
  },
  {
    id: "time_pressure",
    source: "time pressure",
    labels: { ko: "시간 압박", en: "time pressure" },
  },
  {
    id: "future_optionality",
    source: "future optionality",
    labels: { ko: "미래 선택지", en: "future optionality" },
  },
  {
    id: "downside_risk",
    source: "downside risk",
    labels: { ko: "하방 위험", en: "downside risk" },
  },
  {
    id: "tradeoff",
    source: "tradeoff",
    labels: { ko: "상충 관계", en: "tradeoff" },
  },
  {
    id: "burnout_risk",
    source: "burnout risk",
    labels: { ko: "번아웃 위험", en: "burnout risk" },
  },
  {
    id: "mental_space",
    source: "mental space",
    labels: { ko: "심리적 여유", en: "mental space" },
  },
  {
    id: "financial_pressure",
    source: "financial pressure",
    labels: { ko: "재정 압박", en: "financial pressure" },
  },
  {
    id: "recovery",
    source: "recovery",
    labels: { ko: "회복", en: "recovery" },
  },
  {
    id: "optionality",
    source: "optionality",
    labels: { ko: "선택 가능성", en: "optionality" },
  },
];

export function getOutputGlossary(
  locale: PriorityLocale,
): Record<string, string> {
  return Object.fromEntries(
    USER_FACING_OUTPUT_GLOSSARY.map((entry) => [
      entry.source,
      entry.labels[locale],
    ]),
  );
}
