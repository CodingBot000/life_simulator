export const SIMULATOR_SESSION_ID_KEY = "life-simulator-session-id";

function fallbackSessionId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getSimulatorSessionId() {
  if (typeof window === "undefined") {
    return fallbackSessionId();
  }

  try {
    const existing = window.localStorage.getItem(SIMULATOR_SESSION_ID_KEY);
    if (existing) {
      return existing;
    }

    const next = fallbackSessionId();
    window.localStorage.setItem(SIMULATOR_SESSION_ID_KEY, next);
    return next;
  } catch {
    return fallbackSessionId();
  }
}
