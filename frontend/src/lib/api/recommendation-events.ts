import { apiUrl, readJsonResponse } from "@/lib/api/client";
import { getSimulatorSessionId } from "@/lib/api/session";

export type RecommendationEventType = "impression" | "click" | "dismiss";

export interface RecommendationEventRequest {
  request_id: string;
  provider: string;
  item_id: string;
  event_type: RecommendationEventType;
}

export interface RecommendationEventResponse {
  accepted: boolean;
  status: string;
}

export function recordRecommendationEvent(
  request: RecommendationEventRequest,
  options?: { signal?: AbortSignal },
) {
  return fetch(apiUrl("/api/recommendation-events"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-session-id": getSimulatorSessionId(),
    },
    body: JSON.stringify(request),
    signal: options?.signal,
  }).then((response) => readJsonResponse<RecommendationEventResponse>(response));
}
