import { SIMULATION_STAGE_ORDER, type SimulationStageName } from "@/lib/types";
import {
  EXECUTION_KIND_LABELS,
  EXECUTION_MODE_LABELS,
  STAGE_METADATA,
  STAGE_STATUS_LABELS,
  getProgressHeadline,
  isProgressFinished,
  type SimulationProgressState,
  type StageProgressEntry,
} from "@/lib/simulation/progress";

function ProgressStageCard({
  stageName,
  index,
  entry,
}: {
  stageName: SimulationStageName;
  index: number;
  entry: StageProgressEntry;
}) {
  const metadata = STAGE_METADATA[stageName];
  const isActive = entry.status === "active";
  const isFallback = entry.fallbackUsed;
  const badgeLabel = isFallback
    ? "Fallback"
    : entry.model ?? (entry.executionKind ? EXECUTION_KIND_LABELS[entry.executionKind] : null);
  const displayStatusLabel = isFallback ? "Fallback 사용" : STAGE_STATUS_LABELS[entry.status];

  const toneClass =
    isFallback
      ? "border-orange-300 bg-orange-50 text-orange-950 shadow-[0_18px_40px_rgba(234,88,12,0.12)]"
      : entry.status === "completed"
      ? "border-slate-950 bg-slate-950 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
      : entry.status === "active"
        ? "animate-pulse border-amber-500/60 bg-amber-100 text-amber-950 shadow-[0_20px_44px_rgba(217,119,6,0.18)]"
        : entry.status === "skipped"
          ? "border-dashed border-slate-300 bg-slate-100/80 text-slate-500"
          : entry.status === "failed"
            ? "border-rose-300 bg-rose-50 text-rose-950 shadow-[0_18px_40px_rgba(190,24,93,0.12)]"
            : "border-slate-200 bg-white/90 text-slate-600";

  const metaToneClass =
    isFallback
      ? "text-orange-900/70"
      : entry.status === "completed"
      ? "text-white/70"
      : entry.status === "active"
        ? "text-amber-900/70"
        : entry.status === "failed"
          ? "text-rose-900/70"
          : "text-slate-400";

  return (
    <div
      className={`w-full max-w-[240px] rounded-[22px] border px-4 py-3 transition ${toneClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${metaToneClass}`}>
            {String(index + 1).padStart(2, "0")}
          </p>
          <p className="mt-2 text-sm font-semibold">{metadata.label}</p>
        </div>
        {badgeLabel ? (
          <span
            className={`max-w-[112px] break-all rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold leading-4 ${
              isFallback
                ? "border-orange-900/10 bg-white/80 text-orange-900"
                : entry.status === "completed"
                ? "border-white/20 bg-white/10 text-white"
                : entry.status === "active"
                  ? "border-amber-900/10 bg-white/70 text-amber-950"
                  : entry.status === "failed"
                    ? "border-rose-900/10 bg-white/70 text-rose-900"
                    : "border-slate-900/8 bg-white/80 text-slate-600"
            }`}
          >
            {badgeLabel}
          </span>
        ) : null}
      </div>
      <p className={`mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] ${metaToneClass}`}>
        {displayStatusLabel}
      </p>
      <p className={`mt-2 text-xs leading-6 ${isActive ? "text-amber-950/90" : isFallback ? "text-orange-950/80" : entry.status === "completed" ? "text-white/80" : entry.status === "failed" ? "text-rose-900/90" : "text-slate-500"}`}>
        {metadata.summary}
      </p>
      {entry.fallbackReason ? (
        <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-orange-900/80">
          {entry.fallbackReason}
        </p>
      ) : null}
    </div>
  );
}

export function LoadingStageStrip({ progress }: { progress: SimulationProgressState }) {
  return (
    <div className="rounded-[24px] border border-slate-900/8 bg-white/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="section-label">Live Progress</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {getProgressHeadline(progress)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isProgressFinished(progress) ? (
            <span className="rounded-full border border-emerald-900/10 bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-900">
              completed
            </span>
          ) : null}
          {progress.executionMode ? (
            <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white">
              {EXECUTION_MODE_LABELS[progress.executionMode]}
            </span>
          ) : (
            <span className="rounded-full border border-amber-900/10 bg-amber-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-amber-900">
              routing
            </span>
          )}
          {progress.traceId ? (
            <span className="rounded-full border border-slate-900/8 bg-white px-3 py-1.5 text-xs font-medium text-slate-500">
              trace {progress.traceId.slice(0, 8)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
        {SIMULATION_STAGE_ORDER.map((stageName, index) => (
          <ProgressStageCard
            key={stageName}
            stageName={stageName}
            index={index}
            entry={progress.stages[stageName]}
          />
        ))}
      </div>
    </div>
  );
}

