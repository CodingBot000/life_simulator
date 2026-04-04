import { randomUUID } from "node:crypto";

import { PROMPT_VERSION } from "../../lib/logger/logVersions.ts";

export const CONTEXT_VERSION = "life-simulator-context.v1";

export interface ExecutionContext {
  request_id: string;
  trace_id: string;
  user_id: string;
  session_id: string;
  started_at: string;
  deadline_at: string;
  route_name: string;
  selected_path: string[];
  selected_model: string;
  context_version: string;
  prompt_version: string;
}

export function createExecutionContext(params: {
  routeName: string;
  selectedPath: string[];
  selectedModel: string;
  userId?: string;
  sessionId?: string;
  traceId?: string;
  deadlineMs?: number;
}): ExecutionContext {
  const startedAt = new Date();
  const deadlineMs = params.deadlineMs ?? Number.parseInt(process.env.REQUEST_DEADLINE_MS ?? "25000", 10);

  return {
    request_id: randomUUID(),
    trace_id: params.traceId?.trim() || randomUUID(),
    user_id: params.userId?.trim() || "anonymous",
    session_id: params.sessionId?.trim() || "interactive-session",
    started_at: startedAt.toISOString(),
    deadline_at: new Date(startedAt.getTime() + deadlineMs).toISOString(),
    route_name: params.routeName,
    selected_path: [...params.selectedPath],
    selected_model: params.selectedModel,
    context_version: CONTEXT_VERSION,
    prompt_version: PROMPT_VERSION,
  };
}
