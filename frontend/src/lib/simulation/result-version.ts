import type { SimulationRequest, SimulationResponse } from "@/lib/types";

export type SimulationResultVersion = {
  id: string;
  label: string;
  request: SimulationRequest;
  response: SimulationResponse;
  createdAt: string;
  parentId?: string;
  reevaluationReason?: "option_followup";
};

export function createSimulationResultVersion(
  request: SimulationRequest,
  response: SimulationResponse,
  iteration: number,
  parentId?: string,
): SimulationResultVersion {
  return {
    id: response.request_id,
    label: `v${iteration}`,
    request,
    response,
    createdAt: new Date().toISOString(),
    parentId,
    reevaluationReason: request.reevaluation?.reason,
  };
}

export function nextSimulationIteration(
  versions: readonly SimulationResultVersion[],
): number {
  return versions.length + 1;
}
