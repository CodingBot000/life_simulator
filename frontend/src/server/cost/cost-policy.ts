import type {
  SimulationRequest,
  StateContext,
} from "../../lib/types.ts";

export type ModelTier = "low_cost" | "premium";
export type RiskBand = "low" | "medium" | "high";
export type ExecutionMode = "light" | "standard" | "careful" | "full";

export interface RequestRiskProfile {
  modelTier: ModelTier;
  riskBand: RiskBand;
  complexity: RiskBand;
  ambiguity: RiskBand;
  executionMode: ExecutionMode;
  stateUnknownCount: number;
  ambiguous: boolean;
  complexityScore: number;
  estimatedTokens: number;
  reasons: string[];
}

const COMPLEXITY_CUES = [
  "하지만",
  "다만",
  "반면",
  "동시에",
  "however",
  "while",
  "yet",
] as const;

const COMPLEXITY_RISK_CUES = [
  "창업",
  "스타트업",
  "startup",
  "이직",
  "해외",
  "유학",
  "이사",
  "relocat",
  "프리랜스",
  "번아웃",
  "대출",
  "manager",
] as const;

const HIGH_RISK_CUES = [
  "대출",
  "부채",
  "loan",
  "debt",
  "건강",
  "번아웃",
  "수면",
  "relationship",
  "연애",
  "결혼",
  "창업",
  "스타트업",
  "startup",
  "이직",
  "해외",
  "유학",
  "이사",
  "relocat",
  "프리랜스",
  "사업",
] as const;

const CAREER_CUES = [
  "연봉",
  "수입",
  "income",
  "career",
  "job",
  "취업",
  "회사",
] as const;

const AMBIGUITY_CUES = [
  "느낌",
  "가능성",
  "고민",
  "부담",
  "애매",
  "불확실",
  "모르겠",
  "uncertain",
  "maybe",
  "could",
] as const;

const LONG_HORIZON_CUES = [
  "장기",
  "미래",
  "선택지",
  "future",
  "optionality",
] as const;

function containsKeyword(source: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => source.includes(keyword));
}

function estimateTokenCount(input: SimulationRequest): number {
  const serialized = JSON.stringify(input);
  return Math.max(200, Math.ceil(serialized.length / 4));
}

function readStateUnknownCount(stateContext?: StateContext): number {
  if (!stateContext) {
    return 0;
  }

  return [
    stateContext.user_state.profile_state.risk_preference,
    stateContext.user_state.profile_state.decision_style,
    stateContext.user_state.situational_state.career_stage,
    stateContext.user_state.situational_state.financial_pressure,
    stateContext.user_state.situational_state.time_pressure,
    stateContext.user_state.situational_state.emotional_state,
  ].filter((value) => value === "unknown" || value === "none").length;
}

function classifyComplexity(
  corpus: string,
  priorityCount: number,
  contextLength: number,
): RiskBand {
  let score = 0;

  if (priorityCount >= 3) {
    score += 1;
  }

  if (contextLength >= 70) {
    score += 1;
  }

  if (containsKeyword(corpus, COMPLEXITY_CUES)) {
    score += 1;
  }

  if (containsKeyword(corpus, COMPLEXITY_RISK_CUES)) {
    score += 1;
  }

  if (score >= 4) {
    return "high";
  }

  if (score >= 2) {
    return "medium";
  }

  return "low";
}

function classifyRiskLevel(
  corpus: string,
  riskTolerance: SimulationRequest["userProfile"]["risk_tolerance"],
): RiskBand {
  let score = 0;

  if (containsKeyword(corpus, ["대출", "부채", "loan", "debt"])) {
    score += 2;
  }

  if (containsKeyword(corpus, ["건강", "번아웃", "수면", "relationship", "연애", "결혼"])) {
    score += 2;
  }

  if (containsKeyword(corpus, HIGH_RISK_CUES)) {
    score += 2;
  }

  if (containsKeyword(corpus, CAREER_CUES)) {
    score += 1;
  }

  if ((riskTolerance === "low" && score >= 3) || score >= 5) {
    return "high";
  }

  if (score >= 2) {
    return "medium";
  }

  return "low";
}

function classifyAmbiguity(
  corpus: string,
  stateUnknownCount: number,
): RiskBand {
  let score = 0;

  if (containsKeyword(corpus, AMBIGUITY_CUES)) {
    score += 1;
  }

  if (containsKeyword(corpus, COMPLEXITY_CUES)) {
    score += 1;
  }

  if (containsKeyword(corpus, LONG_HORIZON_CUES)) {
    score += 1;
  }

  if (stateUnknownCount >= 3) {
    score += 1;
  }

  if (score >= 3) {
    return "high";
  }

  if (score >= 1) {
    return "medium";
  }

  return "low";
}

function determineExecutionMode(
  complexity: RiskBand,
  riskBand: RiskBand,
  ambiguity: RiskBand,
): ExecutionMode {
  if (
    riskBand === "high" ||
    ambiguity === "high" ||
    (complexity === "high" && ambiguity !== "low")
  ) {
    return "full";
  }

  if (
    complexity === "low" &&
    riskBand === "low" &&
    ambiguity === "low"
  ) {
    return "light";
  }

  if (riskBand === "medium") {
    return "careful";
  }

  return "standard";
}

function buildRoutingReason(params: {
  complexity: RiskBand;
  riskBand: RiskBand;
  ambiguity: RiskBand;
  executionMode: ExecutionMode;
  stateUnknownCount: number;
}): string {
  switch (params.executionMode) {
    case "full":
      if (params.riskBand === "high") {
        return "High-impact risk signals require the full reasoning and guardrail path.";
      }

      if (params.ambiguity === "high" && params.stateUnknownCount >= 3) {
        return "Ambiguity plus missing state signals require the full path.";
      }

      if (params.ambiguity === "high") {
        return "Interpretation ambiguity is high enough to require the full path.";
      }

      return "Complexity and ambiguity together require the full path.";
    case "careful":
      return "Risk inspection is warranted, but a full reasoning/reflection pass is not yet required.";
    case "standard":
      return "A scenario comparison is sufficient for this request without the full escalation chain.";
    case "light":
      return "Complexity, risk, and ambiguity are all low, so planner plus advisor is sufficient.";
  }
}

export function evaluateCostPolicy(
  input: SimulationRequest,
  stateContext?: StateContext,
): RequestRiskProfile {
  const corpus = [
    input.decision.context,
    input.decision.optionA,
    input.decision.optionB,
    input.userProfile.job,
    input.userProfile.priority.join(" "),
  ]
    .join(" ")
    .toLowerCase();
  const stateUnknownCount = readStateUnknownCount(stateContext);
  const complexity = classifyComplexity(
    corpus,
    input.userProfile.priority.length,
    input.decision.context.length,
  );
  const riskBand = classifyRiskLevel(corpus, input.userProfile.risk_tolerance);
  const ambiguity = classifyAmbiguity(corpus, stateUnknownCount);
  const executionMode = determineExecutionMode(complexity, riskBand, ambiguity);
  const ambiguous = ambiguity !== "low";
  const modelTier: ModelTier =
    riskBand === "high" || ambiguity === "high" ? "premium" : "low_cost";
  const complexityScore =
    (complexity === "high" ? 4 : complexity === "medium" ? 2 : 0) +
    (riskBand === "high" ? 4 : riskBand === "medium" ? 2 : 0) +
    (ambiguity === "high" ? 3 : ambiguity === "medium" ? 1 : 0);
  const reasons = [
    `complexity=${complexity}`,
    `risk=${riskBand}`,
    `ambiguity=${ambiguity}`,
    `execution_mode=${executionMode}`,
    buildRoutingReason({
      complexity,
      riskBand,
      ambiguity,
      executionMode,
      stateUnknownCount,
    }),
  ];

  return {
    modelTier,
    riskBand,
    complexity,
    ambiguity,
    executionMode,
    stateUnknownCount,
    ambiguous,
    complexityScore,
    estimatedTokens: estimateTokenCount(input),
    reasons,
  };
}
