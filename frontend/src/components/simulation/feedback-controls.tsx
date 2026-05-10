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
const tagButtonClass =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition";

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
  const [reasonTags, setReasonTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const tagOptions = feedbackTagOptionsFor(targetType);

  async function handleSignal(signal: FeedbackSignal) {
    setStatus("saving");
    setMessage("");
    const trimmedComment = comment.trim();

    try {
      await submitFeedback({
        requestId,
        targetType,
        targetOption,
        feedbackSignal: signal,
        rating: positiveSignal(signal) ? 5 : 2,
        reasonTags: reasonTags.length > 0 ? reasonTags : undefined,
        comment: trimmedComment || undefined,
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
      <div className="mt-3 grid gap-3 border-t border-slate-900/8 pt-3">
        <div className="flex flex-wrap gap-2" aria-label="피드백 태그">
          {tagOptions.map((option) => {
            const isSelected = reasonTags.includes(option.value);

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isSelected}
                disabled={status === "saving"}
                onClick={() => setReasonTags((current) => toggleValue(current, option.value))}
                className={[
                  tagButtonClass,
                  isSelected
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-900/10 bg-white text-slate-600 hover:border-slate-900/20 hover:bg-slate-50",
                ].join(" ")}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <textarea
          value={comment}
          maxLength={2000}
          rows={2}
          disabled={status === "saving"}
          onChange={(event) => setComment(event.target.value)}
          placeholder="추가 의견"
          className="min-h-16 resize-y rounded-2xl border border-slate-900/10 bg-white px-3 py-2 text-xs leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10 disabled:cursor-not-allowed disabled:opacity-60"
        />
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
  const [reasonTags, setReasonTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");

  async function handleReview(reviewLabel: "good" | "over" | "missing") {
    setStatus("saving");
    setMessage("");
    const trimmedComment = comment.trim();

    try {
      await submitGuardrailReview({
        requestId,
        reviewerType: "user",
        reviewLabel,
        reasonTags: reasonTags.length > 0 ? reasonTags : undefined,
        comment: trimmedComment || undefined,
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
      <div className="mt-3 grid gap-3 border-t border-slate-900/8 pt-3">
        <div className="flex flex-wrap gap-2" aria-label="가드레일 리뷰 태그">
          {guardrailReviewTagOptions.map((option) => {
            const isSelected = reasonTags.includes(option.value);

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isSelected}
                disabled={status === "saving"}
                onClick={() => setReasonTags((current) => toggleValue(current, option.value))}
                className={[
                  tagButtonClass,
                  isSelected
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-900/10 bg-white text-slate-600 hover:border-slate-900/20 hover:bg-slate-50",
                ].join(" ")}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <textarea
          value={comment}
          maxLength={2000}
          rows={2}
          disabled={status === "saving"}
          onChange={(event) => setComment(event.target.value)}
          placeholder="추가 의견"
          className="min-h-16 resize-y rounded-2xl border border-slate-900/10 bg-white px-3 py-2 text-xs leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>
      {message ? (
        <p className={`mt-2 text-xs leading-5 ${status === "error" ? "text-rose-700" : "text-slate-500"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function positiveSignal(signal: FeedbackSignal) {
  return signal === "helpful" || signal === "agree" || signal === "would_choose";
}

function feedbackTagOptionsFor(targetType: FeedbackTargetType) {
  const common = [
    { value: "clear_reasoning", label: "근거 명확" },
    { value: "missing_context", label: "정보 부족" },
    { value: "fits_priority", label: "우선순위 부합" },
    { value: "too_generic", label: "너무 일반적" },
  ];

  if (targetType === "guardrail") {
    return [
      { value: "appropriate_caution", label: "주의 적절" },
      { value: "too_conservative", label: "과도하게 보수적" },
      { value: "needs_more_caution", label: "주의 부족" },
      ...common,
    ];
  }

  if (targetType === "reflection") {
    return [
      { value: "accurate_summary", label: "요약 정확" },
      { value: "missed_state", label: "상태 누락" },
      ...common,
    ];
  }

  return common;
}

const guardrailReviewTagOptions = [
  { value: "appropriate", label: "적절" },
  { value: "too_conservative", label: "과도하게 보수적" },
  { value: "needs_more_caution", label: "주의 부족" },
  { value: "weak_evidence", label: "근거 약함" },
  { value: "missing_context", label: "정보 부족" },
];

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
