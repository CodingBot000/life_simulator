import "server-only";

import { randomUUID } from "node:crypto";

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
} from "@/lib/prompts";
import { OPENAI_MODEL, generateStructuredOutput } from "@/lib/openai";
import {
  evaluateGuardrailArtifacts,
  type GuardrailEvaluationActual,
} from "@/lib/guardrail-eval";
import { buildRequestLog, logRequest } from "@/lib/logger/requestLogger";
import {
  hasAnomaly,
} from "@/lib/monitoring/anomalyDetector";
import { enqueueAnomaly } from "@/lib/monitoring/anomalyQueue";
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
} from "@/lib/types";
import type { StructuredOutputUsage } from "@/lib/openai";

type CaseInputPayload = SimulationRequest;
type UsageRecorder = (usage: StructuredOutputUsage) => void;

const FULL_SELECTED_PATH = [
  "planner",
  "scenario",
  "risk",
  "ab_reasoning",
  "guardrail",
  "advisor",
  "reflection",
] as const;
const LOW_VARIANCE_TEMPERATURE = 0;
const STABLE_TEMPERATURE = 0.1;

function formatPayload(payload: unknown): string {
  return JSON.stringify(payload, null, 2);
}

function logStep(step: string, payload: unknown) {
  console.info(`[simulate] ${step}`, payload);
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
): CaseInputPayload {
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

export async function runStateLoader(
  caseId: string,
  caseInput: CaseInputPayload,
  onUsage?: UsageRecorder,
): Promise<StateContext> {
  return generateStructuredOutput<StateContext>({
    schemaName: "state_context",
    schema: stateLoaderSchema,
    prompt: stateLoaderPrompt,
    temperature: STABLE_TEMPERATURE,
    input: formatPayload({
      caseId,
      caseInput,
    }),
    onUsage,
  });
}

export async function runPlanner(
  caseId: string,
  caseInput: CaseInputPayload,
  stateContext: StateContext,
  onUsage?: UsageRecorder,
): Promise<PlannerResult> {
  return generateStructuredOutput<PlannerResult>({
    schemaName: "planner_result",
    schema: plannerSchema,
    prompt: plannerPrompt,
    temperature: STABLE_TEMPERATURE,
    input: formatPayload({
      caseId,
      caseInput,
      stateContext,
    }),
    onUsage,
  });
}

export async function runScenarioA(
  caseId: string,
  caseInput: CaseInputPayload,
  stateContext: StateContext,
  planner: PlannerResult,
  onUsage?: UsageRecorder,
): Promise<ScenarioResult> {
  return generateStructuredOutput<ScenarioResult>({
    schemaName: "scenario_a_result",
    schema: scenarioSchema,
    prompt: scenarioPrompt,
    temperature: LOW_VARIANCE_TEMPERATURE,
    input: formatPayload({
      caseId,
      caseInput,
      stateContext,
      optionLabel: "A",
      selectedOption: caseInput.decision.optionA,
      decisionContext: caseInput.decision.context,
      factors: planner.factors,
      plannerResult: planner,
    }),
    onUsage,
  });
}

export async function runScenarioB(
  caseId: string,
  caseInput: CaseInputPayload,
  stateContext: StateContext,
  planner: PlannerResult,
  onUsage?: UsageRecorder,
): Promise<ScenarioResult> {
  return generateStructuredOutput<ScenarioResult>({
    schemaName: "scenario_b_result",
    schema: scenarioSchema,
    prompt: scenarioPrompt,
    temperature: LOW_VARIANCE_TEMPERATURE,
    input: formatPayload({
      caseId,
      caseInput,
      stateContext,
      optionLabel: "B",
      selectedOption: caseInput.decision.optionB,
      decisionContext: caseInput.decision.context,
      factors: planner.factors,
      plannerResult: planner,
    }),
    onUsage,
  });
}

export async function runRiskA(
  caseId: string,
  caseInput: CaseInputPayload,
  stateContext: StateContext,
  planner: PlannerResult,
  scenarioA: ScenarioResult,
  onUsage?: UsageRecorder,
): Promise<RiskResult> {
  return generateStructuredOutput<RiskResult>({
    schemaName: "risk_a_result",
    schema: riskSchema,
    prompt: riskPrompt,
    temperature: LOW_VARIANCE_TEMPERATURE,
    input: formatPayload({
      caseId,
      caseInput,
      stateContext,
      optionLabel: "A",
      selectedOption: caseInput.decision.optionA,
      decisionContext: caseInput.decision.context,
      factors: planner.factors,
      plannerResult: planner,
      scenario: scenarioA,
    }),
    onUsage,
  });
}

export async function runRiskB(
  caseId: string,
  caseInput: CaseInputPayload,
  stateContext: StateContext,
  planner: PlannerResult,
  scenarioB: ScenarioResult,
  onUsage?: UsageRecorder,
): Promise<RiskResult> {
  return generateStructuredOutput<RiskResult>({
    schemaName: "risk_b_result",
    schema: riskSchema,
    prompt: riskPrompt,
    temperature: LOW_VARIANCE_TEMPERATURE,
    input: formatPayload({
      caseId,
      caseInput,
      stateContext,
      optionLabel: "B",
      selectedOption: caseInput.decision.optionB,
      decisionContext: caseInput.decision.context,
      factors: planner.factors,
      plannerResult: planner,
      scenario: scenarioB,
    }),
    onUsage,
  });
}

export async function runAbReasoning(
  caseId: string,
  caseInput: CaseInputPayload,
  stateContext: StateContext,
  planner: PlannerResult,
  scenarioA: ScenarioResult,
  scenarioB: ScenarioResult,
  riskA: RiskResult,
  riskB: RiskResult,
  onUsage?: UsageRecorder,
): Promise<AbReasoningResult> {
  return generateStructuredOutput<AbReasoningResult>({
    schemaName: "ab_reasoning_result",
    schema: abReasoningSchema,
    prompt: abReasoningPrompt,
    temperature: LOW_VARIANCE_TEMPERATURE,
    input: formatPayload({
      caseId,
      caseInput,
      stateContext,
      plannerResult: planner,
      scenarioA,
      scenarioB,
      riskA,
      riskB,
    }),
    onUsage,
  });
}

export async function runAdvisor(
  caseId: string,
  caseInput: CaseInputPayload,
  stateContext: StateContext,
  planner: PlannerResult,
  scenarioA: ScenarioResult,
  scenarioB: ScenarioResult,
  riskA: RiskResult,
  riskB: RiskResult,
  reasoning: AbReasoningResult,
  guardrail: GuardrailResult,
  onUsage?: UsageRecorder,
): Promise<AdvisorResult> {
  return generateStructuredOutput<AdvisorResult>({
    schemaName: "advisor_result",
    schema: advisorSchema,
    prompt: advisorPrompt,
    input: formatPayload({
      executionMode: "full",
      routing: {
        execution_mode: "full",
        selected_path: FULL_SELECTED_PATH,
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
    }),
    onUsage,
  });
}

export async function runGuardrail(
  caseId: string,
  caseInput: CaseInputPayload,
  stateContext: StateContext,
  planner: PlannerResult,
  scenarioA: ScenarioResult,
  scenarioB: ScenarioResult,
  riskA: RiskResult,
  riskB: RiskResult,
  reasoning: AbReasoningResult,
): Promise<GuardrailEvaluationActual> {
  return evaluateGuardrailArtifacts({
    stateContext,
    riskA,
    riskB,
    reasoning,
    userInput: caseInput.decision.context,
    userContext: caseInput,
  });
}

export async function runReflection(
  caseId: string,
  caseInput: CaseInputPayload,
  stateContext: StateContext,
  planner: PlannerResult,
  scenarioA: ScenarioResult,
  scenarioB: ScenarioResult,
  riskA: RiskResult,
  riskB: RiskResult,
  reasoning: AbReasoningResult,
  guardrail: GuardrailResult,
  advisor: AdvisorResult,
  onUsage?: UsageRecorder,
): Promise<ReflectionResult> {
  return generateStructuredOutput<ReflectionResult>({
    schemaName: "reflection_result",
    schema: reflectionSchema,
    prompt: reflectionPrompt,
    input: formatPayload({
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
    }),
    onUsage,
  });
}

export async function runSimulationChain(
  userProfile: UserProfile,
  decision: DecisionInput,
  priorMemory?: Partial<MemoryState>,
  stateHints?: StateHints,
): Promise<SimulationResponse> {
  const requestId = randomUUID();
  const sessionId = "interactive-session";
  const caseId = requestId;
  const startedAt = Date.now();
  const usageTotals = {
    model: OPENAI_MODEL,
    tokens: 0,
  };
  const recordUsage: UsageRecorder = (usage) => {
    usageTotals.model = usage.model || usageTotals.model;
    usageTotals.tokens += usage.totalTokens;
  };
  const caseInput = buildCaseInput(userProfile, decision, priorMemory, stateHints);
  const stateContext = await runStateLoader(caseId, caseInput, recordUsage);
  logStep("stateContext", stateContext);

  const planner = await runPlanner(caseId, caseInput, stateContext, recordUsage);
  logStep("planner", planner);

  const scenarioA = await runScenarioA(
    caseId,
    caseInput,
    stateContext,
    planner,
    recordUsage,
  );
  logStep("scenarioA", scenarioA);

  const scenarioB = await runScenarioB(
    caseId,
    caseInput,
    stateContext,
    planner,
    recordUsage,
  );
  logStep("scenarioB", scenarioB);

  const riskA = await runRiskA(
    caseId,
    caseInput,
    stateContext,
    planner,
    scenarioA,
    recordUsage,
  );
  logStep("riskA", riskA);

  const riskB = await runRiskB(
    caseId,
    caseInput,
    stateContext,
    planner,
    scenarioB,
    recordUsage,
  );
  logStep("riskB", riskB);

  const reasoning = await runAbReasoning(
    caseId,
    caseInput,
    stateContext,
    planner,
    scenarioA,
    scenarioB,
    riskA,
    riskB,
    recordUsage,
  );
  logStep("reasoning", reasoning);

  const guardrailEvaluation = await runGuardrail(
    caseId,
    caseInput,
    stateContext,
    planner,
    scenarioA,
    scenarioB,
    riskA,
    riskB,
    reasoning,
  );
  const guardrail = guardrailEvaluation.guardrail_result;
  logStep("guardrail", guardrail);

  const advisor = await runAdvisor(
    caseId,
    caseInput,
    stateContext,
    planner,
    scenarioA,
    scenarioB,
    riskA,
    riskB,
    reasoning,
    guardrail,
    recordUsage,
  );
  logStep("advisor", advisor);

  const reflection = await runReflection(
    caseId,
    caseInput,
    stateContext,
    planner,
    scenarioA,
    scenarioB,
    riskA,
    riskB,
    reasoning,
    guardrail,
    advisor,
    recordUsage,
  );
  logStep("reflection", reflection);

  const response: SimulationResponse = {
    request_id: requestId,
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

  try {
    const requestLog = buildRequestLog({
      requestId,
      sessionId,
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
      model: usageTotals.model,
      tokens: usageTotals.tokens,
    });

    await logRequest(requestLog);

    if (hasAnomaly(requestLog)) {
      await enqueueAnomaly(requestLog);
    }
  } catch (error) {
    console.error("[simulate] failed to persist online logs", error);
  }

  return response;
}
