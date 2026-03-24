import { runSimulationChain } from "@/lib/agent";
import type {
  DecisionInput,
  RiskTolerance,
  SimulationRequest,
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
  };
}

export async function POST(request: Request) {
  try {
    const body = validateRequestBody(await request.json());
    const result = await runSimulationChain(body.userProfile, body.decision);

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
