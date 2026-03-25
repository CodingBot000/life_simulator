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
} from "@/lib/prompts";
import { generateStructuredOutput } from "@/lib/openai";
import type {
  AbReasoningResult,
  AdvisorResult,
  DecisionInput,
  PlannerResult,
  ReflectionResult,
  RiskResult,
  ScenarioResult,
  SimulationResponse,
  UserProfile,
} from "@/lib/types";

function formatPayload(payload: unknown): string {
  return JSON.stringify(payload, null, 2);
}

function logStep(step: string, payload: unknown) {
  console.info(`[simulate] ${step}`, payload);
}

export async function runPlanner(
  userProfile: UserProfile,
  decision: DecisionInput,
): Promise<PlannerResult> {
  return generateStructuredOutput<PlannerResult>({
    schemaName: "planner_result",
    schema: plannerSchema,
    prompt: plannerPrompt,
    input: formatPayload({
      userProfile,
      decision,
    }),
  });
}

export async function runScenarioA(
  userProfile: UserProfile,
  decision: DecisionInput,
  planner: PlannerResult,
): Promise<ScenarioResult> {
  return generateStructuredOutput<ScenarioResult>({
    schemaName: "scenario_a_result",
    schema: scenarioSchema,
    prompt: scenarioPrompt,
    input: formatPayload({
      optionLabel: "A",
      userProfile,
      selectedOption: decision.optionA,
      decisionContext: decision.context,
      factors: planner.factors,
      plannerResult: planner,
    }),
  });
}

export async function runScenarioB(
  userProfile: UserProfile,
  decision: DecisionInput,
  planner: PlannerResult,
): Promise<ScenarioResult> {
  return generateStructuredOutput<ScenarioResult>({
    schemaName: "scenario_b_result",
    schema: scenarioSchema,
    prompt: scenarioPrompt,
    input: formatPayload({
      optionLabel: "B",
      userProfile,
      selectedOption: decision.optionB,
      decisionContext: decision.context,
      factors: planner.factors,
      plannerResult: planner,
    }),
  });
}

export async function runRiskA(
  userProfile: UserProfile,
  decision: DecisionInput,
  planner: PlannerResult,
  scenarioA: ScenarioResult,
): Promise<RiskResult> {
  return generateStructuredOutput<RiskResult>({
    schemaName: "risk_a_result",
    schema: riskSchema,
    prompt: riskPrompt,
    input: formatPayload({
      optionLabel: "A",
      userProfile,
      selectedOption: decision.optionA,
      decisionContext: decision.context,
      factors: planner.factors,
      plannerResult: planner,
      scenario: scenarioA,
    }),
  });
}

export async function runRiskB(
  userProfile: UserProfile,
  decision: DecisionInput,
  planner: PlannerResult,
  scenarioB: ScenarioResult,
): Promise<RiskResult> {
  return generateStructuredOutput<RiskResult>({
    schemaName: "risk_b_result",
    schema: riskSchema,
    prompt: riskPrompt,
    input: formatPayload({
      optionLabel: "B",
      userProfile,
      selectedOption: decision.optionB,
      decisionContext: decision.context,
      factors: planner.factors,
      plannerResult: planner,
      scenario: scenarioB,
    }),
  });
}

export async function runAbReasoning(
  userProfile: UserProfile,
  decision: DecisionInput,
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
      caseId: "interactive-session",
      userProfile,
      decision,
      plannerResult: planner,
      scenarioA,
      scenarioB,
      riskA,
      riskB,
    }),
  });
}

export async function runAdvisor(
  userProfile: UserProfile,
  decision: DecisionInput,
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
      userProfile,
      decision,
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
  userProfile: UserProfile,
  decision: DecisionInput,
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
      userProfile,
      decision,
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
): Promise<SimulationResponse> {
  const planner = await runPlanner(userProfile, decision);
  logStep("planner", planner);

  const scenarioA = await runScenarioA(userProfile, decision, planner);
  logStep("scenarioA", scenarioA);

  const scenarioB = await runScenarioB(userProfile, decision, planner);
  logStep("scenarioB", scenarioB);

  const riskA = await runRiskA(userProfile, decision, planner, scenarioA);
  logStep("riskA", riskA);

  const riskB = await runRiskB(userProfile, decision, planner, scenarioB);
  logStep("riskB", riskB);

  const reasoning = await runAbReasoning(
    userProfile,
    decision,
    planner,
    scenarioA,
    scenarioB,
    riskA,
    riskB,
  );
  logStep("reasoning", reasoning);

  const advisor = await runAdvisor(
    userProfile,
    decision,
    planner,
    scenarioA,
    scenarioB,
    riskA,
    riskB,
    reasoning,
  );
  logStep("advisor", advisor);

  const reflection = await runReflection(
    userProfile,
    decision,
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
