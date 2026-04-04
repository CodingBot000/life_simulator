import type { SimulationRequest } from "../../lib/types.ts";
import {
  evaluateCostPolicy,
  type RequestRiskProfile,
} from "../cost/cost-policy.ts";
import {
  estimateCostForTokens,
  getRoutingModelCandidates,
} from "../llm/model-registry.ts";

export const FULL_SELECTED_PATH = [
  "state_loader",
  "planner",
  "scenario",
  "risk",
  "ab_reasoning",
  "guardrail",
  "advisor",
  "reflection",
] as const;

export interface RoutingDecision {
  routeName: string;
  selectedPath: string[];
  selectedModel: string;
  fallbackModel?: string;
  estimatedCostUsd: number;
  reasons: string[];
  riskProfile: RequestRiskProfile;
}

export function buildRoutingDecision(
  input: SimulationRequest,
  routeName = "simulate",
): RoutingDecision {
  const riskProfile = evaluateCostPolicy(input);
  const candidates = getRoutingModelCandidates();
  const selectedModel =
    riskProfile.modelTier === "premium"
      ? candidates.premium
      : candidates.lowCost;
  const fallbackModel =
    riskProfile.modelTier === "premium"
      ? candidates.premiumFallback
      : candidates.lowCostFallback;

  return {
    routeName,
    selectedPath: [...FULL_SELECTED_PATH],
    selectedModel,
    fallbackModel,
    estimatedCostUsd: estimateCostForTokens(selectedModel, {
      inputTokens: riskProfile.estimatedTokens,
      outputTokens: Math.ceil(riskProfile.estimatedTokens * 0.4),
      totalTokens: Math.ceil(riskProfile.estimatedTokens * 1.4),
    }),
    reasons: riskProfile.reasons,
    riskProfile,
  };
}
