import type {
  DecisionInput,
  ReflectionInternalDiagnostic,
  ReflectionResult,
  RiskTolerance,
  SimulationRequest,
  StateHints,
  UserProfile,
} from "../../../lib/types.ts";
import { getPriorityLabel, type PriorityLocale } from "../../../lib/priorities.ts";
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

function resolveOutputLocale(envelope: LooseObject): PriorityLocale {
  return envelope.outputLocale === "en" ? "en" : "ko";
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
  const locale = resolveOutputLocale(envelope);
  const financialPressure = inferFinancialPressure(caseInput.decision, hints);
  const timePressure = inferTimePressure(caseInput.decision, hints);

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
        locale === "en"
          ? profile.risk_tolerance === "low"
            ? "protects downside before chasing upside"
            : profile.risk_tolerance === "high"
              ? "accepts volatility for asymmetric upside"
              : "balances upside with practical stability"
          : profile.risk_tolerance === "low"
            ? "상승 가능성을 보기 전에 먼저 하방을 막으려는 편이다."
            : profile.risk_tolerance === "high"
              ? "변동성을 감수하더라도 큰 기회를 잡으려는 편이다."
              : "현실적인 안정성과 상승 가능성 사이의 균형을 보려는 편이다.",
      current_constraint:
        locale === "en"
          ? `Financial pressure is ${financialPressure} and time pressure is ${timePressure}.`
          : `재정 압박은 ${financialPressure} 수준이고, 시간 압박은 ${timePressure} 수준이다.`,
      agent_guidance:
        locale === "en"
          ? "Keep the answer deterministic, compare tradeoffs directly, and avoid speculative flourish."
          : "과장 없이 상충 관계를 직접 비교하고, 결정적으로 정리하라.",
    },
  };
}

function buildPlannerResult(envelope: LooseObject): LooseObject {
  const caseInput = envelope.caseInput as SimulationRequest;
  const locale = resolveOutputLocale(envelope);
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
        ...caseInput.userProfile.priority.map((priority) =>
          getPriorityLabel(priority, locale),
        ),
        ...(locale === "en"
          ? ["Stability", "Growth", "Downside risk"]
          : ["안정성", "성장", "하방 위험"]),
      ]),
    ).slice(0, 5),
  };
}

function buildScenarioResult(envelope: LooseObject): LooseObject {
  const caseInput = envelope.caseInput as SimulationRequest;
  const locale = resolveOutputLocale(envelope);
  const evaluation = evaluateOption(
    envelope.selectedOption as string,
    envelope.decisionContext as string,
    caseInput.userProfile,
  );

  return {
    three_months:
      locale === "en"
        ? `In three months, ${envelope.selectedOption} is likely to feel ${
            evaluation.stabilityScore >= 0.58 ? "operationally manageable" : "volatile"
          } while exposing the user to ${toStressLoad(evaluation.stressScore)} stress.`
        : `3개월 안에는 ${envelope.selectedOption} 선택이 ${
            evaluation.stabilityScore >= 0.58 ? "어느 정도 운영 가능해 보이지만" : "꽤 흔들리기 쉽고"
          }, 스트레스 부담은 ${toStressLoad(evaluation.stressScore)} 수준으로 이어질 가능성이 크다.`,
    one_year:
      locale === "en"
        ? `After one year, the path most likely shows ${toOutlook(
            evaluation.growthScore,
          )} growth with ${toOutlook(evaluation.stabilityScore)} stability.`
        : `1년 시점에는 성장 흐름은 ${toOutlook(
            evaluation.growthScore,
          )}, 안정성 흐름은 ${toOutlook(evaluation.stabilityScore)} 쪽으로 갈 가능성이 높다.`,
    three_years:
      locale === "en"
        ? `At three years, the option compounds ${
            evaluation.growthScore >= evaluation.stabilityScore ? "career upside" : "risk control"
          } more than short-term convenience.`
        : `3년 관점에서는 단기 편의보다 ${
            evaluation.growthScore >= evaluation.stabilityScore ? "장기 성장 가능성" : "위험 관리"
          }을 더 크게 누적시키는 선택이 될 가능성이 있다.`,
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
  const locale = resolveOutputLocale(envelope);
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
    reasons:
      locale === "en"
        ? [
            `Stress load is ${scenario?.structured_assessment?.stress_load ?? toStressLoad(evaluation.stressScore)} for this path.`,
            `Stability outlook is ${scenario?.structured_assessment?.stability_outlook ?? toOutlook(evaluation.stabilityScore)} under the current scenario.`,
            evaluation.missingInfo
              ? "Missing decision detail increases execution uncertainty."
              : "The core tradeoffs are identifiable from the current evidence.",
          ]
        : [
            `이 선택의 스트레스 부담은 ${scenario?.structured_assessment?.stress_load ?? toStressLoad(evaluation.stressScore)} 수준으로 보인다.`,
            `현재 시나리오 기준 안정성 흐름은 ${scenario?.structured_assessment?.stability_outlook ?? toOutlook(evaluation.stabilityScore)} 쪽에 가깝다.`,
            evaluation.missingInfo
              ? "의사결정 세부 정보가 부족해 실행 불확실성이 더 커진다."
              : "현재 근거만으로도 핵심 상충 관계는 어느 정도 식별된다.",
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
  const locale = resolveOutputLocale(envelope);
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
        stance:
          locale === "en"
            ? `Option A favors ${scenarioA.structured_assessment.growth_outlook} growth.`
            : `A는 ${scenarioA.structured_assessment.growth_outlook} 쪽 성장 가능성을 더 중시한다.`,
        summary:
          locale === "en"
            ? "Option A is the more assertive path if the user can absorb execution swings."
            : "A는 실행 변동성을 감수할 수 있을 때 더 공격적으로 볼 수 있는 선택이다.",
        key_assumptions: [
          locale === "en"
            ? "The user can execute consistently for the next 6-12 months."
            : "앞으로 6~12개월 동안 실행력을 꾸준히 유지할 수 있다고 본다.",
        ],
        pros: [
          locale === "en"
            ? `Growth outlook is ${scenarioA.structured_assessment.growth_outlook}.`
            : `성장 흐름이 ${scenarioA.structured_assessment.growth_outlook} 쪽으로 열려 있다.`,
        ],
        cons: [
          locale === "en"
            ? `Risk level is ${riskA.risk_level}.`
            : `위험 수준은 ${riskA.risk_level}로 평가된다.`,
        ],
        recommended_option: "A",
        confidence: round(Math.max(0.45, 1 - riskA.structured_assessment.risk_score * 0.45)),
      },
      b_reasoning: {
        stance:
          locale === "en"
            ? `Option B favors ${scenarioB.structured_assessment.stability_outlook} stability.`
            : `B는 ${scenarioB.structured_assessment.stability_outlook} 쪽 안정성을 더 중시한다.`,
        summary:
          locale === "en"
            ? "Option B is the steadier path if downside control matters most."
            : "B는 하방을 막는 것이 중요할 때 더 안정적으로 볼 수 있는 선택이다.",
        key_assumptions: [
          locale === "en"
            ? "The user values durability over short-term upside spikes."
            : "사용자가 단기 급등보다 오래 버틸 수 있는 흐름을 더 중시한다고 본다.",
        ],
        pros: [
          locale === "en"
            ? `Stability outlook is ${scenarioB.structured_assessment.stability_outlook}.`
            : `안정성 흐름이 ${scenarioB.structured_assessment.stability_outlook} 쪽에 가깝다.`,
        ],
        cons: [
          locale === "en"
            ? `Risk level is ${riskB.risk_level}.`
            : `위험 수준은 ${riskB.risk_level}로 평가된다.`,
        ],
        recommended_option: "B",
        confidence: round(Math.max(0.45, 1 - riskB.structured_assessment.risk_score * 0.45)),
      },
      comparison: {
        agreements: [
          locale === "en"
            ? "Both options require explicit tradeoff acceptance."
            : "두 선택지 모두 분명한 상충 관계를 받아들여야 한다.",
        ],
        conflicts: [
          locale === "en"
            ? "One option emphasizes upside while the other prioritizes downside containment."
            : "한쪽은 상승 가능성을, 다른 한쪽은 하방 관리에 더 무게를 둔다.",
        ],
        which_fits_user_better: finalOption,
        reason:
          locale === "en"
            ? finalOption === "A"
              ? "The user profile tolerates enough volatility to justify the higher-upside path."
              : "The user profile benefits more from preserving stability and execution reliability."
            : finalOption === "A"
              ? "사용자 상태는 더 높은 상승 가능성을 감수할 만큼의 변동성을 어느 정도 받아들일 수 있다."
              : "사용자 상태는 상승보다 안정성과 실행 가능성을 지키는 쪽에 더 잘 맞는다.",
      },
      final_selection: {
        selected_reasoning: finalOption,
        selected_option: finalOption,
        why_selected:
          locale === "en"
            ? finalOption === "A"
              ? "A offers the stronger composite of upside and acceptable risk."
              : "B keeps risk inside the user's tolerance while remaining directionally useful."
            : finalOption === "A"
              ? "A는 감수 가능한 위험 안에서 더 큰 상승 가능성을 제공한다."
              : "B는 사용자가 받아들일 수 있는 범위 안에서 위험을 묶어 두면서도 방향성은 유지한다.",
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
  const locale = resolveOutputLocale(envelope);
  const selected = reasoning.reasoning.final_selection.selected_option;
  const confidence = reasoning.reasoning.final_selection.decision_confidence;

  if (guardrailResult.final_mode === "blocked") {
    return {
      decision: "undecided",
      confidence: round(Math.min(0.5, confidence)),
      reason:
        locale === "en"
          ? "The current evidence is too risky or incomplete to recommend a decisive option."
          : "현재 근거만으로는 위험이 크거나 정보가 부족해 단정적인 추천을 내리기 어렵다.",
      guardrail_applied: true,
      recommended_option: "undecided",
      reasoning_basis: {
        selected_reasoning: "undecided",
        core_why:
          locale === "en"
            ? "Guardrail escalation requires clarification before a deterministic recommendation."
            : "안전장치가 더 강하게 작동했기 때문에, 확정 추천 전에는 추가 확인이 필요하다.",
        decision_confidence: round(Math.min(0.5, confidence)),
      },
    };
  }

  if (guardrailResult.final_mode === "cautious") {
    return {
      decision: selected,
      confidence: round(Math.min(0.68, confidence)),
      reason:
        locale === "en"
          ? `Recommend ${selected} cautiously because the tradeoff is directionally clear but still sensitive to missing context.`
          : `상충 관계의 방향은 비교적 분명하지만 맥락 부족에 민감하므로 ${selected}를 조심스럽게 권한다.`,
      guardrail_applied: true,
      recommended_option: selected,
      reasoning_basis: {
        selected_reasoning: selected,
        core_why:
          locale === "en"
            ? "Guardrail allows a constrained recommendation with explicit uncertainty."
            : "안전장치가 불확실성을 분명히 드러내는 조건에서만 제한적인 추천을 허용했다.",
        decision_confidence: round(Math.min(0.68, confidence)),
      },
    };
  }

  return {
    decision: selected,
    confidence,
    reason:
      locale === "en"
        ? `Recommend ${selected} because it best matches the user's priorities under the current evidence.`
        : `현재 근거 기준으로는 ${selected}가 사용자의 우선순위에 가장 잘 맞는 선택이다.`,
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
  const locale = envelope.outputLocale === "en" ? "en" : "ko";
  const userCopy =
    locale === "en"
      ? {
          headline: {
            blocked:
              "The run stayed safe, but a stronger answer still needs more context.",
            cautious:
              "The recommendation is useful, but uncertainty still matters.",
            normal:
              "The result is coherent enough to support a direct recommendation.",
          },
          summary: {
            blocked:
              "The chain avoided forcing a recommendation, which is appropriate here. More concrete context is still needed before turning this into a firm recommendation.",
            cautious:
              "The chain produced a directionally useful result, but some uncertainty still remains in the evidence. The output is usable, though it should not be read as fully settled.",
            normal:
              "The chain stayed internally consistent and produced a recommendation that is clear enough to use directly.",
          },
          caution: {
            blocked:
              "A firm recommendation was intentionally withheld because risk or ambiguity remained too high.",
            normal:
              "The tradeoff could still shift if one important execution detail changes.",
          },
          action:
            "Add one more concrete constraint, such as timeline, financial runway, or a non-negotiable downside, before relying on the next run.",
        }
      : {
          headline: {
            blocked:
              "안전하게 멈췄지만, 더 강한 결론을 내리기엔 맥락이 부족합니다.",
            cautious:
              "추천은 참고할 수 있지만, 아직 불확실성이 남아 있습니다.",
            normal:
              "결과가 충분히 일관돼서 바로 참고할 수 있는 추천이 나왔습니다.",
          },
          summary: {
            blocked:
              "이번 실행은 무리하게 추천을 밀어붙이지 않고 안전하게 멈춘 점이 적절합니다. 다만 확정적인 추천으로 가기에는 구체적인 맥락이 아직 더 필요합니다.",
            cautious:
              "이번 실행은 방향성 있는 결과를 만들었지만, 근거 안에 남은 불확실성도 함께 보입니다. 그래서 결과는 유용하지만 완전히 단정적으로 읽기에는 이릅니다.",
            normal:
              "이번 실행은 내부 흐름이 크게 흔들리지 않았고, 실제 판단에 바로 참고할 수 있을 정도로 추천이 정리됐습니다.",
          },
          caution: {
            blocked:
              "리스크나 모호성이 너무 높아, 단정적인 추천을 의도적으로 보류했습니다.",
            normal:
              "핵심 실행 조건이 조금만 달라져도 이 트레이드오프는 흔들릴 수 있습니다.",
          },
          action:
            "다음 실행 전에는 일정, 재정 여력, 감수할 수 없는 하방 같은 구체적 제약을 하나만 더 확인해 두는 편이 좋습니다.",
        };

  const internalDiagnostic: ReflectionInternalDiagnostic = {
    evaluation:
      blocked
        ? "The run preserved safety and determinism, but more context is required before recommending a path."
        : cautious
          ? "The run is directionally useful, though uncertainty remains visible and should stay surfaced."
          : "The run is coherent and sufficiently deterministic for a direct recommendation.",
    issues: [
      blocked
        ? {
            type: "advisor",
            description:
              "A decisive recommendation was intentionally withheld because risk or ambiguity remained too high.",
          }
        : {
            type: "reasoning",
            description:
              "The tradeoff is still sensitive to a small amount of missing execution detail.",
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
  };

  return {
    scores: {
      realism: blocked ? 4 : 5,
      consistency: 4,
      profile_alignment: advisorResult.decision === "undecided" ? 4 : 5,
      recommendation_clarity: blocked ? 3 : 4,
    },
    internal_diagnostic: internalDiagnostic,
    user_summary: {
      headline:
        blocked
          ? userCopy.headline.blocked
          : cautious
            ? userCopy.headline.cautious
            : userCopy.headline.normal,
      summary:
        blocked
          ? userCopy.summary.blocked
          : cautious
            ? userCopy.summary.cautious
            : userCopy.summary.normal,
      cautions: [blocked ? userCopy.caution.blocked : userCopy.caution.normal],
      suggested_actions: [userCopy.action],
    },
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
