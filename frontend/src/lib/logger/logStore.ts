import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface StoredArtifact<T> {
  path: string;
  value: T;
}

export const ONLINE_LOG_ROOT = path.join(process.cwd(), "outputs", "online_logs");

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "_");
}

export function sanitizeTimestamp(value: string): string {
  return value.replace(/[:.]/g, "-");
}

export function buildArtifactFileName(
  prefix: string,
  requestId: string,
  timestamp: string,
): string {
  return [
    sanitizeSegment(prefix),
    sanitizeTimestamp(timestamp),
    sanitizeSegment(requestId),
  ].join("__") + ".json";
}

export function resolveOnlineLogPath(namespace: string, filename: string): string {
  return path.join(ONLINE_LOG_ROOT, namespace, filename);
}

async function ensureNamespace(namespace: string): Promise<string> {
  const dir = path.join(ONLINE_LOG_ROOT, namespace);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function writeJsonArtifact(
  namespace: string,
  filename: string,
  payload: unknown,
): Promise<string> {
  const dir = await ensureNamespace(namespace);
  const filePath = path.join(dir, filename);
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return filePath;
}

export async function readJsonArtifacts<T>(
  namespace: string,
): Promise<StoredArtifact<T>[]> {
  const dir = await ensureNamespace(namespace);
  const entries = await readdir(dir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(dir, entry.name))
    .sort();
  const artifacts: StoredArtifact<T>[] = [];

  for (const filePath of files) {
    const raw = await readFile(filePath, "utf8");
    artifacts.push({
      path: filePath,
      value: JSON.parse(raw) as T,
    });
  }

  return artifacts;
}

export async function artifactExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
