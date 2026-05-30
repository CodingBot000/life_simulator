import { useState, type ReactNode } from "react";

import {
  SimulatorFlowInfo,
  SimulatorFlowInfoModal,
} from "@/components/simulation/simulator-flow-info";

export type WorkspaceView =
  | "dashboard"
  | "compose"
  | "report"
  | "records"
  | "insights";

const NAV_ITEMS: Array<{ id: WorkspaceView; label: string }> = [
  { id: "dashboard", label: "대시보드" },
  { id: "compose", label: "새 의사결정" },
  { id: "report", label: "리포트" },
  { id: "records", label: "기록" },
  { id: "insights", label: "인사이트" },
];

export function AppShell({
  activeView,
  onNavigate,
  onStartNew,
  children,
}: {
  activeView: WorkspaceView;
  onNavigate: (view: WorkspaceView) => void;
  onStartNew: () => void;
  children: ReactNode;
}) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <>
      <main className="mx-auto min-h-screen w-full max-w-[1320px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <header className="sticky top-0 z-40 -mx-4 border-b border-slate-900/8 bg-[#f4efe7]/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="section-label">Decision Workspace</p>
              <h1 className="display-font mt-1 text-2xl font-semibold text-slate-950">
                의사결정 워크스페이스
              </h1>
            </div>

            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
              <nav
                aria-label="주요 화면"
                className="flex gap-2 overflow-x-auto rounded-full border border-slate-900/10 bg-white/80 p-1"
              >
                {NAV_ITEMS.map((item) => {
                  const selected = activeView === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-current={selected ? "page" : undefined}
                      onClick={() => onNavigate(item.id)}
                      className={[
                        "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
                        selected
                          ? "bg-slate-950 text-white"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                      ].join(" ")}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={onStartNew}
                  className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  새 의사결정
                </button>
                <SimulatorFlowInfo compact onOpen={() => setIsHelpOpen(true)} />
              </div>
            </div>
          </div>
        </header>

        <div className="py-7">{children}</div>
      </main>

      <SimulatorFlowInfoModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </>
  );
}
