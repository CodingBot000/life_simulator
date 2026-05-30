import { useState } from "react";

import { LoadingStageStrip } from "@/components/simulation/progress";
import { RoutingCard } from "@/components/simulation/result-cards";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineBanner } from "@/components/ui/inline-banner";
import type { SimulationProgressState } from "@/lib/simulation/progress";
import { hasProgressHistory } from "@/lib/simulation/progress";
import type { SimulationResultVersion } from "@/lib/simulation/result-version";
import type { SessionMemoryDecision } from "@/lib/session-memory";

type InsightTab = "behavior" | "memory" | "diagnostics";

export function InsightsPage({
  latestVersion,
  versions,
  decisions,
  progress,
}: {
  latestVersion: SimulationResultVersion | null;
  versions: SimulationResultVersion[];
  decisions: SessionMemoryDecision[];
  progress: SimulationProgressState;
}) {
  const [activeTab, setActiveTab] = useState<InsightTab>("behavior");
  const sampleCount = Math.max(versions.length, decisions.length);

  return (
    <div className="grid gap-6">
      <section className="card-surface-strong rounded-[32px] p-6 sm:p-8">
        <p className="section-label">Insights</p>
        <h2 className="display-font mt-3 text-4xl font-semibold tracking-tight text-slate-950">
          의사결정 인사이트
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
          반복 사용 데이터가 충분해지면 결정 패턴과 후속 결과를 요약합니다.
          내부 실행 진단은 고급 진단 탭에서만 확인합니다.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="샘플 수" value={`${sampleCount}`} />
        <MetricCard label="저장 메모리" value={`${decisions.length}`} />
        <MetricCard label="리포트 버전" value={`${versions.length}`} />
        <MetricCard
          label="최근 안전 모드"
          value={latestVersion?.response.guardrail.final_mode ?? "none"}
        />
      </div>

      <section className="card-surface rounded-[28px] p-5">
        <div
          role="tablist"
          aria-label="인사이트 섹션"
          className="flex gap-2 overflow-x-auto rounded-full border border-slate-900/10 bg-white/80 p-1"
        >
          {[
            ["behavior", "행동 인사이트"],
            ["memory", "메모리 패턴"],
            ["diagnostics", "고급 진단"],
          ].map(([id, label]) => {
            const selected = activeTab === id;

            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(id as InsightTab)}
                className={[
                  "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
                  selected
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          {activeTab === "behavior" ? (
            sampleCount >= 5 ? (
              <InlineBanner title="행동 패턴 요약">
                실제 패턴 계산은 후속 데이터 영속화 이후 확장합니다.
              </InlineBanner>
            ) : (
              <EmptyState
                label="Not Enough Data"
                title="데이터가 충분하지 않습니다"
                description="5건 이상부터 만족도, 후회도, 추천 변화 추세를 표시합니다."
              />
            )
          ) : null}

          {activeTab === "memory" ? (
            decisions.length > 0 ? (
              <ul className="grid gap-3">
                {decisions.map((decision) => (
                  <li
                    key={decision.id}
                    className="rounded-2xl border border-slate-900/8 bg-white/75 p-4 text-sm leading-7 text-slate-700"
                  >
                    <strong className="text-slate-950">{decision.topic}</strong>
                    <br />
                    {decision.selected_option} · {decision.outcome_note}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                label="No Memory"
                title="저장된 결정이 없습니다"
                description="리포트에서 이번 선택을 저장하면 이곳에서 패턴을 확인할 수 있습니다."
              />
            )
          ) : null}

          {activeTab === "diagnostics" ? (
            latestVersion ? (
              <div className="grid gap-5">
                <RoutingCard routing={latestVersion.response.routing} />
                {hasProgressHistory(progress) ? (
                  <LoadingStageStrip progress={progress} />
                ) : null}
              </div>
            ) : (
              <EmptyState
                label="No Diagnostics"
                title="진단할 리포트가 없습니다"
                description="새 의사결정을 실행하면 내부 분석 경로를 이 탭에서 확인할 수 있습니다."
              />
            )
          ) : null}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-surface rounded-[24px] p-5">
      <p className="section-label">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
