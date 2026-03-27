export interface ThresholdPerformanceMetrics {
  total: number;
  preferred_match_count: number;
  preferred_match_rate: number;
  acceptable_match_count: number;
  acceptable_match_rate: number;
  overblocking: number;
  underblocking: number;
}

export interface ThresholdObjectiveWeights {
  preferred_match: number;
  acceptable_match: number;
  overblocking: number;
  underblocking: number;
}

export interface ThresholdObjectiveResult {
  preferred_match_score: number;
  acceptable_match_score: number;
  overblocking_penalty: number;
  underblocking_penalty: number;
  total_score: number;
}

export const GUARDRAIL_THRESHOLD_OBJECTIVE_WEIGHTS: ThresholdObjectiveWeights =
  {
    preferred_match: 2.0,
    acceptable_match: 1.0,
    overblocking: 2.5,
    underblocking: 3.0,
  };

export function computeThresholdObjective(
  metrics: Pick<
    ThresholdPerformanceMetrics,
    | "preferred_match_count"
    | "acceptable_match_count"
    | "overblocking"
    | "underblocking"
  >,
  weights: ThresholdObjectiveWeights = GUARDRAIL_THRESHOLD_OBJECTIVE_WEIGHTS,
): ThresholdObjectiveResult {
  const preferredMatchScore =
    metrics.preferred_match_count * weights.preferred_match;
  const acceptableMatchScore =
    metrics.acceptable_match_count * weights.acceptable_match;
  const overblockingPenalty = metrics.overblocking * weights.overblocking;
  const underblockingPenalty = metrics.underblocking * weights.underblocking;

  return {
    preferred_match_score: preferredMatchScore,
    acceptable_match_score: acceptableMatchScore,
    overblocking_penalty: overblockingPenalty,
    underblocking_penalty: underblockingPenalty,
    total_score: Number(
      (
        preferredMatchScore +
        acceptableMatchScore -
        overblockingPenalty -
        underblockingPenalty
      ).toFixed(4),
    ),
  };
}
