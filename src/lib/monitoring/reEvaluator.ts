import { evaluateGuardrailArtifacts } from "../guardrail-eval.ts";
import { buildGuardrailLogRecord } from "../logger/guardrailLogger.ts";
import { buildLogVersions } from "../logger/logVersions.ts";
import {
  artifactExists,
  buildArtifactFileName,
  resolveOnlineLogPath,
  writeJsonArtifact,
} from "../logger/logStore.ts";
import type {
  GuardrailDecision,
  OperationalOutputMode,
  ReEvaluationResult,
  SimulationRequest,
} from "../types.ts";

import { readAnomalyQueue } from "./anomalyQueue.ts";

function decisionToMode(decision: GuardrailDecision): OperationalOutputMode {
  if (decision === "block") {
    return "blocked";
  }

  if (decision === "review") {
    return "safe";
  }

  return "normal";
}

export async function runReEvaluation(): Promise<ReEvaluationResult[]> {
  const queueEntries = await readAnomalyQueue();
  const results: ReEvaluationResult[] = [];

  for (const entry of queueEntries) {
    const { request_log: requestLog } = entry.value;
    const stateContext = requestLog.state.state_context;
    const risk = requestLog.intermediate.risk;
    const reasoning = requestLog.intermediate.ab_reasoning;

    if (!stateContext || !risk || !reasoning) {
      console.warn(
        `[re-eval] skipped ${requestLog.request_id} because saved artifacts are incomplete.`,
      );
      continue;
    }

    const resultFileName = buildArtifactFileName(
      "re_eval",
      requestLog.request_id,
      requestLog.timestamp,
    );
    const resultPath = resolveOnlineLogPath("re_eval_results", resultFileName);

    if (await artifactExists(resultPath)) {
      continue;
    }

    const simulationInput = requestLog.input.user_context as SimulationRequest;
    const evaluation = evaluateGuardrailArtifacts({
      stateContext,
      riskA: risk.optionA,
      riskB: risk.optionB,
      reasoning,
      userInput: requestLog.input.user_query,
      userContext: simulationInput,
    });
    const reevaluatedGuardrail = buildGuardrailLogRecord({
      input: simulationInput,
      stateContext,
      riskA: risk.optionA,
      riskB: risk.optionB,
      reasoning,
      evaluation,
    });
    const reevaluatedAt = new Date().toISOString();
    const versions = buildLogVersions(evaluation);
    const result: ReEvaluationResult = {
      request_id: requestLog.request_id,
      reevaluated_at: reevaluatedAt,
      source_log_path: entry.path,
      versions,
      source: entry.value.source,
      anomaly: reevaluatedGuardrail.guardrail_derived.anomaly,
      reevaluated_guardrail: reevaluatedGuardrail,
      dataset_candidate: {
        versions,
        input: requestLog.input,
        expected: {
          risk_level: reevaluatedGuardrail.guardrail_derived.risk_level,
          decision: reevaluatedGuardrail.guardrail_derived.decision,
          mode: decisionToMode(
            reevaluatedGuardrail.guardrail_derived.decision,
          ),
        },
        source: "online_anomaly",
        judge: "auto_re_eval",
      },
    };

    await writeJsonArtifact("re_eval_results", resultFileName, result);
    await writeJsonArtifact(
      "dataset_candidates",
      buildArtifactFileName(
        "dataset_candidate",
        requestLog.request_id,
        reevaluatedAt,
      ),
      result.dataset_candidate,
    );
    results.push(result);
  }

  return results;
}
