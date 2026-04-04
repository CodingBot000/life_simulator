import {
  abReasoningPrompt,
  abReasoningSchema,
  advisorPrompt,
  advisorSchema,
  plannerPrompt,
  plannerSchema,
  reflectionPrompt,
  reflectionSchema,
  riskPrompt,
  riskSchema,
  scenarioPrompt,
  scenarioSchema,
  stateLoaderPrompt,
  stateLoaderSchema,
} from "../../lib/prompts.ts";
import { buildRequestLog } from "../../lib/logger/requestLogger.ts";
import type {
  AbReasoningResult,
  AdvisorResult,
  DecisionInput,
  GuardrailResult,
  MemoryState,
  PlannerResult,
  ReflectionResult,
  RiskResult,
  ScenarioResult,
  SimulationRequest,
  SimulationResponse,
  StateContext,
  StateHints,
  UserProfile,
} from "../../lib/types.ts";
import { buildRoutingDecision } from "../routing/request-router.ts";
import { invokeStructuredLLM } from "../llm/client.ts";
import { buildGuardrailFlags, evaluateSimulationGuardrail } from "../guardrail/service.ts";
import type { LLMStageLogEntry, RequestExecutionEnvelope } from "../logging/types.ts";
import {
  recordGuardrailTriggers,
  recordLlmStageMetric,
} from "../monitoring/prometheus.ts";
import type { ExecutionContext } from "./execution-context.ts";
import { createExecutionContext } from "./execution-context.ts";

const LOW_VARIANCE_TEMPERATURE = 0;
const STABLE_TEMPERATURE = 0.1;

function formatPayload(payload: unknown): string {
  return JSON.stringify(payload, null, 2);
}

function normalizePriorMemory(
  priorMemory?: Partial<MemoryState>,
): MemoryState | undefined {
  if (!priorMemory) {
    return undefined;
  }

  return {
    recent_similar_decisions: Array.isArray(priorMemory.recent_similar_decisions)
      ? priorMemory.recent_similar_decisions
      : [],
    repeated_patterns: Array.isArray(priorMemory.repeated_patterns)
      ? priorMemory.repeated_patterns
      : [],
    consistency_notes: Array.isArray(priorMemory.consistency_notes)
      ? priorMemory.consistency_notes
      : [],
  };
}

function buildCaseInput(
  userProfile: UserProfile,
  decision: DecisionInput,
  priorMemory?: Partial<MemoryState>,
  stateHints?: StateHints,
): SimulationRequest {
  const normalizedPriorMemory = normalizePriorMemory(priorMemory);

  return {
    userProfile,
    decision,
    ...(normalizedPriorMemory
      ? { prior_memory: normalizedPriorMemory }
      : {}),
    ...(stateHints ? { state_hints: stateHints } : {}),
  };
}

async function runStructuredStage<T>(params: {
  stageName: string;
  schemaName: string;
  schema: Record<string, unknown>;
  prompt: string;
  inputPayload: unknown;
  temperature: number;
  context: ExecutionContext;
  fallbackModel?: string;
}): Promise<{ output: T; stageLog: LLMStageLogEntry }> {
  const response = await invokeStructuredLLM<T>({
    schemaName: params.schemaName,
    schema: params.schema,
    prompt: params.prompt,
    input: formatPayload(params.inputPayload),
    model: params.context.selected_model,
    fallbackModel: params.fallbackModel,
    temperature: params.temperature,
    metadata: {
      requestId: params.context.request_id,
      traceId: params.context.trace_id,
      routeName: params.context.route_name,
      stageName: params.stageName,
      userId: params.context.user_id,
      sessionId: params.context.session_id,
      promptVersion: params.context.prompt_version,
      contextVersion: params.context.context_version,
      selectedPath: params.context.selected_path,
    },
  });

  recordLlmStageMetric({
    routeName: params.context.route_name,
    stageName: params.stageName,
    model: response.model,
    latencyMs: response.latencyMs,
    inputTokens: response.usage.inputTokens,
    outputTokens: response.usage.outputTokens,
    estimatedCostUsd: response.estimatedCostUsd,
    retryCount: response.retryCount,
    fallbackUsed: response.fallbackUsed,
    cacheHit: response.cacheHit,
    schemaValid: response.schemaValid,
    schemaFailureCount: response.schemaFailureCount,
  });

  return {
    output: response.output,
    stageLog: {
      request_id: params.context.request_id,
      trace_id: params.context.trace_id,
      user_id: params.context.user_id,
      session_id: params.context.session_id,
      route_name: params.context.route_name,
      selected_path: params.context.selected_path,
      stage_name: params.stageName,
      model: response.model,
      latency_ms: response.latencyMs,
      input_tokens: response.usage.inputTokens,
      output_tokens: response.usage.outputTokens,
      total_tokens: response.usage.totalTokens,
      estimated_cost_usd: response.estimatedCostUsd,
      fallback_used: response.fallbackUsed,
      retry_count: response.retryCount,
      cache_hit: response.cacheHit,
      schema_valid: response.schemaValid,
      schema_failure_count: response.schemaFailureCount,
      prompt_version: params.context.prompt_version,
      context_version: params.context.context_version,
      request_payload: params.inputPayload,
      response_payload: response.output,
      created_at: new Date().toISOString(),
    },
  };
}

function createDeterministicStageLog(params: {
  stageName: string;
  context: ExecutionContext;
  requestPayload: unknown;
  responsePayload: unknown;
}): LLMStageLogEntry {
  return {
    request_id: params.context.request_id,
    trace_id: params.context.trace_id,
    user_id: params.context.user_id,
    session_id: params.context.session_id,
    route_name: params.context.route_name,
    selected_path: params.context.selected_path,
    stage_name: params.stageName,
    model: "deterministic-guardrail",
    latency_ms: 0,
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
    estimated_cost_usd: 0,
    fallback_used: false,
    retry_count: 0,
    cache_hit: false,
    schema_valid: true,
    schema_failure_count: 0,
    prompt_version: params.context.prompt_version,
    context_version: params.context.context_version,
    request_payload: params.requestPayload,
    response_payload: params.responsePayload,
    created_at: new Date().toISOString(),
  };
}

function sumStageMetric(
  stages: LLMStageLogEntry[],
  key: "latency_ms" | "total_tokens" | "estimated_cost_usd" | "retry_count" | "schema_failure_count",
): number {
  return stages.reduce((sum, stage) => sum + stage[key], 0);
}

function hasAny(stages: LLMStageLogEntry[], key: "fallback_used" | "cache_hit"): boolean {
  return stages.some((stage) => stage[key]);
}

export interface SimulationRunOptions {
  userId?: string;
  sessionId?: string;
  traceId?: string;
}

export interface SimulationRunResult {
  response: SimulationResponse;
  executionContext: ExecutionContext;
  envelope: RequestExecutionEnvelope;
}

export async function runSimulationRequest(
  userProfile: UserProfile,
  decision: DecisionInput,
  priorMemory?: Partial<MemoryState>,
  stateHints?: StateHints,
  options?: SimulationRunOptions,
): Promise<SimulationRunResult> {
  const caseInput = buildCaseInput(userProfile, decision, priorMemory, stateHints);
  const routingDecision = buildRoutingDecision(caseInput);
  const executionContext = createExecutionContext({
    routeName: routingDecision.routeName,
    selectedPath: routingDecision.selectedPath,
    selectedModel: routingDecision.selectedModel,
    userId: options?.userId,
    sessionId: options?.sessionId,
    traceId: options?.traceId,
  });
  const startedAt = Date.now();
  const stageLogs: LLMStageLogEntry[] = [];
  const caseId = executionContext.request_id;

  const stateContextStage = await runStructuredStage<StateContext>({
    stageName: "state_loader",
    schemaName: "state_context",
    schema: stateLoaderSchema,
    prompt: stateLoaderPrompt,
    inputPayload: {
      caseId,
      caseInput,
    },
    temperature: STABLE_TEMPERATURE,
    context: executionContext,
    fallbackModel: routingDecision.fallbackModel,
  });
  stageLogs.push(stateContextStage.stageLog);
  const stateContext = stateContextStage.output;

  const plannerStage = await runStructuredStage<PlannerResult>({
    stageName: "planner",
    schemaName: "planner_result",
    schema: plannerSchema,
    prompt: plannerPrompt,
    inputPayload: {
      caseId,
      caseInput,
      stateContext,
    },
    temperature: STABLE_TEMPERATURE,
    context: executionContext,
    fallbackModel: routingDecision.fallbackModel,
  });
  stageLogs.push(plannerStage.stageLog);
  const planner = plannerStage.output;

  const scenarioAStage = await runStructuredStage<ScenarioResult>({
    stageName: "scenario_a",
    schemaName: "scenario_a_result",
    schema: scenarioSchema,
    prompt: scenarioPrompt,
    inputPayload: {
      caseId,
      caseInput,
      stateContext,
      optionLabel: "A",
      selectedOption: caseInput.decision.optionA,
      decisionContext: caseInput.decision.context,
      factors: planner.factors,
      plannerResult: planner,
    },
    temperature: LOW_VARIANCE_TEMPERATURE,
    context: executionContext,
    fallbackModel: routingDecision.fallbackModel,
  });
  stageLogs.push(scenarioAStage.stageLog);
  const scenarioA = scenarioAStage.output;

  const scenarioBStage = await runStructuredStage<ScenarioResult>({
    stageName: "scenario_b",
    schemaName: "scenario_b_result",
    schema: scenarioSchema,
    prompt: scenarioPrompt,
    inputPayload: {
      caseId,
      caseInput,
      stateContext,
      optionLabel: "B",
      selectedOption: caseInput.decision.optionB,
      decisionContext: caseInput.decision.context,
      factors: planner.factors,
      plannerResult: planner,
    },
    temperature: LOW_VARIANCE_TEMPERATURE,
    context: executionContext,
    fallbackModel: routingDecision.fallbackModel,
  });
  stageLogs.push(scenarioBStage.stageLog);
  const scenarioB = scenarioBStage.output;

  const riskAStage = await runStructuredStage<RiskResult>({
    stageName: "risk_a",
    schemaName: "risk_a_result",
    schema: riskSchema,
    prompt: riskPrompt,
    inputPayload: {
      caseId,
      caseInput,
      stateContext,
      optionLabel: "A",
      selectedOption: caseInput.decision.optionA,
      decisionContext: caseInput.decision.context,
      factors: planner.factors,
      plannerResult: planner,
      scenario: scenarioA,
    },
    temperature: LOW_VARIANCE_TEMPERATURE,
    context: executionContext,
    fallbackModel: routingDecision.fallbackModel,
  });
  stageLogs.push(riskAStage.stageLog);
  const riskA = riskAStage.output;

  const riskBStage = await runStructuredStage<RiskResult>({
    stageName: "risk_b",
    schemaName: "risk_b_result",
    schema: riskSchema,
    prompt: riskPrompt,
    inputPayload: {
      caseId,
      caseInput,
      stateContext,
      optionLabel: "B",
      selectedOption: caseInput.decision.optionB,
      decisionContext: caseInput.decision.context,
      factors: planner.factors,
      plannerResult: planner,
      scenario: scenarioB,
    },
    temperature: LOW_VARIANCE_TEMPERATURE,
    context: executionContext,
    fallbackModel: routingDecision.fallbackModel,
  });
  stageLogs.push(riskBStage.stageLog);
  const riskB = riskBStage.output;

  const reasoningStage = await runStructuredStage<AbReasoningResult>({
    stageName: "ab_reasoning",
    schemaName: "ab_reasoning_result",
    schema: abReasoningSchema,
    prompt: abReasoningPrompt,
    inputPayload: {
      caseId,
      caseInput,
      stateContext,
      plannerResult: planner,
      scenarioA,
      scenarioB,
      riskA,
      riskB,
    },
    temperature: LOW_VARIANCE_TEMPERATURE,
    context: executionContext,
    fallbackModel: routingDecision.fallbackModel,
  });
  stageLogs.push(reasoningStage.stageLog);
  const reasoning = reasoningStage.output;

  const guardrailEvaluation = await evaluateSimulationGuardrail({
    input: caseInput,
    stateContext,
    riskA,
    riskB,
    reasoning,
  });
  const guardrail = guardrailEvaluation.guardrail_result;
  stageLogs.push(
    createDeterministicStageLog({
      stageName: "guardrail",
      context: executionContext,
      requestPayload: {
        caseInput,
        stateContext,
        riskA,
        riskB,
        reasoning,
      },
      responsePayload: guardrail,
    }),
  );
  recordGuardrailTriggers(executionContext.route_name, guardrail.triggers);

  const advisorStage = await runStructuredStage<AdvisorResult>({
    stageName: "advisor",
    schemaName: "advisor_result",
    schema: advisorSchema,
    prompt: advisorPrompt,
    inputPayload: {
      executionMode: "full",
      routing: {
        execution_mode: "full",
        selected_path: routingDecision.selectedPath,
      },
      caseId,
      caseInput,
      stateContext,
      plannerResult: planner,
      scenarioA,
      scenarioB,
      riskA,
      riskB,
      abReasoning: reasoning,
      guardrailResult: guardrail,
    },
    temperature: STABLE_TEMPERATURE,
    context: executionContext,
    fallbackModel: routingDecision.fallbackModel,
  });
  stageLogs.push(advisorStage.stageLog);
  const advisor = advisorStage.output;

  const reflectionStage = await runStructuredStage<ReflectionResult>({
    stageName: "reflection",
    schemaName: "reflection_result",
    schema: reflectionSchema,
    prompt: reflectionPrompt,
    inputPayload: {
      caseId,
      caseInput,
      stateContext,
      plannerResult: planner,
      scenarioA,
      scenarioB,
      riskA,
      riskB,
      abReasoning: reasoning,
      guardrailResult: guardrail,
      advisorResult: advisor,
    },
    temperature: STABLE_TEMPERATURE,
    context: executionContext,
    fallbackModel: routingDecision.fallbackModel,
  });
  stageLogs.push(reflectionStage.stageLog);
  const reflection = reflectionStage.output;

  const response: SimulationResponse = {
    request_id: executionContext.request_id,
    stateContext,
    planner,
    scenarioA,
    scenarioB,
    riskA,
    riskB,
    reasoning,
    guardrail,
    advisor,
    reflection,
  };

  const requestLog = buildRequestLog({
    requestId: executionContext.request_id,
    sessionId: executionContext.session_id,
    input: caseInput,
    stateContext,
    planner,
    scenarioA,
    scenarioB,
    riskA,
    riskB,
    reasoning,
    guardrailEvaluation,
    advisor,
    latencyMs: Date.now() - startedAt,
    model: executionContext.selected_model,
    tokens: sumStageMetric(stageLogs, "total_tokens"),
  });

  const envelope: RequestExecutionEnvelope = {
    request_id: executionContext.request_id,
    trace_id: executionContext.trace_id,
    user_id: executionContext.user_id,
    session_id: executionContext.session_id,
    route_name: executionContext.route_name,
    selected_path: executionContext.selected_path,
    selected_model: executionContext.selected_model,
    prompt_version: executionContext.prompt_version,
    context_version: executionContext.context_version,
    decision: advisor.decision,
    confidence: advisor.confidence,
    latency_ms: Date.now() - startedAt,
    total_tokens: sumStageMetric(stageLogs, "total_tokens"),
    estimated_cost_usd: Number(sumStageMetric(stageLogs, "estimated_cost_usd").toFixed(6)),
    fallback_used: hasAny(stageLogs, "fallback_used"),
    retry_count: sumStageMetric(stageLogs, "retry_count"),
    cache_hit: hasAny(stageLogs, "cache_hit"),
    schema_valid: stageLogs.every((stage) => stage.schema_valid),
    schema_failure_count: sumStageMetric(stageLogs, "schema_failure_count"),
    guardrail_flags: buildGuardrailFlags(guardrailEvaluation),
    request_payload: caseInput,
    response_payload: response,
    request_log: requestLog,
    stage_logs: stageLogs,
    guardrail_evaluation: guardrailEvaluation,
    created_at: new Date().toISOString(),
  };

  return {
    response,
    executionContext,
    envelope,
  };
}
