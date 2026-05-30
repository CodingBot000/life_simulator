import { useState } from "react";

import { FollowupReevaluationPanel } from "@/components/simulation/followup-reevaluation-panel";
import { OutcomeFollowupPanel } from "@/components/simulation/outcome-followup-panel";
import { LoadingStageStrip } from "@/components/simulation/progress";
import { RecommendationPanel } from "@/components/simulation/recommendation-panel";
import {
  GuardrailCard,
  PlannerCard,
  ReasoningCard,
  ReflectionCard,
  RiskCard,
  RoutingCard,
  StateContextCard,
  TimelineCard,
} from "@/components/simulation/result-cards";
import { ResultVersionSummary } from "@/components/simulation/result-version-summary";
import { SessionMemoryPanel } from "@/components/simulation/session-memory-panel";
import { formatConfidence, formatUserFacingNarrative } from "@/components/simulation/narrative";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineBanner } from "@/components/ui/inline-banner";
import { StatusBadge } from "@/components/ui/status-badge";
import type { PriorityCatalog, PriorityLocale } from "@/lib/priorities";
import type { OptionFollowupState } from "@/lib/simulation/form";
import { hasProgressHistory } from "@/lib/simulation/progress";
import type { SimulationProgressState } from "@/lib/simulation/progress";
import type { SimulationResultVersion } from "@/lib/simulation/result-version";
import type {
  SessionMemoryDecision,
  SessionMemoryDecisionInput,
} from "@/lib/session-memory";
import type { SimulationResponse } from "@/lib/types";

type ReportTab = "summary" | "scenarios" | "risk" | "resources" | "versions";
type ReportDrawer = "diagnostics" | "memory" | "outcome" | "reevaluation" | null;

const REPORT_TABS: Array<{ id: ReportTab; label: string }> = [
  { id: "summary", label: "요약" },
  { id: "scenarios", label: "시나리오 비교" },
  { id: "risk", label: "리스크·안전장치" },
  { id: "resources", label: "문제를 해결하기위한 추천 상품" },
  { id: "versions", label: "버전 기록" },
];

export function ReportPage({
  locale,
  result,
  latestVersion,
  versions,
  isLoading,
  error,
  progress,
  priorityCatalog,
  decisions,
  sessionMemory,
  onStartNew,
  onSubmitReevaluation,
}: {
  locale: PriorityLocale;
  result: SimulationResponse | null;
  latestVersion: SimulationResultVersion | null;
  versions: SimulationResultVersion[];
  isLoading: boolean;
  error: string | null;
  progress: SimulationProgressState;
  priorityCatalog?: PriorityCatalog | null;
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
  onSubmitReevaluation: (followup: OptionFollowupState) => Promise<void> | void;
}) {
  const [activeTab, setActiveTab] = useState<ReportTab>("summary");
  const [drawer, setDrawer] = useState<ReportDrawer>(null);

  if (isLoading && !result) {
    return (
      <div className="grid gap-5">
        <section className="card-surface-strong rounded-[32px] p-6">
          <p className="section-label">Generating Report</p>
          <h2 className="display-font mt-2 text-3xl font-semibold text-slate-950">
            리포트 생성 중
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            상황 정리, 선택지 비교, 리스크 검토, 추천 및 주의사항을 준비하고
            있습니다.
          </p>
        </section>
        {hasProgressHistory(progress) ? (
          <LoadingStageStrip progress={progress} />
        ) : null}
      </div>
    );
  }

  if (error && !result) {
    return (
      <EmptyState
        label="Error"
        title="리포트를 생성하지 못했습니다"
        description={error}
        action={
          <button
            type="button"
            onClick={onStartNew}
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            입력으로 돌아가기
          </button>
        }
      />
    );
  }

  if (!result || !latestVersion) {
    return (
      <EmptyState
        label="No Report"
        title="아직 분석 결과가 없습니다"
        description="새 의사결정을 실행하면 리포트가 이곳에 표시됩니다."
        action={
          <button
            type="button"
            onClick={onStartNew}
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            새 의사결정 시작
          </button>
        }
      />
    );
  }

  const request = latestVersion.request;
  const recommendation = result.advisor.decision;
  const confidence = formatConfidence(result.advisor.confidence);

  return (
    <>
      <div className="grid gap-6">
        {error ? (
          <InlineBanner tone="error" title="최근 요청에서 오류가 발생했습니다.">
            {error}
          </InlineBanner>
        ) : null}

        <section className="card-surface-strong rounded-[32px] p-6 sm:p-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={result.guardrail.final_mode === "normal" ? "success" : "warning"}>
                  {result.guardrail.final_mode === "normal"
                    ? "일반 추천"
                    : "주의 필요"}
                </StatusBadge>
                <StatusBadge>신뢰도 {confidence}</StatusBadge>
                {versions.length > 1 ? (
                  <StatusBadge tone="warning">latest {latestVersion.label}</StatusBadge>
                ) : null}
              </div>
              <p className="section-label mt-5">Report</p>
              <h2 className="display-font mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                추천: {recommendation === "undecided" ? "보류" : `${recommendation}안`}
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-700">
                {formatUserFacingNarrative(result.advisor.reason, locale)}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setDrawer("outcome")}
                  className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  실제 결과 기록
                </button>
                <button
                  type="button"
                  onClick={() => setDrawer("reevaluation")}
                  className="inline-flex items-center justify-center rounded-full border border-amber-900/10 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
                >
                  조건 추가 재평가
                </button>
                <button
                  type="button"
                  onClick={() => setDrawer("memory")}
                  className="inline-flex items-center justify-center rounded-full border border-slate-900/10 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  저장하기
                </button>
                <button
                  type="button"
                  onClick={() => setDrawer("diagnostics")}
                  className="inline-flex items-center justify-center rounded-full border border-slate-900/10 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  진단 과정 dev mode
                </button>
              </div>
            </div>

            <aside className="rounded-[24px] border border-slate-900/8 bg-white/75 p-5">
              <p className="section-label">Decision Brief</p>
              <div className="mt-4 grid gap-3 text-sm">
                <BriefLine label="A" value={request.decision.optionA} />
                <BriefLine label="B" value={request.decision.optionB} />
                <BriefLine label="직업" value={request.userProfile.job} />
                <BriefLine
                  label="저장 메모리"
                  value={`${decisions.length}건 반영 가능`}
                />
              </div>
            </aside>
          </div>
        </section>

        <section className="card-surface rounded-[28px] p-5">
          <div
            role="tablist"
            aria-label="리포트 섹션"
            className="flex gap-2 overflow-x-auto rounded-full border border-slate-900/10 bg-white/80 p-1"
          >
            {REPORT_TABS.map((tab) => {
              const selected = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
                    selected
                      ? "bg-slate-950 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            {activeTab === "summary" ? (
              <SummaryTab
                result={result}
                locale={locale}
                priorityCatalog={priorityCatalog}
              />
            ) : null}
            {activeTab === "scenarios" ? <ScenarioTab result={result} /> : null}
            {activeTab === "risk" ? (
              <RiskTab result={result} locale={locale} />
            ) : null}
            {activeTab === "resources" ? (
              <RecommendationPanel
                request={latestVersion.request}
                response={latestVersion.response}
                locale={locale}
              />
            ) : null}
            {activeTab === "versions" ? (
              <ResultVersionSummary locale={locale} versions={versions} />
            ) : null}
          </div>
        </section>
      </div>

      <Drawer
        title="고급 진단"
        description="기본 리포트에서 숨긴 내부 분석 경로와 실행 상세입니다."
        isOpen={drawer === "diagnostics"}
        onClose={() => setDrawer(null)}
      >
        <div className="grid gap-5">
          {hasProgressHistory(progress) ? (
            <LoadingStageStrip progress={progress} />
          ) : null}
          <RoutingCard routing={result.routing} />
        </div>
      </Drawer>

      <Drawer
        title="저장하기"
        description="저장한 선택은 다음 의사결정의 참고 사항으로 반영됩니다."
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
        description="실제로 어떤 선택을 했고 결과가 어땠는지 저장합니다."
        isOpen={drawer === "outcome"}
        onClose={() => setDrawer(null)}
      >
        <OutcomeFollowupPanel requestId={result.request_id} />
      </Drawer>

      <Drawer
        title="조건 추가 재평가"
        description="선택지별 최악의 경우와 되돌릴 조건을 추가해 전체 판단을 다시 실행합니다."
        isOpen={drawer === "reevaluation"}
        onClose={() => setDrawer(null)}
      >
        <FollowupReevaluationPanel
          request={latestVersion.request}
          versionLabel={latestVersion.label}
          disabled={isLoading}
          onSubmit={onSubmitReevaluation}
        />
      </Drawer>
    </>
  );
}

function SummaryTab({
  result,
  locale,
  priorityCatalog,
}: {
  result: SimulationResponse;
  locale: PriorityLocale;
  priorityCatalog?: PriorityCatalog | null;
}) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="핵심 이유"
          value={formatUserFacingNarrative(
            result.advisor.reasoning_basis.core_why,
            locale,
          )}
        />
        <SummaryCard
          label="결과 검증"
          value={formatUserFacingNarrative(
            result.reflection.user_summary.headline,
            locale,
          )}
        />
        <SummaryCard
          label="다음 행동"
          value={
            result.reflection.user_summary.suggested_actions[0]
              ? formatUserFacingNarrative(
                  result.reflection.user_summary.suggested_actions[0],
                  locale,
                )
              : "추가 확인 사항을 정리하세요."
          }
        />
      </div>

      <details className="rounded-[24px] border border-slate-900/8 bg-white/75 p-5">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800">
          결정 브리프 자세히 보기
        </summary>
        <div className="mt-5 grid gap-5">
          <StateContextCard
            stateContext={result.stateContext}
            locale={locale}
            priorityCatalog={priorityCatalog}
          />
          <PlannerCard planner={result.planner} />
          {result.reasoning ? (
            <ReasoningCard
              reasoning={result.reasoning}
              requestId={result.request_id}
            />
          ) : null}
        </div>
      </details>
    </div>
  );
}

function ScenarioTab({ result }: { result: SimulationResponse }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {result.scenarioA ? (
        <TimelineCard title="선택지 A 시나리오" scenario={result.scenarioA} />
      ) : null}
      {result.scenarioB ? (
        <TimelineCard title="선택지 B 시나리오" scenario={result.scenarioB} />
      ) : null}
      {!result.scenarioA && !result.scenarioB ? (
        <InlineBanner title="표시할 시나리오가 없습니다.">
          현재 실행 경로에서는 시나리오 단계가 생략됐습니다.
        </InlineBanner>
      ) : null}
    </div>
  );
}

function RiskTab({
  result,
  locale,
}: {
  result: SimulationResponse;
  locale: PriorityLocale;
}) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 lg:grid-cols-2">
        {result.riskA ? <RiskCard title="Risk A" risk={result.riskA} /> : null}
        {result.riskB ? <RiskCard title="Risk B" risk={result.riskB} /> : null}
      </div>
      <GuardrailCard
        guardrail={result.guardrail}
        derived={!result.routing.selected_path.includes("guardrail")}
        requestId={result.request_id}
      />
      <ReflectionCard
        reflection={result.reflection}
        derived={!result.routing.selected_path.includes("reflection")}
        locale={locale}
        requestId={result.request_id}
      />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[24px] border border-slate-900/8 bg-white/75 p-5">
      <p className="section-label">{label}</p>
      <p className="mt-3 text-sm leading-7 text-slate-700">{value}</p>
    </article>
  );
}

function BriefLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <span className="text-sm font-semibold leading-6 text-slate-950">{value}</span>
    </div>
  );
}
