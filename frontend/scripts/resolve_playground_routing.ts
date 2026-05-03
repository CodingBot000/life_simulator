import { basename } from "node:path";
import { readFile } from "node:fs/promises";

import type {
  SimulationRequest,
  StateContext,
} from "../src/lib/types.ts";
import { buildRoutingDecision } from "../src/server/routing/request-router.ts";

function deriveCaseId(inputPath: string): string {
  const fileName = basename(inputPath);
  return fileName.endsWith(".json") ? fileName.slice(0, -5) : fileName;
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function main() {
  const [inputPath, stateContextPath, caseIdArg] = process.argv.slice(2);

  if (!inputPath) {
    throw new Error(
      "Usage: resolve_playground_routing.ts <inputPath> [stateContextPath|-] [caseId]",
    );
  }

  const input = await readJsonFile<SimulationRequest>(inputPath);
  const stateContext =
    stateContextPath && stateContextPath !== "-"
      ? await readJsonFile<StateContext>(stateContextPath)
      : undefined;
  const routingDecision = buildRoutingDecision(input, stateContext);
  const caseId = caseIdArg?.trim() || deriveCaseId(inputPath);

  process.stdout.write(
    `${JSON.stringify({
      case_id: caseId,
      routing: {
        complexity: routingDecision.riskProfile.complexity,
        risk_level: routingDecision.riskProfile.riskBand,
        ambiguity: routingDecision.riskProfile.ambiguity,
        execution_mode: routingDecision.executionMode,
        selected_path: routingDecision.selectedPath,
        selected_model: routingDecision.selectedModel,
        fallback_model: routingDecision.fallbackModel ?? null,
        stage_model_plan: routingDecision.stageModelPlan,
        stage_fallback_plan: routingDecision.stageFallbackPlan,
        estimated_cost_usd: routingDecision.estimatedCostUsd,
        reasons: routingDecision.reasons,
        routing_reason: routingDecision.reasons.join(" "),
        risk_profile: {
          model_tier: routingDecision.riskProfile.modelTier,
          risk_band: routingDecision.riskProfile.riskBand,
          complexity: routingDecision.riskProfile.complexity,
          ambiguity: routingDecision.riskProfile.ambiguity,
          state_unknown_count: routingDecision.riskProfile.stateUnknownCount,
          estimated_tokens: routingDecision.riskProfile.estimatedTokens,
        },
      },
    }, null, 2)}\n`,
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
