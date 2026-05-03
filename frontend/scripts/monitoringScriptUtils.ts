import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import type { StoredArtifact } from "../src/lib/logger/logStore.ts";
import { readJsonArtifacts } from "../src/lib/logger/logStore.ts";
import type {
  AnomalyFlags,
  GuardrailDecision,
  GuardrailMode,
  OperationalOutputMode,
  RequestLog,
  SimulationRequest,
} from "../src/lib/types.ts";

export type SeedCaseCategory =
  | "normal"
  | "low_confidence"
  | "conflict"
  | "edge";

export interface SeedCaseInput extends SimulationRequest {
  user_query: string;
}

export interface SeedCase {
  id: string;
  category: SeedCaseCategory;
  input: SeedCaseInput;
}

export const DEFAULT_BASE_URL =
  process.env.SIMULATE_BASE_URL?.trim() || "http://127.0.0.1:3000";
export const DEFAULT_SEED_INPUT_PATH = path.join(
  process.cwd(),
  "scripts",
  "seed-inputs.json",
);

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function toSimulationRequest(input: SeedCaseInput): SimulationRequest {
  const { user_query: _userQuery, ...request } = input;
  return request;
}

export function mapDecisionToOutputMode(
  decision: GuardrailDecision,
): OperationalOutputMode {
  if (decision === "block") {
    return "blocked";
  }

  if (decision === "review") {
    return "safe";
  }

  return "normal";
}

export function mapDecisionToRawMode(decision: GuardrailDecision): GuardrailMode {
  if (decision === "block") {
    return "blocked";
  }

  if (decision === "review") {
    return "cautious";
  }

  return "normal";
}

export function buildFlags(
  active: keyof AnomalyFlags,
): AnomalyFlags {
  return {
    underblocking: active === "underblocking",
    overblocking: active === "overblocking",
    low_confidence: active === "low_confidence",
    conflict: active === "conflict",
  };
}

export async function readSeedCases(
  filePath = DEFAULT_SEED_INPUT_PATH,
): Promise<SeedCase[]> {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`No seed cases found in ${filePath}.`);
  }

  return parsed as SeedCase[];
}

async function readExampleRequestLogs(): Promise<StoredArtifact<RequestLog>[]> {
  const examplesDir = path.join(
    process.cwd(),
    "outputs",
    "online_logs",
    "examples",
  );
  const entries = await readdir(examplesDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && /^request-.*\.json$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  return Promise.all(
    files.map(async (fileName) => {
      const filePath = path.join(examplesDir, fileName);
      const raw = await readFile(filePath, "utf8");

      return {
        path: filePath,
        value: JSON.parse(raw) as RequestLog,
      };
    }),
  );
}

export async function loadRequestLogArtifacts(options?: {
  allowExampleFallback?: boolean;
}): Promise<StoredArtifact<RequestLog>[]> {
  const artifacts = await readJsonArtifacts<RequestLog>("request_logs");

  if (artifacts.length > 0) {
    return artifacts;
  }

  if (options?.allowExampleFallback === false) {
    return [];
  }

  return readExampleRequestLogs();
}

export function cycleArtifact<T>(
  artifacts: readonly T[],
  index: number,
): T {
  return artifacts[index % artifacts.length];
}

export async function fetchJson<T>(
  pathname: string,
  baseUrl = DEFAULT_BASE_URL,
): Promise<T> {
  const response = await fetch(new URL(pathname, baseUrl), {
    headers: {
      Accept: "application/json",
    },
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `Request failed: ${response.status} ${response.statusText} ${JSON.stringify(payload)}`,
    );
  }

  return payload as T;
}
