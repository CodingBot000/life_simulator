import {
  DEFAULT_BASE_URL,
  DEFAULT_SEED_INPUT_PATH,
  randomInt,
  readSeedCases,
  sleep,
  toSimulationRequest,
} from "./monitoringScriptUtils.ts";

function readOptionalInt(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

async function main() {
  const baseUrl = process.env.SIMULATE_BASE_URL?.trim() || DEFAULT_BASE_URL;
  const seedPath = process.env.SIMULATE_SEED_PATH?.trim() || DEFAULT_SEED_INPUT_PATH;
  const startIndex = Math.max(
    0,
    readOptionalInt(process.env.SIMULATE_START_INDEX) ?? 0,
  );
  const limit = readOptionalInt(process.env.SIMULATE_LIMIT);
  const allCases = await readSeedCases(seedPath);
  const cases = allCases.slice(
    startIndex,
    typeof limit === "number" && limit > 0
      ? startIndex + limit
      : undefined,
  );
  let successCount = 0;
  let failureCount = 0;

  console.log(
    `[run-simulate] loaded ${cases.length}/${allCases.length} cases from ${seedPath} start_index=${startIndex} -> ${new URL("/api/simulate", baseUrl).toString()}`,
  );

  for (const [index, seedCase] of cases.entries()) {
    if (index > 0) {
      await sleep(randomInt(200, 500));
    }

    try {
      const response = await fetch(new URL("/api/simulate", baseUrl), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(toSimulationRequest(seedCase.input)),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status} ${response.statusText} ${JSON.stringify(payload)}`,
        );
      }

      successCount += 1;
      console.log(
        `[run-simulate] ${index + 1}/${cases.length} id=${seedCase.id} category=${seedCase.category} request_id=${payload?.request_id ?? "unknown"}`,
      );
    } catch (error) {
      failureCount += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[run-simulate] ${index + 1}/${cases.length} id=${seedCase.id} failed: ${message}`,
      );
    }
  }

  console.log(
    `[run-simulate] completed success=${successCount} failure=${failureCount}`,
  );

  if (failureCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[run-simulate] fatal: ${message}`);
  process.exitCode = 1;
});
