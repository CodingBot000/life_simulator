import type {
  AdvisorResult,
  ExecutionMode,
  ReflectionResult,
} from "../../lib/types.ts";
import type { GuardrailEvaluationActual } from "../../lib/guardrail-eval.ts";

export function deriveReflectionResult(params: {
  executionMode: ExecutionMode;
  advisor: AdvisorResult;
  guardrailEvaluation: GuardrailEvaluationActual;
}): ReflectionResult {
  const cautious = params.guardrailEvaluation.guardrail_result.final_mode === "cautious";
  const blocked = params.guardrailEvaluation.guardrail_result.final_mode === "blocked";

  return {
    evaluation:
      blocked
        ? "The run stayed safe, but more information is required before a decisive recommendation."
        : cautious
          ? "The run is directionally useful, but uncertainty remains visible and should stay surfaced."
          : "The run stayed coherent for the selected execution path and produced an auditable recommendation.",
    scores: {
      realism: blocked ? 3 : 4,
      consistency: cautious ? 4 : 5,
      profile_alignment: 4,
      recommendation_clarity: blocked ? 3 : 4,
    },
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
    overall_comment:
      params.advisor.guardrail_applied
        ? "The recommendation already reflects guardrail pressure, which makes the selective path easier to audit."
        : "The selected path stayed efficient while preserving a usable recommendation and a derived monitoring trail.",
    guardrail_review: {
      was_needed: params.guardrailEvaluation.detected_triggers.length > 0,
      was_triggered: params.guardrailEvaluation.guardrail_result.guardrail_triggered,
      correctness: "good",
    },
  };
}
