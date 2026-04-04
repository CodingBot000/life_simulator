import type { GuardrailEvaluationActual } from "../guardrail-eval.ts";
import type {
  AbReasoningResult,
  AdvisorResult,
  PlannerResult,
  RequestLog,
  RiskResult,
  ScenarioResult,
  SimulationRequest,
  StateContext,
} from "../types.ts";

import {
  buildGuardrailLogRecord,
  logGuardrail,
  mapGuardrailModeToOutputMode,
} from "./guardrailLogger.ts";
import { buildArtifactFileName, writeJsonArtifact } from "./logStore.ts";
import { buildLogVersions } from "./logVersions.ts";

function buildFinalAnswer(advisor: AdvisorResult): string {
  return [
    `decision=${advisor.decision}`,
    `recommended_option=${advisor.recommended_option}`,
    `confidence=${advisor.confidence}`,
    `reason=${advisor.reason}`,
  ].join("; ");
}

export function buildRequestLog(params: {
  requestId: string;
  timestamp?: string;
  sessionId: string;
  input: SimulationRequest;
  stateContext: StateContext;
  planner: PlannerResult;
  scenarioA?: ScenarioResult;
  scenarioB?: ScenarioResult;
  riskA?: RiskResult;
  riskB?: RiskResult;
  reasoning?: AbReasoningResult;
  guardrailEvaluation: GuardrailEvaluationActual;
  advisor: AdvisorResult;
  latencyMs: number;
  model: string;
  tokens: number;
}): RequestLog {
  const timestamp = params.timestamp ?? new Date().toISOString();
  const guardrail = buildGuardrailLogRecord({
    input: params.input,
    stateContext: params.stateContext,
    riskA: params.riskA,
    riskB: params.riskB,
    reasoning: params.reasoning,
    evaluation: params.guardrailEvaluation,
  });

  return {
    request_id: params.requestId,
    timestamp,
    versions: buildLogVersions(params.guardrailEvaluation),
    input: {
      user_query: params.input.decision.context,
      user_context: params.input as Record<string, any>,
    },
    state: {
      session_id: params.sessionId,
      memory_snapshot: params.stateContext.user_state.memory_state,
      state_context: params.stateContext,
    },
    intermediate: {
      planner: params.planner,
      ...(params.scenarioA && params.scenarioB
        ? {
            scenario: {
              optionA: params.scenarioA,
              optionB: params.scenarioB,
            },
          }
        : {}),
      ...(params.riskA && params.riskB
        ? {
            risk: {
              optionA: params.riskA,
              optionB: params.riskB,
            },
          }
        : {}),
      ab_reasoning: params.reasoning,
    },
    guardrail,
    output: {
      final_answer: buildFinalAnswer(params.advisor),
      mode: mapGuardrailModeToOutputMode(
        params.guardrailEvaluation.guardrail_result.final_mode,
      ),
    },
    meta: {
      latency_ms: Math.round(params.latencyMs),
      model: params.model,
      tokens: params.tokens,
      deterministic_mode: params.guardrailEvaluation.deterministic_mode,
      scoring_input_source: params.guardrailEvaluation.scoring_input_source,
      generation_variance_flag: params.guardrailEvaluation.generation_variance_flag,
    },
  };
}

export async function logRequest(
  requestLog: RequestLog,
): Promise<{ requestLogPath: string; guardrailLogPath: string }> {
  const requestFileName = buildArtifactFileName(
    "request",
    requestLog.request_id,
    requestLog.timestamp,
  );
  const [requestLogPath, guardrailLogPath] = await Promise.all([
    writeJsonArtifact("request_logs", requestFileName, requestLog),
    logGuardrail(requestLog.request_id, requestLog.timestamp, requestLog.guardrail),
  ]);

  return {
    requestLogPath,
    guardrailLogPath,
  };
}
