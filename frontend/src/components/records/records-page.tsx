import { useState } from "react";

import { OutcomeFollowupPanel } from "@/components/simulation/outcome-followup-panel";
import { SessionMemoryPanel } from "@/components/simulation/session-memory-panel";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import type { SimulationResultVersion } from "@/lib/simulation/result-version";
import type {
  SessionMemoryDecision,
  SessionMemoryDecisionInput,
} from "@/lib/session-memory";

type RecordsDrawer = "memory" | "outcome" | null;

export function RecordsPage({
  latestVersion,
  decisions,
  sessionMemory,
  onStartNew,
}: {
  latestVersion: SimulationResultVersion | null;
  decisions: SessionMemoryDecision[];
  sessionMemory: {
    saveDecision: (
      input: SessionMemoryDecisionInput,
    ) => void | Promise<unknown>;
    deleteDecision: (id: string) => void | Promise<unknown>;
    clearDecisions: () => void | Promise<unknown>;
    syncStatus: "idle" | "syncing" | "synced" | "local_only";
    syncError: string | null;
  };
  onStartNew: () => void;
}) {
  const [drawer, setDrawer] = useState<RecordsDrawer>(null);

  return (
    <>
      <div className="grid gap-6">
        <section className="card-surface-strong rounded-[32px] p-6 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="section-label">Records</p>
              <h2 className="display-font mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                결정 기록
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                저장된 결정과 실제 선택 결과를 관리합니다. 세부 입력 폼은
                버튼을 눌렀을 때만 열립니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!latestVersion}
                onClick={() => setDrawer("memory")}
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                저장하기
              </button>
              <button
                type="button"
                disabled={!latestVersion}
                onClick={() => setDrawer("outcome")}
                className="inline-flex items-center justify-center rounded-full border border-slate-900/10 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                실제 결과 기록
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="card-surface rounded-[28px] p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="section-label">Saved Decisions</p>
                <h3 className="display-font mt-2 text-2xl font-semibold text-slate-950">
                  저장된 선택
                </h3>
              </div>
              <StatusBadge>{syncLabel(sessionMemory.syncStatus)}</StatusBadge>
            </div>

            {decisions.length > 0 ? (
              <ul className="mt-5 grid gap-3">
                {decisions.map((decision) => (
                  <li
                    key={decision.id}
                    className="rounded-2xl border border-slate-900/8 bg-white/75 p-4"
                  >
                    <p className="text-sm font-semibold text-slate-950">
                      {decision.topic}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {decision.selected_option}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {decision.outcome_note}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-5">
                <EmptyState
                  label="Empty"
                  title="저장된 결정이 없습니다"
                  description="리포트에서 이번 선택을 저장하면 다음 분석에 참고됩니다."
                  action={
                    <button
                      type="button"
                      onClick={latestVersion ? () => setDrawer("memory") : onStartNew}
                      className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      {latestVersion ? "선택 저장하기" : "새 의사결정 시작"}
                    </button>
                  }
                />
              </div>
            )}
          </section>

          <aside className="grid gap-4 content-start">
            <section className="card-surface rounded-[28px] p-5">
              <p className="section-label">Latest Report</p>
              <h3 className="display-font mt-2 text-xl font-semibold text-slate-950">
                최근 리포트
              </h3>
              {latestVersion ? (
                <div className="mt-4 grid gap-3 text-sm leading-6">
                  <p className="font-semibold text-slate-950">
                    {latestVersion.request.decision.optionA} vs{" "}
                    {latestVersion.request.decision.optionB}
                  </p>
                  <p className="text-slate-600">
                    추천: {latestVersion.response.advisor.decision}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  아직 리포트가 없습니다.
                </p>
              )}
            </section>
            <section className="card-surface rounded-[28px] p-5">
              <p className="section-label">Sync</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {sessionMemory.syncError
                  ? sessionMemory.syncError
                  : "브라우저와 서버 세션 상태를 함께 사용합니다."}
              </p>
            </section>
          </aside>
        </div>
      </div>

      {latestVersion ? (
        <>
          <Drawer
            title="저장하기"
            isOpen={drawer === "memory"}
            onClose={() => setDrawer(null)}
          >
            <SessionMemoryPanel
              request={latestVersion.request}
              response={latestVersion.response}
              decisions={decisions}
              onSave={sessionMemory.saveDecision}
              onDelete={sessionMemory.deleteDecision}
              onClear={sessionMemory.clearDecisions}
              syncStatus={sessionMemory.syncStatus}
              syncError={sessionMemory.syncError}
            />
          </Drawer>

          <Drawer
            title="실제 결과 기록"
            isOpen={drawer === "outcome"}
            onClose={() => setDrawer(null)}
          >
            <OutcomeFollowupPanel requestId={latestVersion.response.request_id} />
          </Drawer>
        </>
      ) : null}
    </>
  );
}

function syncLabel(status: "idle" | "syncing" | "synced" | "local_only") {
  switch (status) {
    case "syncing":
      return "동기화 중";
    case "synced":
      return "동기화됨";
    case "local_only":
      return "로컬 저장";
    default:
      return "준비 중";
  }
}
