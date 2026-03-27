export interface GuardrailThresholdConfig {
  ambiguityUnknownMin: number;
  ambiguityConfidenceMax: number;
  conflictConfidenceMax: number;
  conflictCountMin: number;
  lowConfidenceMax: number;
  sideConfidenceMax: number;
  carefulMin: number;
  blockMin: number;
  riskWeight: number;
  uncertaintyWeight: number;
  escalationWeight: number;
  confidenceWeight: number;
  blockOnHighRiskCombo: boolean;
}

export const guardrailThresholdSets = {
  baseline: {
    ambiguityUnknownMin: 2,
    ambiguityConfidenceMax: 0.65,
    conflictConfidenceMax: 0.8,
    conflictCountMin: 1,
    lowConfidenceMax: 0.68,
    sideConfidenceMax: 0.62,
    carefulMin: 1,
    blockMin: 4,
    riskWeight: 2,
    uncertaintyWeight: 2,
    escalationWeight: 2,
    confidenceWeight: 1,
    blockOnHighRiskCombo: false,
  },
  conservative: {
    ambiguityUnknownMin: 1,
    ambiguityConfidenceMax: 0.67,
    conflictConfidenceMax: 0.83,
    conflictCountMin: 1,
    lowConfidenceMax: 0.71,
    sideConfidenceMax: 0.65,
    carefulMin: 1,
    blockMin: 4,
    riskWeight: 2,
    uncertaintyWeight: 2,
    escalationWeight: 2,
    confidenceWeight: 1,
    blockOnHighRiskCombo: true,
  },
  aggressive: {
    ambiguityUnknownMin: 3,
    ambiguityConfidenceMax: 0.62,
    conflictConfidenceMax: 0.76,
    conflictCountMin: 2,
    lowConfidenceMax: 0.65,
    sideConfidenceMax: 0.58,
    carefulMin: 2,
    blockMin: 5,
    riskWeight: 2,
    uncertaintyWeight: 1,
    escalationWeight: 2,
    confidenceWeight: 1,
    blockOnHighRiskCombo: false,
  },
} as const satisfies Record<string, GuardrailThresholdConfig>;

export type GuardrailThresholdSetName = keyof typeof guardrailThresholdSets;

export const DEFAULT_GUARDRAIL_THRESHOLD_SET: GuardrailThresholdSetName =
  "baseline";

export const GUARDRAIL_THRESHOLD_SET_NAMES = Object.keys(
  guardrailThresholdSets,
) as GuardrailThresholdSetName[];

export function getGuardrailThresholdSet(
  name: GuardrailThresholdSetName = DEFAULT_GUARDRAIL_THRESHOLD_SET,
): GuardrailThresholdConfig {
  return guardrailThresholdSets[name];
}
