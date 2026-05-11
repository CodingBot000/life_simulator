import { apiUrl, readJsonResponse } from "@/lib/api/client";
import { getSimulatorSessionId } from "@/lib/api/session";

export interface OutcomeFollowupPayload {
  requestId: string;
  actualChoice: "A" | "B" | "undecided" | "other";
  satisfactionScore?: number;
  regretScore?: number;
  outcomeNote?: string;
  unexpectedFactors?: string[];
  horizonDays?: number;
  metadata?: Record<string, unknown>;
}

export interface OutcomeFollowupResponse {
  followupId: string;
  requestId: string;
  actualChoice: string;
  satisfactionScore?: number;
  regretScore?: number;
  createdAt: string;
  updatedAt: string;
}

export async function submitOutcomeFollowup(payload: OutcomeFollowupPayload) {
  const response = await fetch(apiUrl("/api/outcome-followups"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-session-id": getSimulatorSessionId(),
    },
    body: JSON.stringify(payload),
  });

  return readJsonResponse<OutcomeFollowupResponse>(response);
}

export async function updateOutcomeFollowup(
  followupId: string,
  payload: OutcomeFollowupPayload,
) {
  const response = await fetch(apiUrl(`/api/outcome-followups/${followupId}`), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-session-id": getSimulatorSessionId(),
    },
    body: JSON.stringify(payload),
  });

  return readJsonResponse<OutcomeFollowupResponse>(response);
}
