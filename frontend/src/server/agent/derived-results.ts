import type {
  AdvisorResult,
  ExecutionMode,
  ReflectionInternalDiagnostic,
  ReflectionResult,
} from "../../lib/types.ts";
import type { GuardrailEvaluationActual } from "../../lib/guardrail-eval.ts";
import type { PriorityLocale } from "../../lib/priorities.ts";

export function deriveReflectionResult(params: {
  executionMode: ExecutionMode;
  advisor: AdvisorResult;
  guardrailEvaluation: GuardrailEvaluationActual;
  locale?: PriorityLocale;
}): ReflectionResult {
  const cautious = params.guardrailEvaluation.guardrail_result.final_mode === "cautious";
  const blocked = params.guardrailEvaluation.guardrail_result.final_mode === "blocked";
  const locale = params.locale ?? "ko";
  const userCopy =
    locale === "en"
      ? {
          headline: {
            blocked:
              "A safe result was kept, but a decisive answer still needs more context.",
            cautious:
              "The current recommendation is usable, but uncertainty is still meaningful.",
            normal:
              "The result is coherent enough to act on within the chosen execution path.",
          },
          summary: {
            blocked:
              "The chain avoided overcommitting, which is appropriate here. More context is still needed before turning this into a firm recommendation.",
            cautious:
              "The chain produced a directionally sound recommendation, but some uncertainty remains in the comparison path. The result is useful, though it should be read with that remaining uncertainty in mind.",
            normal:
              "The chain stayed consistent across the selected stages and produced a recommendation that is clear enough for practical use.",
          },
          caution: {
            light:
              "This run skipped scenario and risk expansion, so the recommendation depends more on the planner framing and the quality of the state summary.",
            standard:
              "This run compared scenarios but did not go through a dedicated risk stage, so downside exposure is less fully tested.",
            careful:
              "This run checked risk, but it did not execute the full A/B reasoning stage, so the final comparison is still less explicit than the full chain.",
            full:
              "Even in the full chain, the final recommendation should keep its evidence trail explicit and easy to follow.",
          },
          action: {
            light:
              "If the choice is sensitive, add one more concrete constraint so the next run can test the downside more explicitly.",
            standard:
              "If the decision still feels close, rerun with one clearer downside constraint so the tradeoff becomes easier to audit.",
            careful:
              "If you want a firmer call, add one or two concrete constraints that separate short-term risk from long-term upside.",
            full:
              "Use the recommendation, but keep checking whether the key tradeoff still matches your actual constraints and priorities.",
          },
        }
      : {
          headline: {
            blocked:
              "안전하게 멈췄지만, 단정적인 결론을 내리기엔 정보가 더 필요합니다.",
            cautious:
              "지금 추천은 참고할 수 있지만, 아직 남아 있는 불확실성이 있습니다.",
            normal:
              "선택된 실행 경로 안에서 결과가 충분히 일관되게 정리됐습니다.",
          },
          summary: {
            blocked:
              "이번 실행은 과하게 단정하지 않고 안전하게 멈춘 점이 적절합니다. 다만 지금 정보만으로는 확정 추천까지 밀어붙이기 어렵습니다.",
            cautious:
              "이번 실행은 방향성 있는 추천을 만들었지만, 비교 과정에 남아 있는 불확실성도 함께 보입니다. 그래서 결과는 유용하지만, 아직은 여지를 남겨 두고 해석하는 편이 맞습니다.",
            normal:
              "이번 실행은 선택된 단계들 안에서 큰 충돌 없이 이어졌고, 실제 판단에 참고할 수 있을 정도로 명확한 추천을 만들었습니다.",
          },
          caution: {
            light:
              "이번 실행은 시나리오와 리스크 확장을 생략했기 때문에, 추천이 플래너 프레이밍과 상태 요약의 품질에 더 크게 의존합니다.",
            standard:
              "이번 실행은 시나리오 비교까지만 수행해서, 하방 위험을 전용 리스크 단계로 충분히 점검하지는 못했습니다.",
            careful:
              "이번 실행은 리스크 점검은 포함했지만 전체 A/B 추론 단계까지는 가지 않아, 최종 비교 근거가 full 경로보다 덜 분명합니다.",
            full:
              "full 경로라 해도 최종 추천의 근거 흐름은 계속 분명하게 따라갈 수 있어야 합니다.",
          },
          action: {
            light:
              "이 선택이 민감하다면, 다음 실행에서는 한 가지 구체적인 제약을 더 넣어 하방 위험을 더 직접적으로 확인하는 편이 좋습니다.",
            standard:
              "결정이 여전히 애매하다면, 다음 실행에서 손해를 가장 크게 좌우할 제약 하나를 더 넣어 비교 근거를 선명하게 만드는 편이 좋습니다.",
            careful:
              "더 단단한 결론이 필요하다면, 단기 리스크와 장기 기회를 나눌 수 있는 제약을 한두 개 더 넣어 다시 돌리는 것이 좋습니다.",
            full:
              "추천을 참고하되, 실제 제약과 우선순위에 여전히 맞는지 핵심 트레이드오프를 한 번 더 확인하는 편이 좋습니다.",
          },
        };

  const internalDiagnostic: ReflectionInternalDiagnostic = {
    evaluation:
      blocked
        ? "The run stayed safe, but more information is required before a decisive recommendation."
        : cautious
          ? "The run is directionally useful, but uncertainty remains visible and should stay surfaced."
          : "The run stayed coherent for the selected execution path and produced an auditable recommendation.",
    issues: [
      {
        type:
          params.executionMode === "light"
            ? "profile"
            : params.executionMode === "standard"
              ? "scenario"
              : params.executionMode === "careful"
                ? "risk"
                : "advisor",
        description:
          params.executionMode === "light"
            ? "Light mode omits scenario and risk stages, so the recommendation depends more heavily on planner framing and state summary fidelity."
            : params.executionMode === "standard"
              ? "Standard mode stops after scenario comparison, so downside exposure is not stress-tested with a dedicated risk stage."
              : params.executionMode === "careful"
                ? "Careful mode includes risk inspection but omits A/B reasoning, so the final comparison remains less explicit than the full path."
                : "Advisor traceability should stay explicit when the path escalates to the full chain.",
      },
    ],
    improvement_suggestions: [
      {
        target:
          params.executionMode === "light"
            ? "planner"
            : params.executionMode === "standard"
              ? "scenario"
              : params.executionMode === "careful"
                ? "risk"
                : "advisor",
        suggestion:
          params.executionMode === "light"
            ? "Expose the top priority and risk tolerance more directly in planner output so advisor reasoning stays grounded."
            : params.executionMode === "standard"
              ? "Tie each scenario horizon more explicitly to the user's top priority so the skipped risk stage is easier to audit."
              : params.executionMode === "careful"
                ? "Separate short-term and long-term risks so advisor can quote the key difference more directly."
                : "Keep routing reason, core evidence, and guardrail impact explicit in the final recommendation.",
      },
    ],
    overall_comment: params.advisor.guardrail_applied
      ? "The recommendation already reflects guardrail pressure, which makes the selective path easier to audit."
      : "The selected path stayed efficient while preserving a usable recommendation and a derived monitoring trail.",
  };

  return {
    scores: {
      realism: blocked ? 3 : 4,
      consistency: cautious ? 4 : 5,
      profile_alignment: 4,
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
      cautions: [
        params.executionMode === "light"
          ? userCopy.caution.light
          : params.executionMode === "standard"
            ? userCopy.caution.standard
            : params.executionMode === "careful"
              ? userCopy.caution.careful
              : userCopy.caution.full,
      ],
      suggested_actions: [
        params.executionMode === "light"
          ? userCopy.action.light
          : params.executionMode === "standard"
            ? userCopy.action.standard
            : params.executionMode === "careful"
              ? userCopy.action.careful
              : userCopy.action.full,
      ],
    },
    guardrail_review: {
      was_needed: params.guardrailEvaluation.detected_triggers.length > 0,
      was_triggered: params.guardrailEvaluation.guardrail_result.guardrail_triggered,
      correctness: "good",
    },
  };
}
