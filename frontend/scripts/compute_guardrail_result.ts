import { readFile } from "node:fs/promises";

import {
  evaluateGuardrailArtifacts,
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

  const actual = evaluateGuardrailArtifacts({
    stateContext,
    riskA,
    riskB,
    reasoning,
  }, {
    thresholdSetName: thresholdSetName as GuardrailThresholdSetName,
  });

  process.stdout.write(`${JSON.stringify(actual.guardrail_result, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
