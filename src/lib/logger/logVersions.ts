import type { GuardrailEvaluationActual } from "../guardrail-eval.ts";
import type { LogVersionInfo } from "../types.ts";

export const ONLINE_MONITORING_RECORD_VERSION = "online-monitoring.v2";
export const GUARDRAIL_EVALUATOR_VERSION = "guardrail-evaluator.v1";
export const SIGNAL_MAPPING_VERSION = "heuristic-derived-signal-mapping.v1";
export const PROMPT_VERSION = "life-simulator-prompts.v1";
export const CALIBRATION_VERSION = "calibration:v2";

export function buildLogVersions(
  evaluation: Pick<
    GuardrailEvaluationActual,
    "threshold_set" | "confidence_band" | "uncertainty_band"
  >,
): LogVersionInfo {
  return {
    record_version: ONLINE_MONITORING_RECORD_VERSION,
    evaluator_version: GUARDRAIL_EVALUATOR_VERSION,
    threshold_version: `guardrail-threshold-set:${evaluation.threshold_set}`,
    calibration_version: CALIBRATION_VERSION,
    signal_mapping_version: SIGNAL_MAPPING_VERSION,
    prompt_version: PROMPT_VERSION,
  };
}
