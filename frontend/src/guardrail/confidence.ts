import type { RiskFactor } from "../lib/types.ts";

export interface ConfidenceEvaluationInput {
  final_confidence: number;
  a_confidence: number;
  b_confidence: number;
  a_recommendation: "A" | "B";
  b_recommendation: "A" | "B";
  conflict_count: number;
  evidence_repeat_count?: number;
  uncertainty_score: number;
  risk_score?: number;
  risk_factors?: RiskFactor[];
  conflict?: boolean;
  missing_info?: boolean;
  low_confidence?: boolean;
}

export interface ConfidenceEvaluationResult {
  confidence_score: number;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function hasStructuredConfidenceInput(
  input: ConfidenceEvaluationInput,
): input is ConfidenceEvaluationInput &
  Required<
    Pick<
      ConfidenceEvaluationInput,
      "risk_score" | "risk_factors" | "conflict" | "missing_info" | "low_confidence"
    >
  > {
  return (
    typeof input.risk_score === "number" &&
    Array.isArray(input.risk_factors) &&
    typeof input.conflict === "boolean" &&
    typeof input.missing_info === "boolean" &&
    typeof input.low_confidence === "boolean"
  );
}

export function calculateConfidenceScore(
  input: ConfidenceEvaluationInput,
): ConfidenceEvaluationResult {
  if (hasStructuredConfidenceInput(input)) {
    const factorPenalty = Math.min(0.12, input.risk_factors.length * 0.02);
    const conflictPenalty = input.conflict ? 0.1 : 0;
    const missingInfoPenalty = input.missing_info ? 0.05 : 0;
    const lowConfidencePenalty = input.low_confidence ? 0.18 : 0;
    const confidenceScore = clamp(
      Number(
        (
          0.84 -
          input.risk_score * 0.22 -
          factorPenalty -
          conflictPenalty -
          missingInfoPenalty -
          lowConfidencePenalty
        ).toFixed(4),
      ),
      0.3,
      0.85,
    );

    return {
      confidence_score: confidenceScore,
    };
  }

  const averageSideConfidence = (input.a_confidence + input.b_confidence) / 2;
  const minSideConfidence = Math.min(input.a_confidence, input.b_confidence);
  const repeatedEvidenceBonus = Math.min(
    0.06,
    (input.evidence_repeat_count ?? 0) * 0.02,
  );
  const consensusBonus =
    input.a_recommendation === input.b_recommendation &&
    input.conflict_count === 0
      ? 0.04
      : 0;
  const conflictPenalty = Math.min(0.05, input.conflict_count * 0.015);
  const baseEvidenceScore =
    input.final_confidence * 0.5 +
    averageSideConfidence * 0.25 +
    minSideConfidence * 0.15;
  const uncertaintyPenalty = Math.max(0, input.uncertainty_score - 0.2) * 0.18;
  const confidenceScore = clamp(
    Number(
      (
        baseEvidenceScore -
        uncertaintyPenalty +
        consensusBonus +
        repeatedEvidenceBonus -
        conflictPenalty +
        0.08
      ).toFixed(4),
    ),
    0.3,
    0.8,
  );

  return {
    confidence_score: confidenceScore,
  };
}
