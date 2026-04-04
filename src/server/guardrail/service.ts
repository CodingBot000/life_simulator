import {
  evaluateGuardrailArtifacts,
  type GuardrailEvaluationActual,
} from "../../lib/guardrail-eval.ts";
import type {
  AbReasoningResult,
  RiskResult,
  SimulationRequest,
  StateContext,
} from "../../lib/types.ts";

export interface GuardrailFlags {
  final_mode: string;
  decision: string;
  risk_level: string;
  triggers: string[];
  confidence: number;
  uncertainty: number;
}

export async function evaluateSimulationGuardrail(params: {
  input: SimulationRequest;
  stateContext: StateContext;
  riskA: RiskResult;
  riskB: RiskResult;
  reasoning: AbReasoningResult;
}): Promise<GuardrailEvaluationActual> {
  return evaluateGuardrailArtifacts({
    stateContext: params.stateContext,
    riskA: params.riskA,
    riskB: params.riskB,
    reasoning: params.reasoning,
    userInput: params.input.decision.context,
    userContext: params.input,
  });
}

export function buildGuardrailFlags(
  evaluation: GuardrailEvaluationActual,
): GuardrailFlags {
  return {
    final_mode: evaluation.guardrail_result.final_mode,
    decision:
      evaluation.guardrail_result.final_mode === "blocked"
        ? "block"
        : evaluation.guardrail_result.final_mode === "cautious"
          ? "review"
          : "allow",
    risk_level: evaluation.risk_level,
    triggers: [...evaluation.detected_triggers],
    confidence: evaluation.confidence_score,
    uncertainty: evaluation.uncertainty_score,
  };
}
