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
  SimulationProgressEvent,
  SimulationResponse,
  SimulationRoutingSummary,
  SimulationStageExecutionKind,
  SimulationStageName,
  StateContext,
  StateHints,
  UserProfile,
} from "../../lib/types.ts";
import { buildRoutingDecision } from "../routing/request-router.ts";
import { invokeStructuredLLM } from "../llm/client.ts";
import {
  buildGuardrailFlags,
  deriveSelectiveGuardrailEvaluation,
  evaluateSimulationGuardrail,
} from "../guardrail/service.ts";
import type { GuardrailEvaluationActual } from "../../lib/guardrail-eval.ts";
import type { LLMStageLogEntry, RequestExecutionEnvelope } from "../logging/types.ts";
import {
  recordGuardrailTriggers,
  recordLlmStageMetric,
} from "../monitoring/prometheus.ts";
import type { ExecutionContext } from "./execution-context.ts";
import { createExecutionContext } from "./execution-context.ts";
import { deriveReflectionResult } from "./derived-results.ts";

const LOW_VARIANCE_TEMPERATURE = 0;
const STABLE_TEMPERATURE = 0.1;
const CONDITIONAL_STAGE_GROUPS: Record<
  "scenario" | "risk" | "ab_reasoning",
  SimulationStageName[]
> = {
  scenario: ["scenario_a", "scenario_b"],
  risk: ["risk_a", "risk_b"],
  ab_reasoning: ["ab_reasoning"],
};

export type SimulationProgressReporter = (
  event: SimulationProgressEvent,
) => void | Promise<void>;

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
  stageName: SimulationStageName;
  schemaName: string;
  schema: Record<string, unknown>;
  prompt: string;
  inputPayload: unknown;
  model: string;
  temperature: number;
  context: ExecutionContext;
  fallbackModel?: string;
  onProgress?: SimulationProgressReporter;
}): Promise<{ output: T; stageLog: LLMStageLogEntry }> {
  await emitProgress(params.onProgress, {
    type: "stage_started",
    request_id: params.context.request_id,
    stage_name: params.stageName,
    execution_kind: "llm",
    model: params.model,
  });

  const response = await invokeStructuredLLM<T>({
    schemaName: params.schemaName,
    schema: params.schema,
    prompt: params.prompt,
    input: formatPayload(params.inputPayload),
    model: params.model,
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

  await emitProgress(params.onProgress, {
    type: "stage_completed",
    request_id: params.context.request_id,
    stage_name: params.stageName,
    execution_kind: "llm",
    model: response.model,
  });

  return {
    output: response.output,
    stageLog: {
      request_id: params.context.request_id,
      trace_id: params.context.trace_id,
      user_id: params.context.user_id,
      session_id: params.context.session_id,
      route_name: params.context.route_name,
      execution_mode: params.context.execution_mode,
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

async function emitProgress(
  reporter: SimulationProgressReporter | undefined,
  event: SimulationProgressEvent,
): Promise<void> {
  if (!reporter) {
    return;
  }

  await reporter(event);
}

function resolveSkippedStages(selectedPath: string[]): SimulationStageName[] {
  const skipped = new Set<SimulationStageName>();

  for (const [stageGroup, stages] of Object.entries(CONDITIONAL_STAGE_GROUPS) as [
    keyof typeof CONDITIONAL_STAGE_GROUPS,
    SimulationStageName[],
  ][]) {
    if (!selectedPath.includes(stageGroup)) {
      for (const stage of stages) {
        skipped.add(stage);
      }
    }
  }

  return [...skipped];
}

async function emitDeterministicStageProgress(params: {
  reporter?: SimulationProgressReporter;
  requestId: string;
  stageName: SimulationStageName;
  executionKind: SimulationStageExecutionKind;
  model: string;
}): Promise<void> {
  await emitProgress(params.reporter, {
    type: "stage_started",
    request_id: params.requestId,
    stage_name: params.stageName,
    execution_kind: params.executionKind,
    model: params.model,
  });

  await emitProgress(params.reporter, {
    type: "stage_completed",
    request_id: params.requestId,
    stage_name: params.stageName,
    execution_kind: params.executionKind,
    model: params.model,
  });
}

function createDeterministicStageLog(params: {
  stageName: SimulationStageName;
  model?: string;
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
    execution_mode: params.context.execution_mode,
    selected_path: params.context.selected_path,
    stage_name: params.stageName,
    model: params.model ?? "deterministic-stage",
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

function shouldRunGroupedStage(
  selectedPath: string[],
  stageName: "scenario" | "risk" | "ab_reasoning" | "guardrail" | "reflection",
): boolean {
  return selectedPath.includes(stageName);
}

function applyRoutingDecision(
  context: ExecutionContext,
  routingDecision: ReturnType<typeof buildRoutingDecision>,
): void {
  context.execution_mode = routingDecision.executionMode;
  context.selected_path = [...routingDecision.selectedPath];
  context.selected_model = routingDecision.selectedModel;
  context.stage_model_plan = { ...routingDecision.stageModelPlan };
  context.stage_fallback_plan = { ...routingDecision.stageFallbackPlan };
}

function buildRoutingSummary(
  routingDecision: ReturnType<typeof buildRoutingDecision>,
): SimulationRoutingSummary {
  return {
    execution_mode: routingDecision.executionMode,
    selected_path: [...routingDecision.selectedPath],
    stage_model_plan: { ...routingDecision.stageModelPlan },
    stage_fallback_plan: { ...routingDecision.stageFallbackPlan },
    reasons: [...routingDecision.reasons],
    risk_profile: {
      model_tier: routingDecision.riskProfile.modelTier,
      risk_band: routingDecision.riskProfile.riskBand,
      complexity: routingDecision.riskProfile.complexity,
      ambiguity: routingDecision.riskProfile.ambiguity,
      state_unknown_count: routingDecision.riskProfile.stateUnknownCount,
      estimated_tokens: routingDecision.riskProfile.estimatedTokens,
    },
  };
}

export interface SimulationRunOptions {
  userId?: string;
  sessionId?: string;
  traceId?: string;
  onProgress?: SimulationProgressReporter;
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
  const bootstrapRoutingDecision = buildRoutingDecision(caseInput);
  const executionContext = createExecutionContext({
    routeName: bootstrapRoutingDecision.routeName,
    executionMode: bootstrapRoutingDecision.executionMode,
    selectedPath: bootstrapRoutingDecision.selectedPath,
    selectedModel: bootstrapRoutingDecision.selectedModel,
    stageModelPlan: bootstrapRoutingDecision.stageModelPlan,
    stageFallbackPlan: bootstrapRoutingDecision.stageFallbackPlan,
    userId: options?.userId,
    sessionId: options?.sessionId,
    traceId: options?.traceId,
  });
  const startedAt = Date.now();
  const stageLogs: LLMStageLogEntry[] = [];
  const caseId = executionContext.request_id;

  await emitProgress(options?.onProgress, {
    type: "request_started",
    request_id: executionContext.request_id,
    trace_id: executionContext.trace_id,
  });

  const stateContextStage = await runStructuredStage<StateContext>({
    stageName: "state_loader",
    schemaName: "state_context",
    schema: stateLoaderSchema,
    prompt: stateLoaderPrompt,
    inputPayload: {
      caseId,
      caseInput,
    },
    model:
      executionContext.stage_model_plan.state_loader ?? executionContext.selected_model,
    temperature: STABLE_TEMPERATURE,
    context: executionContext,
    fallbackModel: executionContext.stage_fallback_plan.state_loader,
    onProgress: options?.onProgress,
  });
  stageLogs.push(stateContextStage.stageLog);
  const stateContext = stateContextStage.output;
  const routingDecision = buildRoutingDecision(caseInput, stateContext);
  applyRoutingDecision(executionContext, routingDecision);
  stateContextStage.stageLog.execution_mode = executionContext.execution_mode;
  stateContextStage.stageLog.selected_path = [...executionContext.selected_path];

  await emitProgress(options?.onProgress, {
    type: "routing_resolved",
    request_id: executionContext.request_id,
    execution_mode: executionContext.execution_mode,
    selected_path: [...executionContext.selected_path],
    skipped_stages: resolveSkippedStages(executionContext.selected_path),
  });

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
    model: executionContext.stage_model_plan.planner,
    temperature: STABLE_TEMPERATURE,
    context: executionContext,
    fallbackModel: executionContext.stage_fallback_plan.planner,
    onProgress: options?.onProgress,
  });
  stageLogs.push(plannerStage.stageLog);
  const planner = plannerStage.output;

  let scenarioA: ScenarioResult | undefined;
  let scenarioB: ScenarioResult | undefined;
  let riskA: RiskResult | undefined;
  let riskB: RiskResult | undefined;
  let reasoning: AbReasoningResult | undefined;
  let guardrailEvaluation: GuardrailEvaluationActual | undefined;
  let guardrail: GuardrailResult | undefined;

  if (shouldRunGroupedStage(executionContext.selected_path, "scenario")) {
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
      model: executionContext.stage_model_plan.scenario_a,
      temperature: LOW_VARIANCE_TEMPERATURE,
      context: executionContext,
      fallbackModel: executionContext.stage_fallback_plan.scenario_a,
      onProgress: options?.onProgress,
    });
    stageLogs.push(scenarioAStage.stageLog);
    scenarioA = scenarioAStage.output;

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
      model: executionContext.stage_model_plan.scenario_b,
      temperature: LOW_VARIANCE_TEMPERATURE,
      context: executionContext,
      fallbackModel: executionContext.stage_fallback_plan.scenario_b,
      onProgress: options?.onProgress,
    });
    stageLogs.push(scenarioBStage.stageLog);
    scenarioB = scenarioBStage.output;
  }

  if (
    shouldRunGroupedStage(executionContext.selected_path, "risk") &&
    scenarioA &&
    scenarioB
  ) {
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
      model: executionContext.stage_model_plan.risk_a,
      temperature: LOW_VARIANCE_TEMPERATURE,
      context: executionContext,
      fallbackModel: executionContext.stage_fallback_plan.risk_a,
      onProgress: options?.onProgress,
    });
    stageLogs.push(riskAStage.stageLog);
    riskA = riskAStage.output;

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
      model: executionContext.stage_model_plan.risk_b,
      temperature: LOW_VARIANCE_TEMPERATURE,
      context: executionContext,
      fallbackModel: executionContext.stage_fallback_plan.risk_b,
      onProgress: options?.onProgress,
    });
    stageLogs.push(riskBStage.stageLog);
    riskB = riskBStage.output;
  }

  if (
    shouldRunGroupedStage(executionContext.selected_path, "ab_reasoning") &&
    scenarioA &&
    scenarioB &&
    riskA &&
    riskB
  ) {
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
      model: executionContext.stage_model_plan.ab_reasoning,
      temperature: LOW_VARIANCE_TEMPERATURE,
      context: executionContext,
      fallbackModel: executionContext.stage_fallback_plan.ab_reasoning,
      onProgress: options?.onProgress,
    });
    stageLogs.push(reasoningStage.stageLog);
    reasoning = reasoningStage.output;
  }

  if (
    shouldRunGroupedStage(executionContext.selected_path, "guardrail") &&
    riskA &&
    riskB &&
    reasoning
  ) {
    await emitDeterministicStageProgress({
      reporter: options?.onProgress,
      requestId: executionContext.request_id,
      stageName: "guardrail",
      executionKind: "deterministic",
      model: "deterministic-guardrail",
    });
    guardrailEvaluation = await evaluateSimulationGuardrail({
      input: caseInput,
      stateContext,
      riskA,
      riskB,
      reasoning,
    });
    guardrail = guardrailEvaluation.guardrail_result;
    stageLogs.push(
      createDeterministicStageLog({
        stageName: "guardrail",
        model: "deterministic-guardrail",
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
  }

  const advisorStage = await runStructuredStage<AdvisorResult>({
    stageName: "advisor",
    schemaName: "advisor_result",
    schema: advisorSchema,
    prompt: advisorPrompt,
    inputPayload: {
      executionMode: executionContext.execution_mode,
      routing: {
        execution_mode: executionContext.execution_mode,
        selected_path: routingDecision.selectedPath,
      },
      caseId,
      caseInput,
      stateContext,
      plannerResult: planner,
      ...(scenarioA ? { scenarioA } : {}),
      ...(scenarioB ? { scenarioB } : {}),
      ...(riskA ? { riskA } : {}),
      ...(riskB ? { riskB } : {}),
      ...(reasoning ? { abReasoning: reasoning } : {}),
      ...(guardrail ? { guardrailResult: guardrail } : {}),
    },
    model: executionContext.stage_model_plan.advisor,
    temperature: STABLE_TEMPERATURE,
    context: executionContext,
    fallbackModel: executionContext.stage_fallback_plan.advisor,
    onProgress: options?.onProgress,
  });
  stageLogs.push(advisorStage.stageLog);
  const advisor = advisorStage.output;

  if (!guardrailEvaluation) {
    await emitDeterministicStageProgress({
      reporter: options?.onProgress,
      requestId: executionContext.request_id,
      stageName: "guardrail",
      executionKind: "derived",
      model: "derived-guardrail",
    });
    guardrailEvaluation = deriveSelectiveGuardrailEvaluation({
      input: caseInput,
      stateContext,
      riskProfile: routingDecision.riskProfile,
      advisor,
      riskA,
      riskB,
    });
    guardrail = guardrailEvaluation.guardrail_result;
    stageLogs.push(
      createDeterministicStageLog({
        stageName: "guardrail",
        model: "derived-guardrail",
        context: executionContext,
        requestPayload: {
          executionMode: executionContext.execution_mode,
          routing: buildRoutingSummary(routingDecision),
          advisorResult: advisor,
          riskA,
          riskB,
        },
        responsePayload: guardrail,
      }),
    );
  }

  const finalizedGuardrail = guardrailEvaluation.guardrail_result;

  recordGuardrailTriggers(
    executionContext.route_name,
    finalizedGuardrail.triggers,
  );

  let reflection: ReflectionResult;

  if (
    shouldRunGroupedStage(executionContext.selected_path, "reflection") &&
    scenarioA &&
    scenarioB &&
    riskA &&
    riskB &&
    reasoning
  ) {
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
        guardrailResult: finalizedGuardrail,
        advisorResult: advisor,
      },
      model: executionContext.stage_model_plan.reflection,
      temperature: STABLE_TEMPERATURE,
      context: executionContext,
      fallbackModel: executionContext.stage_fallback_plan.reflection,
      onProgress: options?.onProgress,
    });
    stageLogs.push(reflectionStage.stageLog);
    reflection = reflectionStage.output;
  } else {
    await emitDeterministicStageProgress({
      reporter: options?.onProgress,
      requestId: executionContext.request_id,
      stageName: "reflection",
      executionKind: "derived",
      model: "derived-reflection",
    });
    reflection = deriveReflectionResult({
      executionMode: executionContext.execution_mode,
      advisor,
      guardrailEvaluation,
    });
    stageLogs.push(
      createDeterministicStageLog({
        stageName: "reflection",
        model: "derived-reflection",
        context: executionContext,
        requestPayload: {
          executionMode: executionContext.execution_mode,
          advisorResult: advisor,
          guardrailResult: finalizedGuardrail,
        },
        responsePayload: reflection,
      }),
    );
  }

  const response: SimulationResponse = {
    request_id: executionContext.request_id,
    routing: buildRoutingSummary(routingDecision),
    stateContext,
    planner,
    ...(scenarioA ? { scenarioA } : {}),
    ...(scenarioB ? { scenarioB } : {}),
    ...(riskA ? { riskA } : {}),
    ...(riskB ? { riskB } : {}),
    ...(reasoning ? { reasoning } : {}),
    guardrail: finalizedGuardrail,
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
    execution_mode: executionContext.execution_mode,
    selected_path: executionContext.selected_path,
    selected_model: executionContext.selected_model,
    stage_model_plan: { ...executionContext.stage_model_plan },
    stage_fallback_plan: { ...executionContext.stage_fallback_plan },
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
