import { mkdir, readdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export interface QueueJob<T> {
  id: string;
  namespace: string;
  enqueuedAt: string;
  payload: T;
  path: string;
}

const QUEUE_ROOT = path.join(process.cwd(), "outputs", "queues");

function queueDir(namespace: string, status: "pending" | "processed" | "failed") {
  return path.join(QUEUE_ROOT, namespace, status);
}

async function ensureQueueDirs(namespace: string): Promise<void> {
  await Promise.all([
    mkdir(queueDir(namespace, "pending"), { recursive: true }),
    mkdir(queueDir(namespace, "processed"), { recursive: true }),
    mkdir(queueDir(namespace, "failed"), { recursive: true }),
  ]);
}

function buildQueuePath(namespace: string, status: "pending" | "processed" | "failed", id: string) {
  return path.join(queueDir(namespace, status), `${id}.json`);
}

export async function enqueueQueueJob<T>(
  namespace: string,
  payload: T,
): Promise<string> {
  await ensureQueueDirs(namespace);
  const enqueuedAt = new Date().toISOString();
  const id = `${enqueuedAt.replace(/[:.]/g, "-")}__${randomUUID()}`;
  const filePath = buildQueuePath(namespace, "pending", id);

  await writeFile(
    filePath,
    `${JSON.stringify({ id, namespace, enqueuedAt, payload }, null, 2)}\n`,
    "utf8",
  );

  return filePath;
}

export async function listQueueJobs<T>(namespace: string): Promise<QueueJob<T>[]> {
  await ensureQueueDirs(namespace);
  const pendingDir = queueDir(namespace, "pending");
  const entries = await readdir(pendingDir, { withFileTypes: true });
  const jobs: QueueJob<T>[] = [];

  for (const entry of entries.filter((value) => value.isFile() && value.name.endsWith(".json")).sort((a, b) => a.name.localeCompare(b.name))) {
    const filePath = path.join(pendingDir, entry.name);
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as {
      id: string;
      namespace: string;
      enqueuedAt: string;
      payload: T;
    };

    jobs.push({
      ...parsed,
      path: filePath,
    });
  }

  return jobs;
}

export async function markQueueJobProcessed(
  namespace: string,
  currentPath: string,
): Promise<void> {
  await ensureQueueDirs(namespace);
  await rename(
    currentPath,
    buildQueuePath(namespace, "processed", path.basename(currentPath, ".json")),
  );
}

export async function markQueueJobFailed(
  namespace: string,
  currentPath: string,
): Promise<void> {
  await ensureQueueDirs(namespace);
  await rename(
    currentPath,
    buildQueuePath(namespace, "failed", path.basename(currentPath, ".json")),
  );
}

export async function clearProcessedQueueJob(filePath: string): Promise<void> {
  await unlink(filePath);
}
