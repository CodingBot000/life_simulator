import type { AdvisorDecision, SimulationResponse } from "@/lib/types";

export type SimulationResultComparison = {
  previousDecision: AdvisorDecision;
  latestDecision: AdvisorDecision;
  recommendationChanged: boolean;
  confidenceDelta: number;
  guardrailModeChanged: boolean;
  executionModeChanged: boolean;
  riskScoreDelta: number;
};

export function compareSimulationResults(
  previous: SimulationResponse,
  latest: SimulationResponse,
): SimulationResultComparison {
  return {
    previousDecision: previous.advisor.decision,
    latestDecision: latest.advisor.decision,
    recommendationChanged: previous.advisor.decision !== latest.advisor.decision,
    confidenceDelta: latest.advisor.confidence - previous.advisor.confidence,
    guardrailModeChanged:
      previous.guardrail.final_mode !== latest.guardrail.final_mode,
    executionModeChanged:
      previous.routing.execution_mode !== latest.routing.execution_mode,
    riskScoreDelta: latest.guardrail.risk_score - previous.guardrail.risk_score,
  };
}

export function formatSignedPercent(delta: number): string {
  const percentage = Math.round(delta * 100);
  return `${percentage > 0 ? "+" : ""}${percentage}%`;
}
