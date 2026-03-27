export interface ConfidenceEvaluationInput {
  final_confidence: number;
  a_confidence: number;
  b_confidence: number;
  a_recommendation: "A" | "B";
  b_recommendation: "A" | "B";
  conflict_count: number;
  evidence_repeat_count?: number;
  uncertainty_score: number;
}

export interface ConfidenceEvaluationResult {
  confidence_score: number;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function calculateConfidenceScore(
  input: ConfidenceEvaluationInput,
): ConfidenceEvaluationResult {
  const averageSideConfidence = (input.a_confidence + input.b_confidence) / 2;
  const minSideConfidence = Math.min(input.a_confidence, input.b_confidence);
  const repeatedEvidenceBonus = Math.min(
    0.09,
    (input.evidence_repeat_count ?? 0) * 0.03,
  );
  const consensusBonus =
    input.a_recommendation === input.b_recommendation &&
    input.conflict_count === 0
      ? 0.05
      : 0;
  const conflictPenalty = Math.min(0.15, input.conflict_count * 0.05);
  const baseEvidenceScore =
    input.final_confidence * 0.45 +
    averageSideConfidence * 0.25 +
    minSideConfidence * 0.15;
  const uncertaintyPenalty = input.uncertainty_score * 0.55;
  const confidenceScore = clamp(
    Number(
      (
        baseEvidenceScore -
        uncertaintyPenalty +
        consensusBonus +
        repeatedEvidenceBonus -
        conflictPenalty +
        0.03
      ).toFixed(4),
    ),
  );

  return {
    confidence_score: confidenceScore,
  };
}
