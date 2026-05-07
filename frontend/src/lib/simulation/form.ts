import {
  FALLBACK_MAX_PRIORITY_SELECTIONS,
  normalizePriorityIds,
  type PriorityCatalog,
  type PriorityId,
} from "@/lib/priorities";
import type { RiskTolerance, SimulationRequest } from "@/lib/types";

export type PrioritySelection = PriorityId | "";

export type FormState = {
  age: string;
  job: string;
  risk_tolerance: RiskTolerance;
  priority: PrioritySelection[];
  optionA: string;
  optionB: string;
  context: string;
};

export const initialForm: FormState = {
  age: "32",
  job: "developer",
  risk_tolerance: "medium",
  priority: ["stability", "income", "work_life_balance"],
  optionA: "현재 회사에 남는다",
  optionB: "스타트업으로 이직한다",
  context: "현재 연봉은 안정적이지만 성장 정체를 느끼고 있다.",
};

export function buildPayload(
  form: FormState,
  priorityCatalog?: PriorityCatalog | null,
): SimulationRequest {
  return {
    userProfile: {
      age: Number(form.age),
      job: form.job.trim(),
      risk_tolerance: form.risk_tolerance,
      priority: normalizePriorityIds(form.priority.filter(Boolean), priorityCatalog),
    },
    decision: {
      optionA: form.optionA.trim(),
      optionB: form.optionB.trim(),
      context: form.context.trim(),
    },
  };
}

export function buildPrioritySlots(
  priorities: readonly PriorityId[],
  maxSelections = FALLBACK_MAX_PRIORITY_SELECTIONS,
): PrioritySelection[] {
  const normalized = normalizePriorityIds(priorities, null).slice(0, maxSelections);
  const slots: PrioritySelection[] = [...normalized];

  while (slots.length < maxSelections) {
    slots.push("");
  }

  return slots;
}

export function buildFormState(
  request: SimulationRequest,
  maxPrioritySelections = FALLBACK_MAX_PRIORITY_SELECTIONS,
): FormState {
  return {
    age: String(request.userProfile.age),
    job: request.userProfile.job,
    risk_tolerance: request.userProfile.risk_tolerance,
    priority: buildPrioritySlots(request.userProfile.priority, maxPrioritySelections),
    optionA: request.decision.optionA,
    optionB: request.decision.optionB,
    context: request.decision.context,
  };
}
