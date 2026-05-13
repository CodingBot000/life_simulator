import type { MemoryDecisionRecord } from "@/lib/types";

export const SESSION_MEMORY_STORAGE_KEY = "life-simulator.session-memory.v1";

const SESSION_MEMORY_VERSION = 1;
const MAX_STORED_DECISIONS = 10;
const DEFAULT_RECENT_DECISION_LIMIT = 5;
const MEMORY_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type SessionMemoryStore = {
  version: 1;
  updatedAt: string;
  decisions: SessionMemoryDecision[];
};

export type SessionMemoryDecision = MemoryDecisionRecord & {
  id: string;
  createdAt: string;
  sourceRequestId?: string;
  sourceCaseId?: string;
};

export type SessionMemoryDecisionInput = MemoryDecisionRecord & {
  sourceRequestId?: string;
  sourceCaseId?: string;
};

export function listSessionMemoryDecisions(): SessionMemoryDecision[] {
  const store = readStore();
  const normalized = normalizeDecisions(store.decisions);

  if (normalized.length !== store.decisions.length) {
    writeStore({
      version: SESSION_MEMORY_VERSION,
      updatedAt: new Date().toISOString(),
      decisions: normalized,
    });
  }

  return normalized;
}

export function listRecentDecisionRecords(
  limit = DEFAULT_RECENT_DECISION_LIMIT,
): MemoryDecisionRecord[] {
  return toRecentDecisionRecords(listSessionMemoryDecisions(), limit);
}

export function toRecentDecisionRecords(
  decisions: readonly SessionMemoryDecision[],
  limit = DEFAULT_RECENT_DECISION_LIMIT,
): MemoryDecisionRecord[] {
  return decisions.slice(0, limit).map((decision) => ({
    topic: decision.topic,
    selected_option: decision.selected_option,
    outcome_note: decision.outcome_note,
  }));
}

export function saveSessionMemoryDecision(
  input: SessionMemoryDecisionInput,
): SessionMemoryDecision {
  const nextDecision = createDecision(input);
  const decisions = listSessionMemoryDecisions();
  const duplicateKey = decisionKey(nextDecision);
  const deduped = decisions.filter((decision) => decisionKey(decision) !== duplicateKey);
  const nextDecisions = [nextDecision, ...deduped].slice(0, MAX_STORED_DECISIONS);

  writeStore({
    version: SESSION_MEMORY_VERSION,
    updatedAt: new Date().toISOString(),
    decisions: nextDecisions,
  });

  return nextDecision;
}

export function deleteSessionMemoryDecision(id: string): void {
  const trimmedId = id.trim();
  if (!trimmedId) {
    return;
  }

  const nextDecisions = listSessionMemoryDecisions().filter(
    (decision) => decision.id !== trimmedId,
  );

  writeStore({
    version: SESSION_MEMORY_VERSION,
    updatedAt: new Date().toISOString(),
    decisions: nextDecisions,
  });
}

export function clearSessionMemory(): void {
  const storage = browserStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(SESSION_MEMORY_STORAGE_KEY);
  } catch {
    // Ignore storage failures so the app remains usable in restricted browsers.
  }
}

function readStore(): SessionMemoryStore {
  const storage = browserStorage();
  if (!storage) {
    return emptyStore();
  }

  try {
    const raw = storage.getItem(SESSION_MEMORY_STORAGE_KEY);
    if (!raw) {
      return emptyStore();
    }

    const parsed = JSON.parse(raw) as unknown;
    return coerceStore(parsed);
  } catch {
    return emptyStore();
  }
}

function writeStore(store: SessionMemoryStore): void {
  const storage = browserStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(SESSION_MEMORY_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore quota or privacy-mode errors; memory is a best-effort enhancement.
  }
}

function coerceStore(value: unknown): SessionMemoryStore {
  if (!value || typeof value !== "object") {
    return emptyStore();
  }

  const record = value as Record<string, unknown>;
  const decisions = Array.isArray(record.decisions)
    ? normalizeDecisions(record.decisions)
    : [];

  return {
    version: SESSION_MEMORY_VERSION,
    updatedAt: isNonBlankText(record.updatedAt)
      ? record.updatedAt.trim()
      : new Date().toISOString(),
    decisions,
  };
}

function normalizeDecisions(values: readonly unknown[]): SessionMemoryDecision[] {
  return values
    .map(coerceDecision)
    .filter((decision): decision is SessionMemoryDecision => Boolean(decision))
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, MAX_STORED_DECISIONS);
}

function coerceDecision(value: unknown): SessionMemoryDecision | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (
    !isNonBlankText(record.topic) ||
    !isNonBlankText(record.selected_option) ||
    !isNonBlankText(record.outcome_note)
  ) {
    return null;
  }

  const createdAt = isNonBlankText(record.createdAt)
    ? record.createdAt.trim()
    : new Date().toISOString();
  if (isExpired(createdAt)) {
    return null;
  }

  return {
    id: isNonBlankText(record.id) ? record.id.trim() : createId(),
    createdAt,
    topic: record.topic.trim(),
    selected_option: record.selected_option.trim(),
    outcome_note: record.outcome_note.trim(),
    ...(isNonBlankText(record.sourceRequestId)
      ? { sourceRequestId: record.sourceRequestId.trim() }
      : {}),
    ...(isNonBlankText(record.sourceCaseId)
      ? { sourceCaseId: record.sourceCaseId.trim() }
      : {}),
  };
}

function createDecision(input: SessionMemoryDecisionInput): SessionMemoryDecision {
  if (
    !isNonBlankText(input.topic) ||
    !isNonBlankText(input.selected_option) ||
    !isNonBlankText(input.outcome_note)
  ) {
    throw new Error("topic, selected_option, and outcome_note are required.");
  }

  return {
    id: createId(),
    createdAt: new Date().toISOString(),
    topic: input.topic.trim(),
    selected_option: input.selected_option.trim(),
    outcome_note: input.outcome_note.trim(),
    ...(isNonBlankText(input.sourceRequestId)
      ? { sourceRequestId: input.sourceRequestId.trim() }
      : {}),
    ...(isNonBlankText(input.sourceCaseId)
      ? { sourceCaseId: input.sourceCaseId.trim() }
      : {}),
  };
}

function emptyStore(): SessionMemoryStore {
  return {
    version: SESSION_MEMORY_VERSION,
    updatedAt: new Date().toISOString(),
    decisions: [],
  };
}

function isExpired(createdAt: string): boolean {
  const createdAtMillis = Date.parse(createdAt);
  if (!Number.isFinite(createdAtMillis)) {
    return true;
  }

  return Date.now() - createdAtMillis > MEMORY_TTL_MS;
}

function decisionKey(decision: MemoryDecisionRecord): string {
  return [
    decision.topic.trim(),
    decision.selected_option.trim(),
    decision.outcome_note.trim(),
  ].join("\n");
}

function isNonBlankText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `memory-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function browserStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
