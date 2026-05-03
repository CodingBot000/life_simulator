import { readFile } from "node:fs/promises";

import type {
  AdvisorResult,
  RiskResult,
  SimulationRequest,
  StateContext,
} from "../src/lib/types.ts";
import { buildRoutingDecision } from "../src/server/routing/request-router.ts";
import { deriveSelectiveGuardrailEvaluation } from "../src/server/guardrail/service.ts";
import { deriveReflectionResult } from "../src/server/agent/derived-results.ts";

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function readOptionalJsonFile<T>(filePath?: string): Promise<T | undefined> {
  if (!filePath || filePath === "-") {
    return undefined;
  }

  return readJsonFile<T>(filePath);
}

async function main() {
  const [
    inputPath,
    stateContextPath,
    advisorPath,
    riskAPath,
    riskBPath,
  ] = process.argv.slice(2);

  if (!inputPath || !stateContextPath || !advisorPath) {
    throw new Error(
      "Usage: resolve_playground_reflection.ts <inputPath> <stateContextPath> <advisorPath> [riskAPath|-] [riskBPath|-]",
    );
  }

  const [input, stateContext, advisor, riskA, riskB] = await Promise.all([
    readJsonFile<SimulationRequest>(inputPath),
    readJsonFile<StateContext>(stateContextPath),
    readJsonFile<AdvisorResult>(advisorPath),
    readOptionalJsonFile<RiskResult>(riskAPath),
    readOptionalJsonFile<RiskResult>(riskBPath),
  ]);
  const routingDecision = buildRoutingDecision(input, stateContext);
  const guardrailEvaluation = deriveSelectiveGuardrailEvaluation({
    input,
    stateContext,
    riskProfile: routingDecision.riskProfile,
    advisor,
    riskA,
    riskB,
  });
  const reflection = deriveReflectionResult({
    executionMode: routingDecision.executionMode,
    advisor,
    guardrailEvaluation,
  });

  process.stdout.write(`${JSON.stringify(reflection, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
