import { apiUrl, readJsonResponse } from "@/lib/api/client";
import type { PriorityCatalog } from "@/lib/priorities";

export async function fetchPriorityCatalog(signal?: AbortSignal) {
  const response = await fetch(apiUrl("/api/priorities"), { signal });
  const data = await readJsonResponse<PriorityCatalog>(response);

  if (!Array.isArray(data.groups) || !Array.isArray(data.definitions)) {
    throw new Error("우선순위 목록을 불러오지 못했습니다.");
  }

  return data;
}
