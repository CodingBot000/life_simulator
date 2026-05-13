import {
  FALLBACK_MAX_PRIORITY_SELECTIONS,
  normalizePriorityIds,
  type PriorityCatalog,
  type PriorityId,
} from "@/lib/priorities";
import type {
  DecisionOptionDetails,
  DecisionOptionFollowup,
  MemoryDecisionRecord,
  MemoryState,
  RiskTolerance,
  SimulationRequest,
} from "@/lib/types";

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

export type OptionFollowupState = {
  A: Required<DecisionOptionFollowup>;
  B: Required<DecisionOptionFollowup>;
};

export type BuildPayloadOptions = {
  priorMemory?: Partial<MemoryState>;
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

export const initialOptionFollowup: OptionFollowupState = {
  A: {
    worstCase: "",
    rollbackCondition: "",
  },
  B: {
    worstCase: "",
    rollbackCondition: "",
  },
};

export function buildPayload(
  form: FormState,
  priorityCatalog?: PriorityCatalog | null,
  options?: BuildPayloadOptions,
): SimulationRequest {
  const priorMemory = compactPriorMemory(options?.priorMemory);

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
    ...(priorMemory ? { prior_memory: priorMemory } : {}),
  };
}

export function buildReevaluationPayload(
  previousRequest: SimulationRequest,
  followup: OptionFollowupState,
  iteration: number,
  previousRequestId?: string,
): SimulationRequest {
  return {
    ...previousRequest,
    decision: {
      ...previousRequest.decision,
      optionDetails: buildOptionDetails(followup),
    },
    reevaluation: {
      reason: "option_followup",
      iteration,
      ...(previousRequestId ? { previousRequestId } : {}),
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

function buildOptionDetails(followup: OptionFollowupState): DecisionOptionDetails {
  return {
    A: compactFollowup(followup.A),
    B: compactFollowup(followup.B),
  };
}

function compactFollowup(
  followup: Required<DecisionOptionFollowup>,
): DecisionOptionFollowup {
  const worstCase = trimmedOrUndefined(followup.worstCase);
  const rollbackCondition = trimmedOrUndefined(followup.rollbackCondition);

  return {
    ...(worstCase ? { worstCase } : {}),
    ...(rollbackCondition ? { rollbackCondition } : {}),
  };
}

function trimmedOrUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function compactPriorMemory(
  priorMemory: Partial<MemoryState> | undefined,
): Partial<MemoryState> | undefined {
  if (!priorMemory) {
    return undefined;
  }

  const recentSimilarDecisions = compactMemoryDecisionRecords(
    priorMemory.recent_similar_decisions,
  );
  const repeatedPatterns = compactTextArray(priorMemory.repeated_patterns);
  const consistencyNotes = compactTextArray(priorMemory.consistency_notes);

  const compacted: Partial<MemoryState> = {
    ...(recentSimilarDecisions.length > 0
      ? { recent_similar_decisions: recentSimilarDecisions }
      : {}),
    ...(repeatedPatterns.length > 0 ? { repeated_patterns: repeatedPatterns } : {}),
    ...(consistencyNotes.length > 0 ? { consistency_notes: consistencyNotes } : {}),
  };

  return Object.keys(compacted).length > 0 ? compacted : undefined;
}

function compactMemoryDecisionRecords(
  values: readonly MemoryDecisionRecord[] | undefined,
): MemoryDecisionRecord[] {
  return (values ?? [])
    .map((record) => ({
      topic: record.topic.trim(),
      selected_option: record.selected_option.trim(),
      outcome_note: record.outcome_note.trim(),
    }))
    .filter(
      (record) =>
        record.topic.length > 0 &&
        record.selected_option.length > 0 &&
        record.outcome_note.length > 0,
    );
}

function compactTextArray(values: readonly string[] | undefined): string[] {
  return (values ?? [])
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}
