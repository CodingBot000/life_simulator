import { DeadlineExceededError, StageTimeoutError } from "./timeout.ts";

export interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterRatio: number;
}

export interface RetryExecutionResult<T> {
  value: T;
  retryCount: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 2,
  baseDelayMs: 250,
  maxDelayMs: 1500,
  jitterRatio: 0.2,
};

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function computeDelayMs(policy: RetryPolicy, attempt: number): number {
  const withoutJitter = Math.min(
    policy.maxDelayMs,
    policy.baseDelayMs * 2 ** attempt,
  );
  const jitter =
    withoutJitter * policy.jitterRatio * (Math.random() * 2 - 1);

  return Math.max(0, Math.round(withoutJitter + jitter));
}

function readStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const candidate = error as { status?: unknown; statusCode?: unknown };

  if (typeof candidate.status === "number") {
    return candidate.status;
  }

  if (typeof candidate.statusCode === "number") {
    return candidate.statusCode;
  }

  return undefined;
}

function readCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const candidate = error as { code?: unknown };
  return typeof candidate.code === "string" ? candidate.code : undefined;
}

export function shouldRetryError(error: unknown): boolean {
  if (error instanceof DeadlineExceededError) {
    return false;
  }

  if (error instanceof StageTimeoutError) {
    return true;
  }

  const status = readStatus(error);

  if (status === 429 || (typeof status === "number" && status >= 500)) {
    return true;
  }

  const code = readCode(error);

  return (
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    code === "ECONNABORTED" ||
    code === "UND_ERR_CONNECT_TIMEOUT" ||
    code === "stage_timeout"
  );
}

export function normalizeRetryPolicy(
  override?: Partial<RetryPolicy>,
): RetryPolicy {
  return {
    ...DEFAULT_RETRY_POLICY,
    ...override,
    maxRetries: Math.min(2, override?.maxRetries ?? DEFAULT_RETRY_POLICY.maxRetries),
  };
}

export async function retryWithPolicy<T>(
  operation: (attempt: number) => Promise<T>,
  policyOverride?: Partial<RetryPolicy>,
): Promise<RetryExecutionResult<T>> {
  const policy = normalizeRetryPolicy(policyOverride);
  let retryCount = 0;

  for (let attempt = 0; attempt <= policy.maxRetries; attempt += 1) {
    try {
      const value = await operation(attempt);

      return {
        value,
        retryCount,
      };
    } catch (error) {
      const canRetry = shouldRetryError(error) && attempt < policy.maxRetries;

      if (!canRetry) {
        throw error;
      }

      retryCount += 1;
      await sleep(computeDelayMs(policy, attempt));
    }
  }

  throw new Error("Retry loop exited unexpectedly.");
}
