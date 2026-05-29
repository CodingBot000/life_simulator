import { apiUrl, readJsonResponse } from "@/lib/api/client";
import { getSimulatorSessionId } from "@/lib/api/session";
import type {
  SessionMemoryDecision,
  SessionMemoryDecisionInput,
} from "@/lib/session-memory";

type SessionMemoryListResponse = {
  decisions: SessionMemoryDecision[];
};

export async function listRemoteSessionMemoryDecisions() {
  const response = await fetch(apiUrl("/api/session-memory/decisions"), {
    headers: {
      "x-session-id": getSimulatorSessionId(),
    },
  });

  return readJsonResponse<SessionMemoryListResponse>(response);
}

export async function saveRemoteSessionMemoryDecision(
  input: SessionMemoryDecisionInput & { id?: string },
) {
  const response = await fetch(apiUrl("/api/session-memory/decisions"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-session-id": getSimulatorSessionId(),
    },
    body: JSON.stringify(input),
  });

  return readJsonResponse<SessionMemoryDecision>(response);
}

export async function deleteRemoteSessionMemoryDecision(id: string) {
  const response = await fetch(
    apiUrl(`/api/session-memory/decisions/${encodeURIComponent(id)}`),
    {
      method: "DELETE",
      headers: {
        "x-session-id": getSimulatorSessionId(),
      },
    },
  );

  if (!response.ok) {
    await readJsonResponse<unknown>(response);
  }
}

export async function clearRemoteSessionMemoryDecisions() {
  const response = await fetch(apiUrl("/api/session-memory/decisions"), {
    method: "DELETE",
    headers: {
      "x-session-id": getSimulatorSessionId(),
    },
  });

  if (!response.ok) {
    await readJsonResponse<unknown>(response);
  }
}
