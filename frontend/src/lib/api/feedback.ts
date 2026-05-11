import { apiUrl, readJsonResponse } from "@/lib/api/client";
import { getSimulatorSessionId } from "@/lib/api/session";

export type FeedbackTargetType =
  | "reasoning_a"
  | "reasoning_b"
  | "comparison"
  | "final_selection"
  | "advisor"
  | "guardrail"
  | "reflection";

export type FeedbackSignal =
  | "helpful"
  | "not_helpful"
  | "agree"
  | "disagree"
  | "would_choose"
  | "missing_context";

export interface FeedbackPayload {
  requestId: string;
  targetType: FeedbackTargetType;
  targetOption?: string;
  feedbackSignal: FeedbackSignal;
  rating?: number;
  reasonTags?: string[];
  comment?: string;
  metadata?: Record<string, unknown>;
}

export interface FeedbackResponse {
  feedbackId: string;
  requestId: string;
  targetType: string;
  feedbackSignal: string;
  rating?: number;
  createdAt: string;
  updatedAt: string;
}

export async function submitFeedback(payload: FeedbackPayload) {
  const response = await fetch(apiUrl("/api/feedback"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-session-id": getSimulatorSessionId(),
    },
    body: JSON.stringify(payload),
  });

  return readJsonResponse<FeedbackResponse>(response);
}

export async function updateFeedback(feedbackId: string, payload: FeedbackPayload) {
  const response = await fetch(apiUrl(`/api/feedback/${feedbackId}`), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-session-id": getSimulatorSessionId(),
    },
    body: JSON.stringify(payload),
  });

  return readJsonResponse<FeedbackResponse>(response);
}

export async function submitGuardrailReview(payload: {
  requestId: string;
  reviewerType: "user";
  reviewLabel: "good" | "over" | "missing" | "unknown";
  correctMode?: string;
  reasonTags?: string[];
  comment?: string;
}) {
  const response = await fetch(apiUrl("/api/guardrail-reviews"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-session-id": getSimulatorSessionId(),
    },
    body: JSON.stringify(payload),
  });

  return readJsonResponse<{ reviewId: string; requestId: string }>(response);
}
