import { useState } from "react";

import {
  submitOutcomeFollowup,
  updateOutcomeFollowup,
  type OutcomeFollowupPayload,
} from "@/lib/api/outcome-followups";
import { buildDatasetCandidates } from "@/lib/api/learning";

export function OutcomeFollowupPanel({ requestId }: { requestId: string }) {
  const [followupId, setFollowupId] = useState<string | null>(null);
  const [actualChoice, setActualChoice] =
    useState<OutcomeFollowupPayload["actualChoice"]>("undecided");
  const [satisfactionScore, setSatisfactionScore] = useState("4");
  const [regretScore, setRegretScore] = useState("2");
  const [horizonDays, setHorizonDays] = useState("0");
  const [outcomeNote, setOutcomeNote] = useState("");
  const [unexpectedFactors, setUnexpectedFactors] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const [buildStatus, setBuildStatus] =
    useState<"idle" | "saving" | "saved" | "error">("idle");
  const [buildMessage, setBuildMessage] = useState("");

  async function handleSubmit() {
    setStatus("saving");
    setMessage("");

    const payload: OutcomeFollowupPayload = {
      requestId,
      actualChoice,
      satisfactionScore: numericOrUndefined(satisfactionScore),
      regretScore: numericOrUndefined(regretScore),
      horizonDays: numericOrUndefined(horizonDays),
      outcomeNote: outcomeNote.trim() || undefined,
      unexpectedFactors: unexpectedFactors
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      metadata: { source: "simulation_result_followup_panel" },
    };

    try {
      const response = followupId
        ? await updateOutcomeFollowup(followupId, payload)
        : await submitOutcomeFollowup(payload);
      setFollowupId(response.followupId);
      setStatus("saved");
      setMessage(followupId ? "후속 결과가 수정됐습니다." : "후속 결과가 저장됐습니다.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "저장 실패");
    }
  }

  async function handleBuildDatasetCandidates() {
    setBuildStatus("saving");
    setBuildMessage("");

    try {
      const response = await buildDatasetCandidates(requestId);
      setBuildStatus("saved");
      setBuildMessage(`학습 후보 ${response.persisted}건 생성됨`);
    } catch (error) {
      setBuildStatus("error");
      setBuildMessage(error instanceof Error ? error.message : "생성 실패");
    }
  }

  return (
    <section className="card-surface rounded-[28px] p-6">
      <p className="section-label">Outcome Follow-up</p>
      <h3 className="display-font mt-2 text-xl font-semibold text-slate-900">
        실제 선택 결과 저장
      </h3>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          실제 선택
          <select
            value={actualChoice}
            onChange={(event) =>
              setActualChoice(event.target.value as OutcomeFollowupPayload["actualChoice"])
            }
            className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
          >
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="undecided">보류</option>
            <option value="other">다른 선택</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          추적 시점
          <select
            value={horizonDays}
            onChange={(event) => setHorizonDays(event.target.value)}
            className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
          >
            <option value="0">즉시</option>
            <option value="7">7일</option>
            <option value="30">30일</option>
            <option value="90">90일</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          만족도
          <input
            type="number"
            min={1}
            max={5}
            value={satisfactionScore}
            onChange={(event) => setSatisfactionScore(event.target.value)}
            className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          후회 정도
          <input
            type="number"
            min={1}
            max={5}
            value={regretScore}
            onChange={(event) => setRegretScore(event.target.value)}
            className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
          예상 밖 요인
          <input
            value={unexpectedFactors}
            onChange={(event) => setUnexpectedFactors(event.target.value)}
            placeholder="쉼표로 구분"
            className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
          결과 메모
          <textarea
            rows={4}
            value={outcomeNote}
            onChange={(event) => setOutcomeNote(event.target.value)}
            className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none"
          />
        </label>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={status === "saving"}
          onClick={() => void handleSubmit()}
          className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {followupId ? "후속 결과 수정" : "후속 결과 저장"}
        </button>
        {message ? (
          <p className={`text-sm ${status === "error" ? "text-rose-700" : "text-slate-500"}`}>
            {message}
          </p>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-900/8 pt-4">
        <button
          type="button"
          disabled={buildStatus === "saving"}
          onClick={() => void handleBuildDatasetCandidates()}
          className="inline-flex items-center justify-center rounded-full border border-slate-900/10 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-900/20 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          학습 후보 생성
        </button>
        {buildMessage ? (
          <p className={`text-sm ${buildStatus === "error" ? "text-rose-700" : "text-slate-500"}`}>
            {buildMessage}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function numericOrUndefined(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
