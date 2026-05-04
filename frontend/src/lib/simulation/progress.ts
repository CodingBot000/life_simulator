import type {
  ExecutionMode,
  SimulationProgressEvent,
  SimulationStageExecutionKind,
  SimulationStageName,
} from "@/lib/types";
import { SIMULATION_STAGE_ORDER } from "@/lib/types";

export type StageProgressStatus =
  | "pending"
  | "active"
  | "completed"
  | "skipped"
  | "failed";

export type StageProgressEntry = {
  status: StageProgressStatus;
  executionKind: SimulationStageExecutionKind | null;
  model: string | null;
  fallbackUsed: boolean;
  fallbackReason: string | null;
};

export type SimulationProgressState = {
  requestId: string | null;
  traceId: string | null;
  executionMode: ExecutionMode | null;
  selectedPath: string[];
  stages: Record<SimulationStageName, StageProgressEntry>;
};

export const EXECUTION_MODE_LABELS: Record<ExecutionMode, string> = {
  light: "Light",
  standard: "Standard",
  careful: "Careful",
  full: "Full",
};

export const STAGE_METADATA: Record<
  SimulationStageName,
  {
    label: string;
    summary: string;
  }
> = {
  state_loader: {
    label: "State Loader",
    summary: "입력 상태를 구조화합니다.",
  },
  planner: {
    label: "Planner",
    summary: "판단 프레임과 비교 요인을 정리합니다.",
  },
  scenario_a: {
    label: "Scenario A",
    summary: "선택지 A의 미래 시나리오를 펼칩니다.",
  },
  scenario_b: {
    label: "Scenario B",
    summary: "선택지 B의 미래 시나리오를 펼칩니다.",
  },
  risk_a: {
    label: "Risk A",
    summary: "선택지 A의 리스크를 평가합니다.",
  },
  risk_b: {
    label: "Risk B",
    summary: "선택지 B의 리스크를 평가합니다.",
  },
  ab_reasoning: {
    label: "A/B Reasoning",
    summary: "두 판단 후보를 비교합니다.",
  },
  guardrail: {
    label: "Guardrail",
    summary: "안전장치와 경고 신호를 점검합니다.",
  },
  advisor: {
    label: "Advisor",
    summary: "최종 판단을 정리합니다.",
  },
  reflection: {
    label: "Reflection",
    summary: "결과를 검토하고 보정합니다.",
  },
};

export const STAGE_STATUS_LABELS: Record<StageProgressStatus, string> = {
  pending: "대기",
  active: "진행 중",
  completed: "완료",
  skipped: "건너뜀",
  failed: "실패",
};

export const EXECUTION_KIND_LABELS: Record<SimulationStageExecutionKind, string> = {
  llm: "LLM",
  deterministic: "Rule",
  derived: "Derived",
};

export function createInitialProgressState(): SimulationProgressState {
  return {
    requestId: null,
    traceId: null,
    executionMode: null,
    selectedPath: [],
    stages: Object.fromEntries(
      SIMULATION_STAGE_ORDER.map((stageName) => [
        stageName,
        {
          status: "pending",
          executionKind: null,
          model: null,
          fallbackUsed: false,
          fallbackReason: null,
        },
      ]),
    ) as Record<SimulationStageName, StageProgressEntry>,
  };
}

export function applyProgressEvent(
  current: SimulationProgressState,
  event: SimulationProgressEvent,
): SimulationProgressState {
  if (event.type === "request_started") {
    return {
      ...createInitialProgressState(),
      requestId: event.request_id,
      traceId: event.trace_id,
    };
  }

  const next: SimulationProgressState = {
    ...current,
    stages: { ...current.stages },
  };

  switch (event.type) {
    case "routing_resolved": {
      next.executionMode = event.execution_mode;
      next.selectedPath = [...event.selected_path];

      for (const stageName of event.skipped_stages) {
        next.stages[stageName] = {
          ...next.stages[stageName],
          status: "skipped",
        };
      }

      return next;
    }
    case "stage_started": {
      next.requestId = event.request_id;
      next.stages[event.stage_name] = {
        status: "active",
        executionKind: event.execution_kind,
        model: event.model ?? next.stages[event.stage_name].model,
        fallbackUsed: false,
        fallbackReason: null,
      };
      return next;
    }
    case "stage_completed": {
      next.requestId = event.request_id;
      next.stages[event.stage_name] = {
        status: "completed",
        executionKind: event.execution_kind,
        model: event.model ?? next.stages[event.stage_name].model,
        fallbackUsed: event.fallback_used ?? false,
        fallbackReason: event.fallback_reason ?? null,
      };
      return next;
    }
    case "error": {
      next.traceId = event.trace_id;

      const activeStage = (SIMULATION_STAGE_ORDER as readonly SimulationStageName[])
        .map((stageName) => ({
          stageName,
          entry: next.stages[stageName],
        }))
        .find(({ entry }) => entry.status === "active");

      if (activeStage) {
        next.stages[activeStage.stageName] = {
          ...activeStage.entry,
          status: "failed",
        };
      }

      return next;
    }
    case "result":
      next.requestId = event.request_id;
      return next;
    default:
      return next;
  }
}

export function getCurrentStage(
  progress: SimulationProgressState,
): SimulationStageName | null {
  for (const stageName of SIMULATION_STAGE_ORDER) {
    if (progress.stages[stageName].status === "active") {
      return stageName;
    }
  }

  return null;
}

export function hasProgressHistory(progress: SimulationProgressState): boolean {
  return Boolean(progress.requestId);
}

export function isProgressFinished(progress: SimulationProgressState): boolean {
  return SIMULATION_STAGE_ORDER.every((stageName) => {
    const status = progress.stages[stageName].status;
    return status === "completed" || status === "skipped";
  });
}

export function getProgressHeadline(progress: SimulationProgressState): string {
  const currentStage = getCurrentStage(progress);

  if (currentStage) {
    return `${STAGE_METADATA[currentStage].label} 실행 중`;
  }

  if (isProgressFinished(progress)) {
    return "모든 단계 실행이 완료되었습니다.";
  }

  if (progress.executionMode) {
    return `${EXECUTION_MODE_LABELS[progress.executionMode]} 경로가 확정되었습니다.`;
  }

  return "State Loader를 먼저 실행하며 실제 경로를 결정하고 있습니다.";
}
