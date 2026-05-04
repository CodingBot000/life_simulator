import { apiUrl, readJsonResponse } from "@/lib/api/client";
import { getSimulatorSessionId } from "@/lib/api/session";
import { readSimulationProgressStream } from "@/lib/api/simulation-stream";
import type { PriorityLocale } from "@/lib/priorities";
import type {
  SimulationProgressEvent,
  SimulationRequest,
  SimulationResponse,
} from "@/lib/types";

export async function runSimulation(
  request: SimulationRequest,
  params: {
    locale: PriorityLocale;
    signal?: AbortSignal;
    onProgressEvent?: (event: SimulationProgressEvent) => void;
  },
) {
  const response = await fetch(apiUrl("/api/simulate"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-simulate-stream": "ndjson",
      "x-session-id": getSimulatorSessionId(),
      "x-ui-locale": params.locale,
    },
    body: JSON.stringify(request),
    signal: params.signal,
  });

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/x-ndjson")) {
    return readSimulationProgressStream(
      response,
      params.onProgressEvent ?? (() => undefined),
    );
  }

  return readJsonResponse<SimulationResponse>(response);
}
