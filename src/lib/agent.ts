import "server-only";

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
import { generateStructuredOutput } from "@/lib/openai";
import type {
  AbReasoningResult,
  AdvisorResult,
  DecisionInput,
  MemoryState,
  PlannerResult,
  ReflectionResult,
  RiskResult,
  ScenarioResult,
  SimulationResponse,
  StateContext,
  StateHints,
  UserProfile,
} from "@/lib/types";

type CaseInputPayload = {
  userProfile: UserProfile;
  decision: DecisionInput;
  prior_memory?: Partial<MemoryState>;
  state_hints?: StateHints;
};

const FULL_SELECTED_PATH = [
  "planner",
  "scenario",
  "risk",
  "ab_reasoning",
  "advisor",
  "reflection",
] as const;

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
): Promise<StateContext> {
  return generateStructuredOutput<StateContext>({
    schemaName: "state_context",
    schema: stateLoaderSchema,
    prompt: stateLoaderPrompt,
    input: formatPayload({
      caseId,
      caseInput,
    }),
  });
}

export async function runPlanner(
  caseId: string,
  caseInput: CaseInputPayload,
  stateContext: StateContext,
): Promise<PlannerResult> {
  return generateStructuredOutput<PlannerResult>({
    schemaName: "planner_result",
    schema: plannerSchema,
    prompt: plannerPrompt,
    input: formatPayload({
      caseId,
      caseInput,
      stateContext,
    }),
  });
}

export async function runScenarioA(
  caseId: string,
  caseInput: CaseInputPayload,
  stateContext: StateContext,
  planner: PlannerResult,
): Promise<ScenarioResult> {
  return generateStructuredOutput<ScenarioResult>({
    schemaName: "scenario_a_result",
    schema: scenarioSchema,
    prompt: scenarioPrompt,
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
  });
}

export async function runScenarioB(
  caseId: string,
  caseInput: CaseInputPayload,
  stateContext: StateContext,
  planner: PlannerResult,
): Promise<ScenarioResult> {
  return generateStructuredOutput<ScenarioResult>({
    schemaName: "scenario_b_result",
    schema: scenarioSchema,
    prompt: scenarioPrompt,
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
  });
}

export async function runRiskA(
  caseId: string,
  caseInput: CaseInputPayload,
  stateContext: StateContext,
  planner: PlannerResult,
  scenarioA: ScenarioResult,
): Promise<RiskResult> {
  return generateStructuredOutput<RiskResult>({
    schemaName: "risk_a_result",
    schema: riskSchema,
    prompt: riskPrompt,
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
  });
}

export async function runRiskB(
  caseId: string,
  caseInput: CaseInputPayload,
  stateContext: StateContext,
  planner: PlannerResult,
  scenarioB: ScenarioResult,
): Promise<RiskResult> {
  return generateStructuredOutput<RiskResult>({
    schemaName: "risk_b_result",
    schema: riskSchema,
    prompt: riskPrompt,
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
): Promise<AbReasoningResult> {
  return generateStructuredOutput<AbReasoningResult>({
    schemaName: "ab_reasoning_result",
    schema: abReasoningSchema,
    prompt: abReasoningPrompt,
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
    }),
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
  advisor: AdvisorResult,
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
      advisorResult: advisor,
    }),
  });
}

export async function runSimulationChain(
  userProfile: UserProfile,
  decision: DecisionInput,
  priorMemory?: Partial<MemoryState>,
  stateHints?: StateHints,
): Promise<SimulationResponse> {
  const caseId = "interactive-session";
  const caseInput = buildCaseInput(userProfile, decision, priorMemory, stateHints);
  const stateContext = await runStateLoader(caseId, caseInput);
  logStep("stateContext", stateContext);

  const planner = await runPlanner(caseId, caseInput, stateContext);
  logStep("planner", planner);

  const scenarioA = await runScenarioA(caseId, caseInput, stateContext, planner);
  logStep("scenarioA", scenarioA);

  const scenarioB = await runScenarioB(caseId, caseInput, stateContext, planner);
  logStep("scenarioB", scenarioB);

  const riskA = await runRiskA(caseId, caseInput, stateContext, planner, scenarioA);
  logStep("riskA", riskA);

  const riskB = await runRiskB(caseId, caseInput, stateContext, planner, scenarioB);
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
  );
  logStep("reasoning", reasoning);

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
    advisor,
  );
  logStep("reflection", reflection);

  return {
    stateContext,
    planner,
    scenarioA,
    scenarioB,
    riskA,
    riskB,
    reasoning,
    advisor,
    reflection,
  };
}
