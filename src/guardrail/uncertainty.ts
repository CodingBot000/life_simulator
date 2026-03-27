import type { GuardrailReasoningSignals } from "../lib/types.ts";

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
}

export interface UncertaintyEvaluationResult {
  uncertainty_score: number;
  reasoning_signals: GuardrailReasoningSignals;
}

const AMBIGUOUS_WORDING_REGEX =
  /\b(?:maybe|possibly|unclear|uncertain|unsure|not sure|ambiguous|tbd)\b|애매|불명확|확실치 않|미정|잘 모르|불확실/u;

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function inferAmbiguousWording(textSegments: string[] = []): boolean {
  return AMBIGUOUS_WORDING_REGEX.test(textSegments.join(" "));
}

export function buildReasoningSignals(
  input: UncertaintyEvaluationInput,
): GuardrailReasoningSignals {
  const conflictingSignals =
    input.conflict_count > 0 ||
    input.a_recommendation !== input.b_recommendation;
  const missingContext = input.state_unknown_count > 0;
  const weakEvidence =
    input.final_confidence < 0.7 ||
    Math.min(input.a_confidence, input.b_confidence) < 0.64;
  const ambiguousWording =
    input.ambiguous_wording ?? inferAmbiguousWording(input.text_segments);
  const repeatedEvidence = (input.evidence_repeat_count ?? 0) >= 2;
  const strongConsensus =
    input.a_recommendation === input.b_recommendation &&
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
  const repeatedEvidenceCount = Math.max(
    0,
    Math.min(3, input.evidence_repeat_count ?? 0),
  );
  const missingContextPenalty = Math.min(0.32, input.state_unknown_count * 0.14);
  const conflictPenalty = Math.min(0.28, input.conflict_count * 0.14);
  const weakEvidencePenalty = reasoningSignals.weak_evidence ? 0.18 : 0;
  const ambiguousPenalty = reasoningSignals.ambiguous_wording ? 0.08 : 0;
  const lowConsensusPenalty =
    input.a_recommendation !== input.b_recommendation ? 0.06 : 0;
  const confidencePenalty = Math.max(0, 0.7 - input.final_confidence) * 0.28;
  const strongConsensusCredit = reasoningSignals.strong_consensus ? 0.16 : 0;
  const repeatedEvidenceCredit = repeatedEvidenceCount * 0.04;
  const uncertaintyScore = clamp(
    Number(
      (
        0.18 +
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
  );

  return {
    uncertainty_score: uncertaintyScore,
    reasoning_signals: reasoningSignals,
  };
}
