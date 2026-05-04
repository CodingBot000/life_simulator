import { apiUrl, readJsonResponse } from "@/lib/api/client";
import type { CasePreset } from "@/lib/types";

type CasesResponse = {
  cases?: CasePreset[];
};

export async function fetchCasePresets(signal?: AbortSignal) {
  const response = await fetch(apiUrl("/api/cases"), { signal });
  const data = await readJsonResponse<CasesResponse>(response);

  if (!data.cases) {
    throw new Error("케이스 목록을 불러오지 못했습니다.");
  }

  return data.cases;
}
