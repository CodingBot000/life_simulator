import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { getLocalizedText } from "@/hooks/use-case-presets";
import type { PriorityLocale } from "@/lib/priorities";
import type { SimulationResultVersion } from "@/lib/simulation/result-version";
import type { SessionMemoryDecision } from "@/lib/session-memory";
import type { CasePreset } from "@/lib/types";

export function DashboardPage({
  locale,
  latestVersion,
  versions,
  decisions,
  presets,
  onStartNew,
  onOpenReport,
  onOpenRecords,
}: {
  locale: PriorityLocale;
  latestVersion: SimulationResultVersion | null;
  versions: SimulationResultVersion[];
  decisions: SessionMemoryDecision[];
  presets: CasePreset[];
  onStartNew: () => void;
  onOpenReport: () => void;
  onOpenRecords: () => void;
}) {
  const hasReport = Boolean(latestVersion);

  return (
    <div className="grid gap-6">
      <section className="card-surface-strong rounded-[32px] p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div>
            <p className="section-label">Dashboard</p>
            <h2 className="display-font mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              집단지성 의사결정 시뮬레이터
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              첫 화면에서는 시작과 최근 상태만 보여줍니다. 상세 분석, 내부
              진단, 후속 입력은 필요한 버튼을 눌렀을 때 열립니다.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onStartNew}
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                새 의사결정 시작
              </button>
              <button
                type="button"
                disabled={!hasReport}
                onClick={onOpenReport}
                className="inline-flex items-center justify-center rounded-full border border-slate-900/10 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                최근 리포트 보기
              </button>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-900/8 bg-white/75 p-5">
            <p className="section-label">Current Status</p>
            <div className="mt-4 grid gap-3">
              <StatusLine
                label="최근 리포트"
                value={latestVersion ? latestVersion.label : "없음"}
              />
              <StatusLine label="저장된 결정" value={`${decisions.length}건`} />
              <StatusLine label="재평가 버전" value={`${versions.length}개`} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="총 리포트" value={`${versions.length}`} />
        <KpiCard label="후속 기록 필요" value={hasReport ? "1" : "0"} />
        <KpiCard label="저장 메모리" value={`${decisions.length}`} />
        <KpiCard
          label="최근 안전 모드"
          value={latestVersion?.response.guardrail.final_mode ?? "none"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {hasReport && latestVersion ? (
          <section className="card-surface rounded-[28px] p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="section-label">Recent Report</p>
                <h3 className="display-font mt-2 text-2xl font-semibold text-slate-950">
                  {latestVersion.request.decision.optionA} vs{" "}
                  {latestVersion.request.decision.optionB}
                </h3>
              </div>
              <StatusBadge tone="success">리포트 준비됨</StatusBadge>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <SummaryTile
                label="추천"
                value={latestVersion.response.advisor.decision}
              />
              <SummaryTile
                label="신뢰도"
                value={`${Math.round(
                  latestVersion.response.advisor.confidence * 100,
                )}%`}
              />
              <SummaryTile
                label="주의 모드"
                value={latestVersion.response.guardrail.final_mode}
              />
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              {latestVersion.response.advisor.reason}
            </p>
            <button
              type="button"
              onClick={onOpenReport}
              className="mt-5 inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              리포트 열기
            </button>
          </section>
        ) : (
          <EmptyState
            label="No Report"
            title="아직 분석 결과가 없습니다"
            description="새 의사결정을 시작하면 첫 리포트가 이곳에 표시됩니다."
            action={
              <button
                type="button"
                onClick={onStartNew}
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                첫 의사결정 시작
              </button>
            }
          />
        )}

        <aside className="grid gap-4">
          <section className="card-surface rounded-[28px] p-5">
            <p className="section-label">Quick Templates</p>
            <h3 className="display-font mt-2 text-xl font-semibold text-slate-950">
              템플릿에서 시작
            </h3>
            <div className="mt-4 grid gap-2">
              {presets.slice(0, 3).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={onStartNew}
                  className="rounded-2xl border border-slate-900/8 bg-white/80 px-4 py-3 text-left text-sm font-semibold leading-6 text-slate-800 transition hover:bg-slate-50"
                >
                  {getLocalizedText(preset.titleLabels, locale, preset.title)}
                </button>
              ))}
              {presets.length === 0 ? (
                <p className="rounded-2xl border border-slate-900/8 bg-white/80 px-4 py-3 text-sm text-slate-500">
                  템플릿을 불러오면 여기에 표시됩니다.
                </p>
              ) : null}
            </div>
          </section>

          <section className="card-surface rounded-[28px] p-5">
            <p className="section-label">Memory</p>
            <h3 className="display-font mt-2 text-xl font-semibold text-slate-950">
              저장된 결정
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {decisions.length > 0
                ? `${decisions.length}개의 선택 기록이 다음 분석에 반영됩니다.`
                : "아직 저장된 선택 기록이 없습니다."}
            </p>
            <button
              type="button"
              onClick={onOpenRecords}
              className="mt-4 inline-flex items-center justify-center rounded-full border border-slate-900/10 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              기록 관리
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-surface rounded-[24px] p-5">
      <p className="section-label">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-900/8 bg-white/75 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-950">{value}</span>
    </div>
  );
}
