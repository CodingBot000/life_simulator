import { useState } from "react";

import {
  submitFeedback,
  submitGuardrailReview,
  type FeedbackSignal,
  type FeedbackTargetType,
} from "@/lib/api/feedback";

type SubmitState = "idle" | "saving" | "saved" | "error";

const baseButtonClass =
  "inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

export function FeedbackControls({
  requestId,
  targetType,
  targetOption,
  signals = ["helpful", "not_helpful", "agree", "disagree"],
}: {
  requestId: string;
  targetType: FeedbackTargetType;
  targetOption?: string;
  signals?: FeedbackSignal[];
}) {
  const [status, setStatus] = useState<SubmitState>("idle");
  const [message, setMessage] = useState<string>("");

  async function handleSignal(signal: FeedbackSignal) {
    setStatus("saving");
    setMessage("");

    try {
      await submitFeedback({
        requestId,
        targetType,
        targetOption,
        feedbackSignal: signal,
        rating: positiveSignal(signal) ? 5 : 2,
        metadata: { source: "simulation_result_card" },
      });
      setStatus("saved");
      setMessage("저장됨");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "저장 실패");
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-slate-900/8 bg-white/70 p-3">
      <div className="flex flex-wrap gap-2">
        {signals.map((signal) => (
          <button
            key={signal}
            type="button"
            disabled={status === "saving"}
            onClick={() => void handleSignal(signal)}
            className={`${baseButtonClass} border-slate-900/10 bg-white text-slate-700 hover:border-slate-900/20 hover:bg-slate-50`}
          >
            {labelForSignal(signal)}
          </button>
        ))}
      </div>
      {message ? (
        <p
          className={[
            "mt-2 text-xs leading-5",
            status === "error" ? "text-rose-700" : "text-slate-500",
          ].join(" ")}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function GuardrailReviewControls({ requestId }: { requestId: string }) {
  const [status, setStatus] = useState<SubmitState>("idle");
  const [message, setMessage] = useState<string>("");

  async function handleReview(reviewLabel: "good" | "over" | "missing") {
    setStatus("saving");
    setMessage("");

    try {
      await submitGuardrailReview({
        requestId,
        reviewerType: "user",
        reviewLabel,
        reasonTags: [reviewLabel === "good" ? "appropriate" : "needs_adjustment"],
      });
      setStatus("saved");
      setMessage("저장됨");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "저장 실패");
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-slate-900/8 bg-white/70 p-3">
      <div className="flex flex-wrap gap-2">
        {[
          ["good", "적절"],
          ["over", "과도함"],
          ["missing", "부족함"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            disabled={status === "saving"}
            onClick={() => void handleReview(value as "good" | "over" | "missing")}
            className={`${baseButtonClass} border-slate-900/10 bg-white text-slate-700 hover:border-slate-900/20 hover:bg-slate-50`}
          >
            {label}
          </button>
        ))}
      </div>
      {message ? (
        <p className={`mt-2 text-xs leading-5 ${status === "error" ? "text-rose-700" : "text-slate-500"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}

function positiveSignal(signal: FeedbackSignal) {
  return signal === "helpful" || signal === "agree" || signal === "would_choose";
}

function labelForSignal(signal: FeedbackSignal) {
  switch (signal) {
    case "helpful":
      return "도움됨";
    case "not_helpful":
      return "도움 안 됨";
    case "agree":
      return "동의";
    case "disagree":
      return "비동의";
    case "would_choose":
      return "선택 의향";
    case "missing_context":
      return "정보 부족";
  }
}
