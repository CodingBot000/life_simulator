import { randomUUID } from "node:crypto";

import { runSimulationRequest } from "@/server/agent/simulation-service";
import { enqueueRequestLogJob } from "@/server/logging/service";
import {
  recordDegradedResponse,
  recordRequestFailure,
  recordRequestSuccess,
} from "@/server/monitoring/prometheus";
import { buildDegradedResponse } from "@/server/resilience/fallback";
import { checkRateLimit } from "@/server/routing/rate-limit";
import type {
  DecisionInput,
  MemoryDecisionRecord,
  MemoryState,
  RiskTolerance,
  SimulationRequest,
  StateHints,
  UserProfile,
} from "@/lib/types";
import {
  isPriorityId,
  MAX_PRIORITY_SELECTIONS,
  normalizePriorityIds,
  type PriorityId,
} from "@/lib/priorities";

export const runtime = "nodejs";

const ROUTE_NAME = "simulate";

function getHeader(request: Request, name: string): string | undefined {
  const value = request.headers.get(name);
  return value?.trim() ? value.trim() : undefined;
}

function resolveIdentity(request: Request) {
  const userId = getHeader(request, "x-user-id");
  const sessionId = getHeader(request, "x-session-id");
  const traceId = getHeader(request, "x-trace-id") ?? randomUUID();
  const forwardedFor = getHeader(request, "x-forwarded-for");
  const rateLimitKey = userId ?? forwardedFor ?? sessionId ?? "anonymous";

  if (process.env.REQUIRE_SIM_AUTH === "true" && !userId) {
    const error = new Error("Authentication required: provide x-user-id.");
    (error as Error & { code?: string }).code = "auth_required";
    throw error;
  }

  return {
    userId,
    sessionId,
    traceId,
    rateLimitKey,
  };
}

function toErrorCode(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "unknown_error";
  }

  const candidate = error as { code?: unknown };
  return typeof candidate.code === "string" ? candidate.code : "internal_error";
}

function shouldReturnDegraded(errorCode: string): boolean {
  return [
    "stage_timeout",
    "deadline_exceeded",
    "schema_validation_failed",
    "empty_provider_response",
  ].includes(errorCode);
}

function serializeHeaderPlan(plan: Record<string, string>): string {
  return Object.entries(plan)
    .map(([stage, model]) => `${stage}:${model}`)
    .join(",");
}

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

function ensurePriorityArray(value: unknown, fieldName: string): PriorityId[] {
  const normalized = ensureStringArray(value, fieldName);
  const priorities = normalizePriorityIds(normalized);

  if (priorities.length === 0) {
    throw new Error(
      `Invalid request: ${fieldName} must contain at least one valid priority id.`,
    );
  }

  if (priorities.length > MAX_PRIORITY_SELECTIONS) {
    throw new Error(
      `Invalid request: ${fieldName} must contain at most ${MAX_PRIORITY_SELECTIONS} items.`,
    );
  }

  if (
    normalized.some((priority) => !isPriorityId(priority)) ||
    priorities.length !== normalized.length
  ) {
    throw new Error(
      `Invalid request: ${fieldName} must contain unique canonical priority ids only.`,
    );
  }

  return priorities;
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
            )
              ? ensurePriorityArray(
                  profile.top_priorities,
                  "state_hints.profile_state.top_priorities",
                )
              : undefined,
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
    priority: ensurePriorityArray(profile.priority, "priority"),
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
  const startedAt = Date.now();
  let traceId: string = randomUUID();

  try {
    const identity = resolveIdentity(request);
    traceId = identity.traceId;
    const body = validateRequestBody(await request.json());
    const rateLimit = checkRateLimit(identity.rateLimitKey);

    if (!rateLimit.allowed) {
      recordRequestFailure(ROUTE_NAME, Date.now() - startedAt, "rate_limited");

      return Response.json(
        {
          error: "Rate limit exceeded.",
          trace_id: traceId,
          reset_at: rateLimit.resetAt,
        },
        {
          status: 429,
          headers: {
            "x-trace-id": traceId,
            "x-ratelimit-reset": rateLimit.resetAt,
          },
        },
      );
    }

    const result = await runSimulationRequest(
      body.userProfile,
      body.decision,
      body.prior_memory,
      body.state_hints,
      {
        userId: identity.userId,
        sessionId: identity.sessionId,
        traceId: identity.traceId,
      },
    );

    await enqueueRequestLogJob(result.envelope);
    recordRequestSuccess(ROUTE_NAME, Date.now() - startedAt);

    return Response.json(result.response, {
      headers: {
        "x-request-id": result.executionContext.request_id,
        "x-trace-id": result.executionContext.trace_id,
        "x-llm-model": result.executionContext.selected_model,
        "x-llm-execution-mode": result.executionContext.execution_mode,
        "x-llm-selected-path": result.executionContext.selected_path.join(","),
        "x-llm-stage-model-plan": serializeHeaderPlan(
          result.executionContext.stage_model_plan,
        ),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Simulation failed due to an unknown server error.";
    const errorCode = toErrorCode(error);

    console.error("[simulate] error", error);

    if (message.startsWith("Authentication required")) {
      recordRequestFailure(ROUTE_NAME, Date.now() - startedAt, errorCode);

      return Response.json(
        {
          error: message,
          trace_id: traceId,
        },
        {
          status: 401,
          headers: {
            "x-trace-id": traceId,
          },
        },
      );
    }

    if (shouldReturnDegraded(errorCode)) {
      const degraded = buildDegradedResponse({
        requestId: randomUUID(),
        traceId,
        routeName: ROUTE_NAME,
        message,
        selectedModel: getHeader(request, "x-llm-model"),
        errorCode,
      });

      recordRequestFailure(ROUTE_NAME, Date.now() - startedAt, errorCode);
      recordDegradedResponse(ROUTE_NAME, errorCode);

      return Response.json(degraded, {
        status: 503,
        headers: {
          "x-trace-id": traceId,
        },
      });
    }

    const status = message.startsWith("Invalid request") ? 400 : 500;
    recordRequestFailure(ROUTE_NAME, Date.now() - startedAt, errorCode);

    return Response.json(
      {
        error: message,
        trace_id: traceId,
      },
      {
        status,
        headers: {
          "x-trace-id": traceId,
        },
      },
    );
  }
}
