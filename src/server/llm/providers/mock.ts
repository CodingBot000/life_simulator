import type {
  DecisionInput,
  ReflectionResult,
  RiskTolerance,
  SimulationRequest,
  StateHints,
  UserProfile,
} from "../../../lib/types.ts";
import type {
  LLMProvider,
  ProviderStructuredRequest,
  ProviderStructuredResponse,
} from "../types.ts";

type LooseObject = Record<string, any>;

const GROWTH_KEYWORDS = [
  "growth",
  "mentor",
  "promotion",
  "startup",
  "opportunity",
  "learn",
  "lead",
  "network",
  "성장",
  "기회",
  "배움",
  "리드",
  "승진",
  "창업",
];

const STABILITY_KEYWORDS = [
  "stable",
  "security",
  "benefit",
  "remote",
  "balance",
  "steady",
  "permanent",
  "안정",
  "복지",
  "재택",
  "균형",
  "정규직",
];

const STRESS_KEYWORDS = [
  "commute",
  "uncertain",
  "burnout",
  "deadline",
  "relocation",
  "loan",
  "debt",
  "risk",
  "출퇴근",
  "불확실",
  "번아웃",
  "마감",
  "이사",
  "대출",
  "부채",
  "위험",
];

function parseJsonInput(input: string): LooseObject {
  try {
    return JSON.parse(input) as LooseObject;
  } catch {
    return {};
  }
}

function round(value: number): number {
  return Number(value.toFixed(4));
}

function approximateTokens(value: string): number {
  return Math.max(1, Math.ceil(value.length / 4));
}

function countKeywordHits(source: string, keywords: readonly string[]): number {
  return keywords.reduce((count, keyword) => count + Number(source.includes(keyword)), 0);
}

function inferDecisionStyle(profile: UserProfile): string {
  if (profile.risk_tolerance === "low") {
    return "deliberate and downside-aware";
  }

  if (profile.risk_tolerance === "high") {
    return "opportunity-seeking with tolerance for volatility";
  }

  return "balanced between upside and stability";
}

function inferFinancialPressure(
  decision: DecisionInput,
  hints?: StateHints,
): string {
  if (hints?.situational_state?.financial_pressure) {
    return hints.situational_state.financial_pressure;
  }

  const context = `${decision.context} ${decision.optionA} ${decision.optionB}`.toLowerCase();

  if (context.includes("loan") || context.includes("debt") || context.includes("rent") || context.includes("대출") || context.includes("부채") || context.includes("월세")) {
    return "high";
  }

  return "medium";
}

function inferTimePressure(decision: DecisionInput, hints?: StateHints): string {
  if (hints?.situational_state?.time_pressure) {
    return hints.situational_state.time_pressure;
  }

  const context = decision.context.toLowerCase();

  if (context.includes("urgent") || context.includes("deadline") || context.includes("이번 주") || context.includes("마감")) {
    return "high";
  }

  return "medium";
}

function inferEmotionalState(decision: DecisionInput, hints?: StateHints): string {
  if (hints?.situational_state?.emotional_state) {
    return hints.situational_state.emotional_state;
  }

  const context = decision.context.toLowerCase();

  if (context.includes("burnout") || context.includes("exhausted") || context.includes("번아웃")) {
    return "stressed";
  }

  return "focused";
}

function inferCareerStage(profile: UserProfile, hints?: StateHints): string {
  if (hints?.situational_state?.career_stage) {
    return hints.situational_state.career_stage;
  }

  if (profile.age < 28) {
    return "early-career";
  }

  if (profile.age < 40) {
    return "mid-career";
  }

  return "senior-career";
}

function evaluateOption(
  optionText: string,
  decisionContext: string,
  profile: UserProfile,
): {
  growthScore: number;
  stabilityScore: number;
  stressScore: number;
  missingInfo: boolean;
  riskFactors: string[];
} {
  const source = `${optionText} ${decisionContext}`.toLowerCase();
  const growthHits = countKeywordHits(source, GROWTH_KEYWORDS);
  const stabilityHits = countKeywordHits(source, STABILITY_KEYWORDS);
  const stressHits = countKeywordHits(source, STRESS_KEYWORDS);
  const missingInfo =
    optionText.length < 18 ||
    source.includes("unclear") ||
    source.includes("모르") ||
    source.includes("uncertain");

  const growthScore = 0.45 + growthHits * 0.12 - stressHits * 0.04;
  const stabilityScore =
    0.48 + stabilityHits * 0.11 - growthHits * 0.03 - stressHits * 0.07;
  const tolerancePenalty = profile.risk_tolerance === "low" ? 0.08 : 0;
  const stressScore = 0.35 + stressHits * 0.14 + tolerancePenalty;

  const riskFactors = [
    stressHits > 0 ? "execution_uncertainty" : null,
    source.includes("loan") || source.includes("debt") || source.includes("대출")
      ? "financial_pressure"
      : null,
    source.includes("burnout") || source.includes("health") || source.includes("번아웃")
      ? "health_burnout"
      : null,
    growthHits > 0 && stabilityHits === 0 ? "stability_loss" : null,
    source.includes("family") || source.includes("relationship") || source.includes("가족")
      ? "relationship_strain"
      : null,
  ].filter((value): value is string => value !== null);

  return {
    growthScore: round(Math.max(0.1, Math.min(0.95, growthScore))),
    stabilityScore: round(Math.max(0.1, Math.min(0.95, stabilityScore))),
    stressScore: round(Math.max(0.1, Math.min(0.95, stressScore))),
    missingInfo,
    riskFactors: riskFactors.length > 0 ? riskFactors : ["execution_uncertainty"],
  };
}

function toOutlook(score: number): "improve" | "stable" | "mixed" | "decline" {
  if (score >= 0.72) {
    return "improve";
  }

  if (score >= 0.56) {
    return "stable";
  }

  if (score >= 0.42) {
    return "mixed";
  }

  return "decline";
}

function toStressLoad(score: number): "low" | "medium" | "high" {
  if (score >= 0.68) {
    return "high";
  }

  if (score >= 0.46) {
    return "medium";
  }

  return "low";
}

function toRiskLevel(score: number): RiskTolerance {
  if (score >= 0.72) {
    return "high";
  }

  if (score >= 0.46) {
    return "medium";
  }

  return "low";
}

function buildStateContext(envelope: LooseObject): LooseObject {
  const caseInput = envelope.caseInput as SimulationRequest;
  const profile = caseInput.userProfile;
  const hints = caseInput.state_hints;
  const priorMemory = caseInput.prior_memory;

  return {
    case_id: envelope.caseId,
    user_state: {
      profile_state: {
        risk_preference:
          hints?.profile_state?.risk_preference ?? profile.risk_tolerance,
        decision_style:
          hints?.profile_state?.decision_style ?? inferDecisionStyle(profile),
        top_priorities:
          hints?.profile_state?.top_priorities ?? profile.priority,
      },
      situational_state: {
        career_stage: inferCareerStage(profile, hints),
        financial_pressure: inferFinancialPressure(caseInput.decision, hints),
        time_pressure: inferTimePressure(caseInput.decision, hints),
        emotional_state: inferEmotionalState(caseInput.decision, hints),
      },
      memory_state: {
        recent_similar_decisions:
          priorMemory?.recent_similar_decisions ?? [],
        repeated_patterns: priorMemory?.repeated_patterns ?? [],
        consistency_notes: priorMemory?.consistency_notes ?? [],
      },
    },
    state_summary: {
      decision_bias:
        profile.risk_tolerance === "low"
          ? "protects downside before chasing upside"
          : profile.risk_tolerance === "high"
            ? "accepts volatility for asymmetric upside"
            : "balances upside with practical stability",
      current_constraint: `financial_pressure=${inferFinancialPressure(caseInput.decision, hints)}, time_pressure=${inferTimePressure(caseInput.decision, hints)}`,
      agent_guidance:
        "Keep the answer deterministic, compare tradeoffs directly, and avoid speculative flourish.",
    },
  };
}

function buildPlannerResult(envelope: LooseObject): LooseObject {
  const caseInput = envelope.caseInput as SimulationRequest;
  const context = caseInput.decision.context.toLowerCase();
  const decisionType = context.includes("job") || context.includes("career") || context.includes("퇴사") || context.includes("이직")
    ? "career_tradeoff"
    : context.includes("move") || context.includes("relocation") || context.includes("이사")
      ? "relocation_tradeoff"
      : context.includes("relationship") || context.includes("marriage") || context.includes("결혼")
        ? "relationship_tradeoff"
        : "life_tradeoff";

  return {
    decision_type: decisionType,
    factors: Array.from(
      new Set([
        ...caseInput.userProfile.priority,
        "stability",
        "growth",
        "downside risk",
      ]),
    ).slice(0, 5),
  };
}

function buildScenarioResult(envelope: LooseObject): LooseObject {
  const caseInput = envelope.caseInput as SimulationRequest;
  const evaluation = evaluateOption(
    envelope.selectedOption as string,
    envelope.decisionContext as string,
    caseInput.userProfile,
  );

  return {
    three_months: `In three months, ${envelope.selectedOption} is likely to feel ${
      evaluation.stabilityScore >= 0.58 ? "operationally manageable" : "volatile"
    } while exposing the user to ${toStressLoad(evaluation.stressScore)} stress.`,
    one_year: `After one year, the path most likely shows ${toOutlook(
      evaluation.growthScore,
    )} growth with ${toOutlook(evaluation.stabilityScore)} stability.`,
    three_years: `At three years, the option compounds ${
      evaluation.growthScore >= evaluation.stabilityScore ? "career upside" : "risk control"
    } more than short-term convenience.`,
    structured_assessment: {
      stability_outlook: toOutlook(evaluation.stabilityScore),
      growth_outlook: toOutlook(evaluation.growthScore),
      stress_load: toStressLoad(evaluation.stressScore),
      missing_info: evaluation.missingInfo,
    },
  };
}

function buildRiskResult(envelope: LooseObject): LooseObject {
  const caseInput = envelope.caseInput as SimulationRequest;
  const scenario = envelope.scenario as LooseObject;
  const evaluation = evaluateOption(
    envelope.selectedOption as string,
    envelope.decisionContext as string,
    caseInput.userProfile,
  );
  const riskScore = round(
    Math.max(
      0.12,
      Math.min(
        0.95,
        evaluation.stressScore * 0.55 +
          (1 - evaluation.stabilityScore) * 0.35 +
          (scenario?.structured_assessment?.missing_info ? 0.1 : 0),
      ),
    ),
  );

  return {
    risk_level: toRiskLevel(riskScore),
    reasons: [
      `stress_load=${scenario?.structured_assessment?.stress_load ?? toStressLoad(evaluation.stressScore)}`,
      `stability_outlook=${scenario?.structured_assessment?.stability_outlook ?? toOutlook(evaluation.stabilityScore)}`,
      evaluation.missingInfo ? "missing decision detail increases execution uncertainty" : "core tradeoffs are identifiable",
    ],
    structured_assessment: {
      risk_factors: evaluation.riskFactors,
      missing_info: evaluation.missingInfo,
      risk_score: riskScore,
    },
  };
}

function buildAbReasoning(envelope: LooseObject): LooseObject {
  const caseInput = envelope.caseInput as SimulationRequest;
  const riskA = envelope.riskA as LooseObject;
  const riskB = envelope.riskB as LooseObject;
  const scenarioA = envelope.scenarioA as LooseObject;
  const scenarioB = envelope.scenarioB as LooseObject;
  const scoreA =
    (scenarioA.structured_assessment.growth_outlook === "improve" ? 0.2 : 0.1) +
    (riskA.structured_assessment.risk_score < 0.5 ? 0.35 : 0.18);
  const scoreB =
    (scenarioB.structured_assessment.growth_outlook === "improve" ? 0.2 : 0.1) +
    (riskB.structured_assessment.risk_score < 0.5 ? 0.35 : 0.18);
  const finalOption = scoreA >= scoreB ? "A" : "B";
  const finalConfidence = round(Math.max(0.52, Math.min(0.86, 0.58 + Math.abs(scoreA - scoreB))));

  return {
    case_id: envelope.caseId,
    input_summary: {
      user_profile: caseInput.userProfile,
      decision_options: caseInput.decision,
      planner_goal: envelope.plannerResult?.decision_type ?? "life_tradeoff",
    },
    reasoning: {
      a_reasoning: {
        stance: `Option A favors ${scenarioA.structured_assessment.growth_outlook} growth.`,
        summary: "Option A is the more assertive path if the user can absorb execution swings.",
        key_assumptions: [
          "The user can execute consistently for the next 6-12 months.",
        ],
        pros: [
          `Growth outlook is ${scenarioA.structured_assessment.growth_outlook}.`,
        ],
        cons: [
          `Risk level is ${riskA.risk_level}.`,
        ],
        recommended_option: "A",
        confidence: round(Math.max(0.45, 1 - riskA.structured_assessment.risk_score * 0.45)),
      },
      b_reasoning: {
        stance: `Option B favors ${scenarioB.structured_assessment.stability_outlook} stability.`,
        summary: "Option B is the steadier path if downside control matters most.",
        key_assumptions: [
          "The user values durability over short-term upside spikes.",
        ],
        pros: [
          `Stability outlook is ${scenarioB.structured_assessment.stability_outlook}.`,
        ],
        cons: [
          `Risk level is ${riskB.risk_level}.`,
        ],
        recommended_option: "B",
        confidence: round(Math.max(0.45, 1 - riskB.structured_assessment.risk_score * 0.45)),
      },
      comparison: {
        agreements: [
          "Both options require explicit tradeoff acceptance.",
        ],
        conflicts: [
          "One option emphasizes upside while the other prioritizes downside containment.",
        ],
        which_fits_user_better: finalOption,
        reason:
          finalOption === "A"
            ? "The user profile tolerates enough volatility to justify the higher-upside path."
            : "The user profile benefits more from preserving stability and execution reliability.",
      },
      final_selection: {
        selected_reasoning: finalOption,
        selected_option: finalOption,
        why_selected:
          finalOption === "A"
            ? "A offers the stronger composite of upside and acceptable risk."
            : "B keeps risk inside the user's tolerance while remaining directionally useful.",
        decision_confidence: finalConfidence,
      },
    },
    structured_signals: {
      conflict: Math.abs(scoreA - scoreB) < 0.08,
      missing_info:
        scenarioA.structured_assessment.missing_info ||
        scenarioB.structured_assessment.missing_info,
      low_confidence: finalConfidence < 0.62,
    },
  };
}

function buildAdvisorResult(envelope: LooseObject): LooseObject {
  const reasoning = envelope.abReasoning as LooseObject;
  const guardrailResult = envelope.guardrailResult as LooseObject;
  const selected = reasoning.reasoning.final_selection.selected_option;
  const confidence = reasoning.reasoning.final_selection.decision_confidence;

  if (guardrailResult.final_mode === "blocked") {
    return {
      decision: "undecided",
      confidence: round(Math.min(0.5, confidence)),
      reason: "The current evidence is too risky or incomplete to recommend a decisive option.",
      guardrail_applied: true,
      recommended_option: "undecided",
      reasoning_basis: {
        selected_reasoning: "undecided",
        core_why: "Guardrail escalation requires clarification before a deterministic recommendation.",
        decision_confidence: round(Math.min(0.5, confidence)),
      },
    };
  }

  if (guardrailResult.final_mode === "cautious") {
    return {
      decision: selected,
      confidence: round(Math.min(0.68, confidence)),
      reason: `Recommend ${selected} cautiously because the tradeoff is directionally clear but still sensitive to missing context.`,
      guardrail_applied: true,
      recommended_option: selected,
      reasoning_basis: {
        selected_reasoning: selected,
        core_why: "Guardrail allows a constrained recommendation with explicit uncertainty.",
        decision_confidence: round(Math.min(0.68, confidence)),
      },
    };
  }

  return {
    decision: selected,
    confidence,
    reason: `Recommend ${selected} because it best matches the user's priorities under the current evidence.`,
    guardrail_applied: false,
    recommended_option: selected,
    reasoning_basis: {
      selected_reasoning: selected,
      core_why: reasoning.reasoning.final_selection.why_selected,
      decision_confidence: confidence,
    },
  };
}

function buildReflectionResult(envelope: LooseObject): ReflectionResult {
  const guardrailResult = envelope.guardrailResult as LooseObject;
  const advisorResult = envelope.advisorResult as LooseObject;
  const cautious = guardrailResult.final_mode === "cautious";
  const blocked = guardrailResult.final_mode === "blocked";

  return {
    evaluation:
      blocked
        ? "The run preserved safety and determinism, but more context is required before recommending a path."
        : cautious
          ? "The run is directionally useful, though uncertainty remains visible and should stay surfaced."
          : "The run is coherent and sufficiently deterministic for a direct recommendation.",
    scores: {
      realism: blocked ? 4 : 5,
      consistency: 4,
      profile_alignment: advisorResult.decision === "undecided" ? 4 : 5,
      recommendation_clarity: blocked ? 3 : 4,
    },
    issues: [
      blocked
        ? {
            type: "advisor",
            description: "A decisive recommendation was intentionally withheld because risk or ambiguity remained too high.",
          }
        : {
            type: "reasoning",
            description: "The tradeoff is still sensitive to a small amount of missing execution detail.",
          },
    ],
    improvement_suggestions: [
      {
        target: cautious || blocked ? "advisor" : "reasoning",
        suggestion:
          "Ask for one more concrete constraint such as timeline, financial runway, or non-negotiable downside.",
      },
    ],
    overall_comment:
      "The deterministic chain is internally aligned and can be audited stage by stage.",
    guardrail_review: {
      was_needed: guardrailResult.triggers.length > 0,
      was_triggered: guardrailResult.guardrail_triggered,
      correctness: blocked || cautious ? "good" : "good",
    },
  };
}

function buildGuardrailLikeObject(envelope: LooseObject): LooseObject {
  return envelope.guardrailResult ?? {};
}

function buildFallbackFromSchema(schema: LooseObject): unknown {
  if (schema.type === "object") {
    const properties = (schema.properties ?? {}) as Record<string, LooseObject>;
    const result: LooseObject = {};

    for (const [key, value] of Object.entries(properties)) {
      result[key] = buildFallbackFromSchema(value);
    }

    return result;
  }

  if (schema.type === "array") {
    return [buildFallbackFromSchema((schema.items as LooseObject) ?? { type: "string" })];
  }

  if (schema.type === "string") {
    return Array.isArray(schema.enum) ? schema.enum[0] : "mock";
  }

  if (schema.type === "integer") {
    return schema.minimum ?? 1;
  }

  if (schema.type === "number") {
    return schema.minimum ?? 0;
  }

  if (schema.type === "boolean") {
    return false;
  }

  return null;
}

function buildStructuredMock(schemaName: string, envelope: LooseObject, schema: LooseObject): unknown {
  switch (schemaName) {
    case "state_context":
      return buildStateContext(envelope);
    case "planner_result":
      return buildPlannerResult(envelope);
    case "scenario_a_result":
    case "scenario_b_result":
      return buildScenarioResult(envelope);
    case "risk_a_result":
    case "risk_b_result":
      return buildRiskResult(envelope);
    case "ab_reasoning_result":
      return buildAbReasoning(envelope);
    case "advisor_result":
      return buildAdvisorResult(envelope);
    case "reflection_result":
      return buildReflectionResult(envelope);
    case "guardrail_result":
      return buildGuardrailLikeObject(envelope);
    default:
      return buildFallbackFromSchema(schema);
  }
}

export const mockProvider: LLMProvider = {
  name: "mock",
  async invokeStructured(
    request: ProviderStructuredRequest,
  ): Promise<ProviderStructuredResponse> {
    const envelope = parseJsonInput(request.input);
    const output = buildStructuredMock(
      request.schemaName,
      envelope,
      request.schema as LooseObject,
    );
    const rawText = JSON.stringify(output);

    return {
      provider: "mock",
      model: request.model,
      rawText,
      parsedOutput: output,
      usage: {
        inputTokens: approximateTokens(request.prompt) + approximateTokens(request.input),
        outputTokens: approximateTokens(rawText),
        totalTokens:
          approximateTokens(request.prompt) +
          approximateTokens(request.input) +
          approximateTokens(rawText),
      },
      latencyMs: 5,
    };
  },
};
