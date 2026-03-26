import { runSimulationChain } from "@/lib/agent";
import type {
  DecisionInput,
  MemoryDecisionRecord,
  MemoryState,
  RiskTolerance,
  SimulationRequest,
  StateHints,
  UserProfile,
} from "@/lib/types";

export const runtime = "nodejs";

function isRiskTolerance(value: unknown): value is RiskTolerance {
  return value === "low" || value === "medium" || value === "high";
}

function ensureString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid request: ${fieldName} must be a non-empty string.`);
  }

  return value.trim();
}

function ensureAge(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    throw new Error("Invalid request: age must be a positive number.");
  }

  return value;
}

function ensureStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid request: ${fieldName} must be an array of strings.`);
  }

  const normalized = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  if (normalized.length === 0) {
    throw new Error(`Invalid request: ${fieldName} must contain at least one item.`);
  }

  return normalized;
}

function ensureOptionalStringArray(
  value: unknown,
  fieldName: string,
): string[] | undefined {
  if (typeof value === "undefined") {
    return undefined;
  }

  return ensureStringArray(value, fieldName);
}

function validateMemoryDecisionRecord(
  value: unknown,
  fieldName: string,
): MemoryDecisionRecord {
  if (!value || typeof value !== "object") {
    throw new Error(`Invalid request: ${fieldName} must be an object.`);
  }

  const record = value as Record<string, unknown>;

  return {
    topic: ensureString(record.topic, `${fieldName}.topic`),
    selected_option: ensureString(
      record.selected_option,
      `${fieldName}.selected_option`,
    ),
    outcome_note: ensureString(record.outcome_note, `${fieldName}.outcome_note`),
  };
}

function validatePriorMemory(value: unknown): Partial<MemoryState> | undefined {
  if (typeof value === "undefined") {
    return undefined;
  }

  if (!value || typeof value !== "object") {
    throw new Error("Invalid request: prior_memory must be an object.");
  }

  const memory = value as Record<string, unknown>;
  const recentSimilar = memory.recent_similar_decisions;

  if (
    typeof recentSimilar !== "undefined" &&
    !Array.isArray(recentSimilar)
  ) {
    throw new Error(
      "Invalid request: prior_memory.recent_similar_decisions must be an array.",
    );
  }

  return {
    recent_similar_decisions: Array.isArray(recentSimilar)
      ? recentSimilar.map((item, index) =>
          validateMemoryDecisionRecord(
            item,
            `prior_memory.recent_similar_decisions[${index}]`,
          ),
        )
      : undefined,
    repeated_patterns: ensureOptionalStringArray(
      memory.repeated_patterns,
      "prior_memory.repeated_patterns",
    ),
    consistency_notes: ensureOptionalStringArray(
      memory.consistency_notes,
      "prior_memory.consistency_notes",
    ),
  };
}

function validateStateHints(value: unknown): StateHints | undefined {
  if (typeof value === "undefined") {
    return undefined;
  }

  if (!value || typeof value !== "object") {
    throw new Error("Invalid request: state_hints must be an object.");
  }

  const hints = value as Record<string, unknown>;
  const profileState = hints.profile_state;
  const situationalState = hints.situational_state;

  if (
    typeof profileState !== "undefined" &&
    (!profileState || typeof profileState !== "object")
  ) {
    throw new Error("Invalid request: state_hints.profile_state must be an object.");
  }

  if (
    typeof situationalState !== "undefined" &&
    (!situationalState || typeof situationalState !== "object")
  ) {
    throw new Error(
      "Invalid request: state_hints.situational_state must be an object.",
    );
  }

  const profile = (profileState ?? {}) as Record<string, unknown>;
  const situational = (situationalState ?? {}) as Record<string, unknown>;

  return {
    profile_state:
      typeof profileState === "undefined"
        ? undefined
        : {
            risk_preference:
              typeof profile.risk_preference === "undefined"
                ? undefined
                : ensureString(
                    profile.risk_preference,
                    "state_hints.profile_state.risk_preference",
                  ),
            decision_style:
              typeof profile.decision_style === "undefined"
                ? undefined
                : ensureString(
                    profile.decision_style,
                    "state_hints.profile_state.decision_style",
                  ),
            top_priorities: ensureOptionalStringArray(
              profile.top_priorities,
              "state_hints.profile_state.top_priorities",
            ),
          },
    situational_state:
      typeof situationalState === "undefined"
        ? undefined
        : {
            career_stage:
              typeof situational.career_stage === "undefined"
                ? undefined
                : ensureString(
                    situational.career_stage,
                    "state_hints.situational_state.career_stage",
                  ),
            financial_pressure:
              typeof situational.financial_pressure === "undefined"
                ? undefined
                : ensureString(
                    situational.financial_pressure,
                    "state_hints.situational_state.financial_pressure",
                  ),
            time_pressure:
              typeof situational.time_pressure === "undefined"
                ? undefined
                : ensureString(
                    situational.time_pressure,
                    "state_hints.situational_state.time_pressure",
                  ),
            emotional_state:
              typeof situational.emotional_state === "undefined"
                ? undefined
                : ensureString(
                    situational.emotional_state,
                    "state_hints.situational_state.emotional_state",
                  ),
          },
  };
}

function validateUserProfile(value: unknown): UserProfile {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid request: userProfile is required.");
  }

  const profile = value as Record<string, unknown>;
  const riskTolerance = profile.risk_tolerance;

  if (!isRiskTolerance(riskTolerance)) {
    throw new Error(
      "Invalid request: risk_tolerance must be low, medium, or high.",
    );
  }

  return {
    age: ensureAge(profile.age),
    job: ensureString(profile.job, "job"),
    risk_tolerance: riskTolerance,
    priority: ensureStringArray(profile.priority, "priority"),
  };
}

function validateDecision(value: unknown): DecisionInput {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid request: decision is required.");
  }

  const decision = value as Record<string, unknown>;

  return {
    optionA: ensureString(decision.optionA, "optionA"),
    optionB: ensureString(decision.optionB, "optionB"),
    context: ensureString(decision.context, "context"),
  };
}

function validateRequestBody(value: unknown): SimulationRequest {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid request body.");
  }

  const body = value as Record<string, unknown>;

  return {
    userProfile: validateUserProfile(body.userProfile),
    decision: validateDecision(body.decision),
    prior_memory: validatePriorMemory(body.prior_memory),
    state_hints: validateStateHints(body.state_hints),
  };
}

export async function POST(request: Request) {
  try {
    const body = validateRequestBody(await request.json());
    const result = await runSimulationChain(
      body.userProfile,
      body.decision,
      body.prior_memory,
      body.state_hints,
    );

    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Simulation failed due to an unknown server error.";

    console.error("[simulate] error", error);

    const status = message.startsWith("Invalid request") ? 400 : 500;

    return Response.json(
      {
        error: message,
      },
      { status },
    );
  }
}
