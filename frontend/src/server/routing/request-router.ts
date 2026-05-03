import type {
  SimulationRequest,
  SimulationRoutingSummary,
  StateContext,
} from "../../lib/types.ts";
import {
  evaluateCostPolicy,
  type RequestRiskProfile,
} from "../cost/cost-policy.ts";
import {
  estimateCostForTokens,
  getRoutingModelCandidates,
} from "../llm/model-registry.ts";

export const FULL_SELECTED_PATH = [
  "planner",
  "scenario",
  "risk",
  "ab_reasoning",
  "guardrail",
  "advisor",
  "reflection",
] as const;

const SELECTED_PATH_BY_MODE = {
  light: ["planner", "advisor"],
  standard: ["planner", "scenario", "advisor"],
  careful: ["planner", "scenario", "risk", "advisor"],
  full: [...FULL_SELECTED_PATH],
} as const;

type StagePlan = Record<string, string>;

export interface RoutingDecision {
  routeName: string;
  selectedPath: string[];
  selectedModel: string;
  executionMode: SimulationRoutingSummary["execution_mode"];
  stageModelPlan: StagePlan;
  stageFallbackPlan: StagePlan;
  fallbackModel?: string;
  estimatedCostUsd: number;
  reasons: string[];
  riskProfile: RequestRiskProfile;
}

function buildStagePlans(
  riskProfile: RequestRiskProfile,
): Pick<RoutingDecision, "selectedModel" | "fallbackModel" | "stageModelPlan" | "stageFallbackPlan"> {
  const candidates = getRoutingModelCandidates();
  const usePremiumRiskStages = riskProfile.riskBand === "high";
  const usePremiumAdvisorStages =
    riskProfile.executionMode === "full" || riskProfile.ambiguity !== "low";
  const stageModelPlan: StagePlan = {
    state_loader: candidates.lowCost,
    planner: candidates.lowCost,
    advisor: usePremiumAdvisorStages ? candidates.premium : candidates.lowCost,
  };
  const stageFallbackPlan: StagePlan = {
    state_loader: candidates.lowCostFallback,
    planner: candidates.lowCostFallback,
    advisor: usePremiumAdvisorStages
      ? candidates.premiumFallback
      : candidates.lowCostFallback,
  };

  if (riskProfile.executionMode !== "light") {
    stageModelPlan.scenario_a = candidates.lowCost;
    stageModelPlan.scenario_b = candidates.lowCost;
    stageFallbackPlan.scenario_a = candidates.lowCostFallback;
    stageFallbackPlan.scenario_b = candidates.lowCostFallback;
  }

  if (riskProfile.executionMode === "careful" || riskProfile.executionMode === "full") {
    stageModelPlan.risk_a = usePremiumRiskStages
      ? candidates.premium
      : candidates.lowCost;
    stageModelPlan.risk_b = usePremiumRiskStages
      ? candidates.premium
      : candidates.lowCost;
    stageFallbackPlan.risk_a = usePremiumRiskStages
      ? candidates.premiumFallback
      : candidates.lowCostFallback;
    stageFallbackPlan.risk_b = usePremiumRiskStages
      ? candidates.premiumFallback
      : candidates.lowCostFallback;
  }

  if (riskProfile.executionMode === "full") {
    stageModelPlan.ab_reasoning = candidates.premium;
    stageModelPlan.guardrail = "deterministic";
    stageModelPlan.reflection = candidates.premium;
    stageFallbackPlan.ab_reasoning = candidates.premiumFallback;
    stageFallbackPlan.reflection = candidates.premiumFallback;
  }

  return {
    selectedModel: stageModelPlan.advisor,
    fallbackModel: stageFallbackPlan.advisor,
    stageModelPlan,
    stageFallbackPlan,
  };
}

export function buildRoutingDecision(
  input: SimulationRequest,
  stateContext?: StateContext,
  routeName = "simulate",
): RoutingDecision {
  const riskProfile = evaluateCostPolicy(input, stateContext);
  const plans = buildStagePlans(riskProfile);

  return {
    routeName,
    selectedPath: [...SELECTED_PATH_BY_MODE[riskProfile.executionMode]],
    selectedModel: plans.selectedModel,
    executionMode: riskProfile.executionMode,
    stageModelPlan: plans.stageModelPlan,
    stageFallbackPlan: plans.stageFallbackPlan,
    fallbackModel: plans.fallbackModel,
    estimatedCostUsd: estimateCostForTokens(plans.selectedModel, {
      inputTokens: riskProfile.estimatedTokens,
      outputTokens: Math.ceil(riskProfile.estimatedTokens * 0.4),
      totalTokens: Math.ceil(riskProfile.estimatedTokens * 1.4),
    }),
    reasons: riskProfile.reasons,
    riskProfile,
  };
}
