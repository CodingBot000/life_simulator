import { processLogQueue } from "../../src/server/logging/service.ts";

async function main() {
  const result = await processLogQueue();
  console.info("[log-worker] processed", result);
}

main().catch((error) => {
  console.error("[log-worker] failed", error);
  process.exitCode = 1;
});
