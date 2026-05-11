import { apiUrl, readJsonResponse } from "@/lib/api/client";
import { getSimulatorSessionId } from "@/lib/api/session";
import type {
  RecommendationRequest,
  RecommendationResponse,
} from "@/lib/recommendations/types";

export async function fetchRecommendations(
  request: RecommendationRequest,
  options?: { signal?: AbortSignal },
) {
  const response = await fetch(apiUrl("/api/recommendations"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-session-id": getSimulatorSessionId(),
      "x-ui-locale": request.locale,
    },
    body: JSON.stringify(request),
    signal: options?.signal,
  });

  return readJsonResponse<RecommendationResponse>(response);
}
