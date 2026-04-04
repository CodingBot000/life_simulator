export interface DriftBaseline {
  allowRate: number;
  reviewRate: number;
  blockRate: number;
  lowConfidenceAllowRate: number;
  schemaFailRate: number;
  fallbackRate: number;
  p95LatencyMs: number;
  avgTokens: number;
  avgCostUsd: number;
  triggerDistribution: Record<string, number>;
}

export interface DriftThresholdConfig {
  minSampleSize: number;
  allowRateDelta: number;
  reviewRateDelta: number;
  blockRateMax: number;
  lowConfidenceAllowRateMax: number;
  schemaFailRateMax: number;
  fallbackRateMax: number;
  p95LatencyMultiplierMax: number;
  avgCostMultiplierMax: number;
  triggerDistributionDelta: number;
}

export const DEFAULT_DRIFT_BASELINE: DriftBaseline = {
  allowRate: 0.82,
  reviewRate: 0.18,
  blockRate: 0,
  lowConfidenceAllowRate: 0,
  schemaFailRate: 0,
  fallbackRate: 0.02,
  p95LatencyMs: 3500,
  avgTokens: 6500,
  avgCostUsd: 0.09,
  triggerDistribution: {
    low_confidence: 0.05,
    reasoning_conflict: 0.04,
    high_risk: 0.08,
    ambiguity_high: 0.03,
  },
};

export const DEFAULT_DRIFT_THRESHOLDS: DriftThresholdConfig = {
  minSampleSize: 10,
  allowRateDelta: 0.08,
  reviewRateDelta: 0.08,
  blockRateMax: 0.02,
  lowConfidenceAllowRateMax: 0,
  schemaFailRateMax: 0.03,
  fallbackRateMax: 0.08,
  p95LatencyMultiplierMax: 1.6,
  avgCostMultiplierMax: 1.4,
  triggerDistributionDelta: 0.08,
};
