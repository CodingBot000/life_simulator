import {
  DEFAULT_GUARDRAIL_THRESHOLD_SET,
  getGuardrailMaxScore,
  getGuardrailThresholdSet,
} from "../../config/guardrail-thresholds.ts";
import {
  evaluateGuardrailArtifacts,
  type GuardrailEvaluationActual,
} from "../../lib/guardrail-eval.ts";
import type {
  AbReasoningResult,
  AdvisorResult,
  GuardrailReasoningSignals,
  RiskResult,
  SimulationRequest,
  StateContext,
} from "../../lib/types.ts";
import type { RequestRiskProfile } from "../cost/cost-policy.ts";

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

function toRiskScore(level: RequestRiskProfile["riskBand"]): number {
  if (level === "high") {
    return 0.82;
  }

  if (level === "medium") {
    return 0.56;
  }

  return 0.28;
}

function toBand(value: number): "low" | "medium" | "high" {
  if (value >= 0.72) {
    return "high";
  }

  if (value >= 0.42) {
    return "medium";
  }

  return "low";
}

function deriveReasoningSignals(params: {
  riskProfile: RequestRiskProfile;
  advisor: AdvisorResult;
  riskA?: RiskResult;
  riskB?: RiskResult;
}): GuardrailReasoningSignals {
  const repeatedEvidence =
    Boolean(params.riskA && params.riskB) &&
    params.riskA?.risk_level === params.riskB?.risk_level;

  return {
    conflicting_signals: false,
    missing_context:
      params.riskProfile.ambiguity !== "low" ||
      params.riskProfile.stateUnknownCount >= 2,
    weak_evidence:
      params.advisor.confidence < 0.62 ||
      params.riskProfile.executionMode === "light",
    ambiguous_wording: params.riskProfile.ambiguity !== "low",
    strong_consensus:
      params.advisor.decision !== "undecided" && params.advisor.confidence >= 0.72,
    repeated_evidence: repeatedEvidence,
  };
}

function buildDerivedReason(triggers: string[], executionMode: string): string {
  if (triggers.includes("high_risk") && triggers.includes("ambiguity_high")) {
    return `Derived guardrail kept ${executionMode} mode in a cautious state because both risk and ambiguity remained elevated.`;
  }

  if (triggers.includes("high_risk")) {
    return `Derived guardrail escalated to cautious mode because downstream risk remained high for the current request.`;
  }

  if (triggers.includes("low_confidence")) {
    return `Derived guardrail escalated to cautious mode because advisor confidence remained low.`;
  }

  if (triggers.includes("ambiguity_high")) {
    return `Derived guardrail escalated to cautious mode because ambiguity remained visible after selective execution.`;
  }

  return `Derived guardrail stayed normal because the selected ${executionMode} path did not surface strong risk or ambiguity triggers.`;
}

export function deriveSelectiveGuardrailEvaluation(params: {
  input: SimulationRequest;
  stateContext: StateContext;
  riskProfile: RequestRiskProfile;
  advisor: AdvisorResult;
  riskA?: RiskResult;
  riskB?: RiskResult;
}): GuardrailEvaluationActual {
  const thresholds = getGuardrailThresholdSet(DEFAULT_GUARDRAIL_THRESHOLD_SET);
  const maxScore = getGuardrailMaxScore(thresholds);
  const riskLevel =
    params.riskA?.risk_level === "high" || params.riskB?.risk_level === "high"
      ? "high"
      : params.riskA?.risk_level === "medium" || params.riskB?.risk_level === "medium"
        ? "medium"
        : params.riskProfile.riskBand;
  const riskScore =
    params.riskA && params.riskB
      ? Math.max(
          params.riskA.structured_assessment?.risk_score ?? toRiskScore(params.riskA.risk_level),
          params.riskB.structured_assessment?.risk_score ?? toRiskScore(params.riskB.risk_level),
        )
      : toRiskScore(riskLevel);
  const ambiguityHigh =
    params.riskProfile.ambiguity === "high" || params.riskProfile.stateUnknownCount >= 3;
  const lowConfidence = params.advisor.confidence < 0.62;
  const uncertaintyScore = Number(
    Math.max(
      0.18,
      Math.min(
        0.88,
        0.18 +
          (params.riskProfile.ambiguity === "high"
            ? 0.34
            : params.riskProfile.ambiguity === "medium"
              ? 0.18
              : 0) +
          (params.riskProfile.stateUnknownCount >= 3 ? 0.14 : 0) +
          (params.riskProfile.executionMode === "light" ? 0.1 : 0),
      ),
    ).toFixed(4),
  );
  const reasoningSignals = deriveReasoningSignals(params);
  const triggers: GuardrailEvaluationActual["detected_triggers"] = [];

  if (ambiguityHigh) {
    triggers.push("ambiguity_high");
  }

  if (riskLevel === "high") {
    triggers.push("high_risk");
  }

  if (lowConfidence) {
    triggers.push("low_confidence");
  }

  const thresholdScore = Number(
    Math.min(
      maxScore,
      (riskLevel === "high" ? thresholds.riskWeight : riskLevel === "medium" ? thresholds.riskWeight * 0.55 : thresholds.riskWeight * 0.25) +
        uncertaintyScore * thresholds.uncertaintyWeight +
        (triggers.length > 0 ? thresholds.escalationWeight * 0.4 : 0) +
        (lowConfidence ? thresholds.confidenceWeight : 0),
    ).toFixed(4),
  );
  const rawMode = triggers.length > 0 ? "cautious" : "normal";
  const reason = buildDerivedReason(triggers, params.riskProfile.executionMode);

  return {
    risk_level: riskLevel,
    guardrail_mode: rawMode === "normal" ? "normal" : "careful",
    raw_guardrail_mode: rawMode,
    threshold_adjusted: false,
    calibration_adjusted: false,
    threshold_set: DEFAULT_GUARDRAIL_THRESHOLD_SET,
    threshold_score: thresholdScore,
    threshold_score_ratio: Number((thresholdScore / maxScore).toFixed(4)),
    risk_score: Number(riskScore.toFixed(4)),
    confidence_score: Number(params.advisor.confidence.toFixed(4)),
    uncertainty_score: uncertaintyScore,
    deterministic_mode: true,
    scoring_input_source: params.riskA && params.riskB ? "structured_only" : "legacy_fallback",
    generation_variance_flag: params.riskProfile.executionMode === "light",
    confidence_band: toBand(params.advisor.confidence),
    uncertainty_band: toBand(uncertaintyScore),
    detected_triggers: triggers,
    reasoning_signals: reasoningSignals,
    scoring_inputs: {
      risk_factors: [
        ...(params.riskA?.structured_assessment?.risk_factors ?? []),
        ...(params.riskB?.structured_assessment?.risk_factors ?? []),
      ].slice(0, 6),
      conflict: false,
      missing_info: reasoningSignals.missing_context,
      risk_score: Number(riskScore.toFixed(4)),
      low_confidence: lowConfidence,
    },
    score_breakdown: {
      ...(ambiguityHigh ? { ambiguity_high: Number((uncertaintyScore * 0.6).toFixed(4)) } : {}),
      ...(riskLevel === "high" ? { high_risk: Number((riskScore * 0.7).toFixed(4)) } : {}),
      ...(lowConfidence ? { low_confidence: Number(((1 - params.advisor.confidence) * 0.5).toFixed(4)) } : {}),
    },
    effective_thresholds: {
      carefulMin: thresholds.carefulMin,
      blockMin: thresholds.blockMin,
      maxScore,
    },
    guardrail_result: {
      guardrail_triggered: triggers.length > 0,
      triggers,
      strategy: triggers.flatMap((trigger) => {
        if (trigger === "ambiguity_high") {
          return ["ask_more_info"] as const;
        }

        if (trigger === "high_risk") {
          return ["risk_warning"] as const;
        }

        if (trigger === "low_confidence") {
          return ["soft_recommendation"] as const;
        }

        return [];
      }),
      risk_score: Number(riskScore.toFixed(4)),
      confidence_score: Number(params.advisor.confidence.toFixed(4)),
      uncertainty_score: uncertaintyScore,
      reasoning_signals: reasoningSignals,
      final_mode: rawMode,
    },
    signals: {
      state_unknown_count: params.riskProfile.stateUnknownCount,
      final_confidence: Number(params.advisor.confidence.toFixed(4)),
      a_confidence:
        params.advisor.decision === "A"
          ? Number(params.advisor.confidence.toFixed(4))
          : 0.5,
      b_confidence:
        params.advisor.decision === "B"
          ? Number(params.advisor.confidence.toFixed(4))
          : 0.5,
      a_recommendation: "A",
      b_recommendation: "B",
      conflict_count: 0,
      risk_a: params.riskA?.risk_level ?? riskLevel,
      risk_b: params.riskB?.risk_level ?? riskLevel,
      ambiguous_wording: params.riskProfile.ambiguity !== "low",
      evidence_repeat_count: 0,
      user_input: params.input.decision.context,
      user_context: params.input,
      context_text: [
        params.stateContext.state_summary.decision_bias,
        params.stateContext.state_summary.current_constraint,
        params.stateContext.state_summary.agent_guidance,
      ].join(" "),
      scenario_text: "",
      risk_text: [
        ...(params.riskA?.reasons ?? []),
        ...(params.riskB?.reasons ?? []),
        ...params.riskProfile.reasons,
      ].join(" "),
      structured_risk_factors: [
        ...(params.riskA?.structured_assessment?.risk_factors ?? []),
        ...(params.riskB?.structured_assessment?.risk_factors ?? []),
      ].slice(0, 6),
      structured_conflict: false,
      structured_missing_info: reasoningSignals.missing_context,
      structured_risk_score: Number(riskScore.toFixed(4)),
      structured_low_confidence: lowConfidence,
    },
    reason,
  };
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
