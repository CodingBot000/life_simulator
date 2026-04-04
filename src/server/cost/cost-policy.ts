import type { SimulationRequest } from "../../lib/types.ts";

export type ModelTier = "low_cost" | "premium";
export type RiskBand = "low" | "medium" | "high";

export interface RequestRiskProfile {
  modelTier: ModelTier;
  riskBand: RiskBand;
  ambiguous: boolean;
  complexityScore: number;
  estimatedTokens: number;
  reasons: string[];
}

const PREMIUM_KEYWORDS = [
  "quit",
  "resign",
  "startup",
  "marriage",
  "divorce",
  "medical",
  "health",
  "legal",
  "visa",
  "loan",
  "debt",
  "relocation",
  "burnout",
  "창업",
  "퇴사",
  "결혼",
  "이혼",
  "건강",
  "법적",
  "비자",
  "대출",
  "부채",
  "이사",
  "번아웃",
];

const AMBIGUOUS_KEYWORDS = [
  "maybe",
  "not sure",
  "uncertain",
  "conflicted",
  "ambiguous",
  "unsure",
  "고민",
  "애매",
  "확신이 없음",
  "모르겠",
  "갈등",
];

function countKeywordHits(source: string, keywords: readonly string[]): number {
  return keywords.reduce((count, keyword) => count + Number(source.includes(keyword)), 0);
}

function estimateTokenCount(input: SimulationRequest): number {
  const serialized = JSON.stringify(input);
  return Math.max(200, Math.ceil(serialized.length / 4));
}

export function evaluateCostPolicy(input: SimulationRequest): RequestRiskProfile {
  const corpus = [
    input.decision.context,
    input.decision.optionA,
    input.decision.optionB,
    input.userProfile.job,
    input.userProfile.priority.join(" "),
  ]
    .join(" ")
    .toLowerCase();

  const premiumHits = countKeywordHits(corpus, PREMIUM_KEYWORDS);
  const ambiguityHits = countKeywordHits(corpus, AMBIGUOUS_KEYWORDS);
  const longContext = input.decision.context.length > 180;
  const manyPriorities = input.userProfile.priority.length >= 4;
  const lowRiskTolerance = input.userProfile.risk_tolerance === "low";

  let complexityScore = premiumHits * 2 + ambiguityHits;

  if (longContext) {
    complexityScore += 1;
  }

  if (manyPriorities) {
    complexityScore += 1;
  }

  if (lowRiskTolerance) {
    complexityScore += 1;
  }

  const ambiguous = ambiguityHits > 0 || longContext;
  const riskBand: RiskBand =
    complexityScore >= 5 ? "high" : complexityScore >= 3 ? "medium" : "low";
  const modelTier: ModelTier =
    riskBand === "high" || ambiguous ? "premium" : "low_cost";

  const reasons = [
    premiumHits > 0 ? `high-impact keywords=${premiumHits}` : null,
    ambiguityHits > 0 ? `ambiguity keywords=${ambiguityHits}` : null,
    longContext ? "long_context" : null,
    manyPriorities ? "many_priorities" : null,
    lowRiskTolerance ? "low_risk_tolerance" : null,
  ].filter((value): value is string => value !== null);

  return {
    modelTier,
    riskBand,
    ambiguous,
    complexityScore,
    estimatedTokens: estimateTokenCount(input),
    reasons: reasons.length > 0 ? reasons : ["default_low_cost_path"],
  };
}
