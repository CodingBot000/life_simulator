import { readFile } from "node:fs/promises";

import type {
  AbReasoningResult,
  AdvisorResult,
  RiskResult,
  SimulationRequest,
  StateContext,
} from "../src/lib/types.ts";
import { buildRoutingDecision } from "../src/server/routing/request-router.ts";
import {
  deriveSelectiveGuardrailEvaluation,
  evaluateSimulationGuardrail,
} from "../src/server/guardrail/service.ts";

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
    mode,
    inputPath,
    stateContextPath,
    arg3,
    arg4,
    arg5,
  ] = process.argv.slice(2);

  if (!mode || !inputPath || !stateContextPath) {
    throw new Error(
      "Usage: resolve_playground_guardrail.ts <full|selective> <inputPath> <stateContextPath> ...",
    );
  }

  const input = await readJsonFile<SimulationRequest>(inputPath);
  const stateContext = await readJsonFile<StateContext>(stateContextPath);

  if (mode === "full") {
    if (!arg3 || !arg4 || !arg5) {
      throw new Error(
        "Usage: resolve_playground_guardrail.ts full <inputPath> <stateContextPath> <riskAPath> <riskBPath> <reasoningPath>",
      );
    }

    const [riskA, riskB, reasoning] = await Promise.all([
      readJsonFile<RiskResult>(arg3),
      readJsonFile<RiskResult>(arg4),
      readJsonFile<AbReasoningResult>(arg5),
    ]);
    const evaluation = await evaluateSimulationGuardrail({
      input,
      stateContext,
      riskA,
      riskB,
      reasoning,
    });

    process.stdout.write(`${JSON.stringify(evaluation.guardrail_result, null, 2)}\n`);
    return;
  }

  if (mode === "selective") {
    if (!arg3) {
      throw new Error(
        "Usage: resolve_playground_guardrail.ts selective <inputPath> <stateContextPath> <advisorPath> [riskAPath|-] [riskBPath|-]",
      );
    }

    const [advisor, riskA, riskB] = await Promise.all([
      readJsonFile<AdvisorResult>(arg3),
      readOptionalJsonFile<RiskResult>(arg4),
      readOptionalJsonFile<RiskResult>(arg5),
    ]);
    const routingDecision = buildRoutingDecision(input, stateContext);
    const evaluation = deriveSelectiveGuardrailEvaluation({
      input,
      stateContext,
      riskProfile: routingDecision.riskProfile,
      advisor,
      riskA,
      riskB,
    });

    process.stdout.write(`${JSON.stringify(evaluation.guardrail_result, null, 2)}\n`);
    return;
  }

  throw new Error(`Unsupported mode "${mode}". Expected "full" or "selective".`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
