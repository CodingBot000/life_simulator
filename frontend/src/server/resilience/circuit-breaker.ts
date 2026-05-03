export type CircuitBreakerState = "closed" | "open" | "half-open";

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
}

export interface CircuitBreakerSnapshot {
  key: string;
  state: CircuitBreakerState;
  failureCount: number;
  openedAt?: string;
  nextAttemptAt?: string;
}

export class CircuitBreakerOpenError extends Error {
  code = "circuit_open";

  constructor(message = "Circuit breaker is open.") {
    super(message);
    this.name = "CircuitBreakerOpenError";
  }
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  resetTimeoutMs: 30_000,
};

class CircuitBreaker {
  private state: CircuitBreakerState = "closed";
  private failureCount = 0;
  private openedAt?: number;
  private nextAttemptAt?: number;
  private halfOpenBusy = false;
  private readonly key: string;
  private readonly config: CircuitBreakerConfig;

  constructor(key: string, config: CircuitBreakerConfig) {
    this.key = key;
    this.config = config;
  }

  beforeRequest(): void {
    const now = Date.now();

    if (this.state === "open") {
      if ((this.nextAttemptAt ?? 0) > now) {
        throw new CircuitBreakerOpenError(
          `Circuit breaker for ${this.key} is open until ${new Date(
            this.nextAttemptAt ?? now,
          ).toISOString()}.`,
        );
      }

      this.state = "half-open";
      this.halfOpenBusy = false;
    }

    if (this.state === "half-open") {
      if (this.halfOpenBusy) {
        throw new CircuitBreakerOpenError(
          `Circuit breaker for ${this.key} is probing in half-open state.`,
        );
      }

      this.halfOpenBusy = true;
    }
  }

  recordSuccess(): void {
    this.state = "closed";
    this.failureCount = 0;
    this.openedAt = undefined;
    this.nextAttemptAt = undefined;
    this.halfOpenBusy = false;
  }

  recordFailure(): void {
    this.failureCount += 1;
    this.halfOpenBusy = false;

    if (
      this.state === "half-open" ||
      this.failureCount >= this.config.failureThreshold
    ) {
      this.state = "open";
      this.openedAt = Date.now();
      this.nextAttemptAt = this.openedAt + this.config.resetTimeoutMs;
    }
  }

  snapshot(): CircuitBreakerSnapshot {
    return {
      key: this.key,
      state: this.state,
      failureCount: this.failureCount,
      openedAt: this.openedAt ? new Date(this.openedAt).toISOString() : undefined,
      nextAttemptAt: this.nextAttemptAt
        ? new Date(this.nextAttemptAt).toISOString()
        : undefined,
    };
  }
}

const breakerRegistry = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(
  key: string,
  config?: Partial<CircuitBreakerConfig>,
): CircuitBreaker {
  const existing = breakerRegistry.get(key);

  if (existing) {
    return existing;
  }

  const breaker = new CircuitBreaker(key, {
    ...DEFAULT_CONFIG,
    ...config,
  });

  breakerRegistry.set(key, breaker);

  return breaker;
}

export function getCircuitBreakerSnapshot(
  key: string,
): CircuitBreakerSnapshot | null {
  return breakerRegistry.get(key)?.snapshot() ?? null;
}
