import { runReEvaluation } from "../src/lib/monitoring/reEvaluator.ts";

async function main() {
  const results = await runReEvaluation();

  console.log(`[run-reeval] completed created=${results.length}`);

  for (const result of results) {
    console.log(
      `[run-reeval] request_id=${result.request_id} source=${result.source.join(",") || "none"}`,
    );
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[run-reeval] fatal: ${message}`);
  process.exitCode = 1;
});
