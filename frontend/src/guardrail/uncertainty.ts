import type { GuardrailReasoningSignals, RiskFactor } from "../lib/types.ts";

export interface UncertaintyEvaluationInput {
  state_unknown_count: number;
  final_confidence: number;
  a_confidence: number;
  b_confidence: number;
  a_recommendation: "A" | "B";
  b_recommendation: "A" | "B";
  conflict_count: number;
  ambiguous_wording?: boolean;
  evidence_repeat_count?: number;
  text_segments?: string[];
  risk_score?: number;
  risk_factors?: RiskFactor[];
  conflict?: boolean;
  missing_info?: boolean;
  low_confidence?: boolean;
}

export interface UncertaintyEvaluationResult {
  uncertainty_score: number;
  reasoning_signals: GuardrailReasoningSignals;
}

const AMBIGUOUS_WORDING_REGEX =
  /\b(?:maybe|possibly|unclear|uncertain|unsure|not sure|ambiguous|tbd|lack of information|insufficient information)\b|애매|불명확|확실치 않|미정|잘 모르|모르겠|불확실|정보가 부족|감이 안|판단이 잘 안|정리가 안 됐|계획은 아직 없|이야기한 게 부족/u;

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function hasStructuredUncertaintyInput(
  input: UncertaintyEvaluationInput,
): input is UncertaintyEvaluationInput &
  Required<
    Pick<
      UncertaintyEvaluationInput,
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

export function inferAmbiguousWording(textSegments: string[] = []): boolean {
  return AMBIGUOUS_WORDING_REGEX.test(textSegments.join(" "));
}

export function buildReasoningSignals(
  input: UncertaintyEvaluationInput,
): GuardrailReasoningSignals {
  const conflictingSignals =
    typeof input.conflict === "boolean"
      ? input.conflict
      : input.conflict_count > 0 ||
        input.a_recommendation !== input.b_recommendation;
  const missingContext =
    typeof input.missing_info === "boolean"
      ? input.missing_info
      : input.state_unknown_count > 0;
  const weakEvidence =
    typeof input.low_confidence === "boolean"
      ? input.low_confidence
      : input.final_confidence < 0.66 ||
        Math.min(input.a_confidence, input.b_confidence) < 0.6;
  const ambiguousWording =
    input.ambiguous_wording ?? inferAmbiguousWording(input.text_segments);
  const repeatedEvidence = (input.evidence_repeat_count ?? 0) >= 2;
  const strongConsensus = hasStructuredUncertaintyInput(input)
    ? input.conflict === false &&
      input.missing_info === false &&
      input.low_confidence === false &&
      input.risk_score <= 0.45
    : input.a_recommendation === input.b_recommendation &&
      input.conflict_count === 0 &&
      input.final_confidence >= 0.8 &&
      Math.min(input.a_confidence, input.b_confidence) >= 0.74;

  return {
    conflicting_signals: conflictingSignals,
    missing_context: missingContext,
    weak_evidence: weakEvidence,
    ambiguous_wording: ambiguousWording,
    strong_consensus: strongConsensus,
    repeated_evidence: repeatedEvidence,
  };
}

export function calculateUncertaintyScore(
  input: UncertaintyEvaluationInput,
): UncertaintyEvaluationResult {
  const reasoningSignals = buildReasoningSignals(input);
  if (hasStructuredUncertaintyInput(input)) {
    const factorPenalty = Math.min(0.09, input.risk_factors.length * 0.015);
    const uncertaintyScore = clamp(
      Number(
        (
          0.2 +
          input.risk_score * 0.22 +
          factorPenalty +
          (input.conflict ? 0.12 : 0) +
          (input.missing_info ? 0.08 : 0) +
          (input.low_confidence ? 0.1 : 0)
        ).toFixed(4),
      ),
      0.2,
      0.8,
    );

    return {
      uncertainty_score: uncertaintyScore,
      reasoning_signals: reasoningSignals,
    };
  }

  const repeatedEvidenceCount = Math.max(
    0,
    Math.min(3, input.evidence_repeat_count ?? 0),
  );
  const missingContextPenalty = Math.min(0.12, input.state_unknown_count * 0.05);
  const conflictPenalty = Math.min(0.1, input.conflict_count * 0.04);
  const weakEvidencePenalty = reasoningSignals.weak_evidence ? 0.1 : 0;
  const ambiguousPenalty = reasoningSignals.ambiguous_wording ? 0.02 : 0;
  const lowConsensusPenalty =
    input.a_recommendation !== input.b_recommendation ? 0.02 : 0;
  const confidencePenalty = Math.max(0, 0.66 - input.final_confidence) * 0.12;
  const strongConsensusCredit = reasoningSignals.strong_consensus ? 0.12 : 0;
  const repeatedEvidenceCredit = repeatedEvidenceCount * 0.04;
  const uncertaintyScore = clamp(
    Number(
      (
        0.16 +
        missingContextPenalty +
        conflictPenalty +
        weakEvidencePenalty +
        ambiguousPenalty +
        lowConsensusPenalty +
        confidencePenalty -
        strongConsensusCredit -
        repeatedEvidenceCredit
      ).toFixed(4),
    ),
    0.2,
    0.8,
  );

  return {
    uncertainty_score: uncertaintyScore,
    reasoning_signals: reasoningSignals,
  };
}
