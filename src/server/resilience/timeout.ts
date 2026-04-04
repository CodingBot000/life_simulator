export class DeadlineExceededError extends Error {
  code = "deadline_exceeded";

  constructor(message = "The overall request deadline was exceeded.") {
    super(message);
    this.name = "DeadlineExceededError";
  }
}

export class StageTimeoutError extends Error {
  code = "stage_timeout";

  constructor(message = "The current stage exceeded its timeout.") {
    super(message);
    this.name = "StageTimeoutError";
  }
}

function toTimestamp(value: Date | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export function getRemainingTimeMs(deadlineAt?: Date | string): number {
  if (!deadlineAt) {
    return Number.POSITIVE_INFINITY;
  }

  const deadline = toTimestamp(deadlineAt);

  if (Number.isNaN(deadline)) {
    return Number.POSITIVE_INFINITY;
  }

  return deadline - Date.now();
}

export function assertDeadlineRemaining(deadlineAt?: Date | string): void {
  if (getRemainingTimeMs(deadlineAt) <= 0) {
    throw new DeadlineExceededError();
  }
}

export function resolveTimeoutMs(params: {
  deadlineAt?: Date | string;
  stageTimeoutMs?: number;
  defaultTimeoutMs: number;
}): number {
  const stageTimeout = params.stageTimeoutMs ?? params.defaultTimeoutMs;
  const remaining = getRemainingTimeMs(params.deadlineAt);

  if (remaining <= 0) {
    throw new DeadlineExceededError();
  }

  if (!Number.isFinite(remaining)) {
    return stageTimeout;
  }

  return Math.max(1, Math.min(stageTimeout, remaining));
}

export async function withTimeout<T>(
  work: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await work(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new StageTimeoutError(`${label} timed out after ${timeoutMs}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
