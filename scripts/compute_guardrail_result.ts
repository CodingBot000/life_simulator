import { readFile } from "node:fs/promises";

import {
  evaluateGuardrailSignals,
  normalizeRiskLevel,
  type GuardrailSignals,
} from "../src/lib/guardrail-eval.ts";
import type { GuardrailThresholdSetName } from "../src/config/guardrail-thresholds.ts";

async function main() {
  const [
    stateContextPath,
    riskAPath,
    riskBPath,
    reasoningPath,
    thresholdSetName = "baseline",
  ] = process.argv.slice(2);

  if (!stateContextPath || !riskAPath || !riskBPath || !reasoningPath) {
    throw new Error(
      "Usage: compute_guardrail_result.ts <stateContext> <riskA> <riskB> <reasoning> [thresholdSetName]",
    );
  }

  const [stateContext, riskA, riskB, reasoning] = await Promise.all([
    readFile(stateContextPath, "utf8").then((text) => JSON.parse(text)),
    readFile(riskAPath, "utf8").then((text) => JSON.parse(text)),
    readFile(riskBPath, "utf8").then((text) => JSON.parse(text)),
    readFile(reasoningPath, "utf8").then((text) => JSON.parse(text)),
  ]);

  const unknownValues = [
    stateContext.user_state.profile_state.risk_preference,
    stateContext.user_state.profile_state.decision_style,
    stateContext.user_state.situational_state.career_stage,
    stateContext.user_state.situational_state.financial_pressure,
    stateContext.user_state.situational_state.time_pressure,
    stateContext.user_state.situational_state.emotional_state,
  ];

  const signals: GuardrailSignals = {
    state_unknown_count: unknownValues.filter(
      (value) => value === "unknown" || value === "none",
    ).length,
    final_confidence: reasoning.reasoning.final_selection.decision_confidence,
    a_confidence: reasoning.reasoning.a_reasoning.confidence,
    b_confidence: reasoning.reasoning.b_reasoning.confidence,
    a_recommendation: reasoning.reasoning.a_reasoning.recommended_option,
    b_recommendation: reasoning.reasoning.b_reasoning.recommended_option,
    conflict_count: reasoning.reasoning.comparison.conflicts.length,
    risk_a: normalizeRiskLevel(riskA.risk_level),
    risk_b: normalizeRiskLevel(riskB.risk_level),
  };

  const actual = evaluateGuardrailSignals(signals, {
    thresholdSetName: thresholdSetName as GuardrailThresholdSetName,
  });

  process.stdout.write(`${JSON.stringify(actual.guardrail_result, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
