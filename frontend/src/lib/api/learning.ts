import { apiUrl, readJsonResponse } from "@/lib/api/client";

export async function buildDatasetCandidates(requestId: string) {
  const response = await fetch(apiUrl("/api/learning/dataset-candidates/build"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId }),
  });

  return readJsonResponse<{
    requestId: string;
    persisted: number;
    candidateIds: string[];
  }>(response);
}
