import { readFile } from "node:fs/promises";
import path from "node:path";

import type { SimulationRequest } from "../src/lib/types.ts";

type SeedCaseCategory =
  | "normal"
  | "low_confidence"
  | "conflict"
  | "edge";

type SeedCaseInput = SimulationRequest & {
  user_query: string;
};

type SeedCase = {
  id: string;
  category: SeedCaseCategory;
  input: SeedCaseInput;
};

const DEFAULT_BASE_URL =
  process.env.SIMULATE_BASE_URL?.trim() || "http://127.0.0.1:8080";
const DEFAULT_SEED_INPUT_PATH = path.join(
  process.cwd(),
  "scripts",
  "seed-inputs.json",
);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function readSeedCases(filePath = DEFAULT_SEED_INPUT_PATH): Promise<SeedCase[]> {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`No seed cases found in ${filePath}.`);
  }

  return parsed as SeedCase[];
}

function toSimulationRequest(input: SeedCaseInput): SimulationRequest {
  const { user_query: _userQuery, ...request } = input;
  return request;
}

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
      const payload = (await response.json().catch(() => null)) as {
        request_id?: string;
      } | null;

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
