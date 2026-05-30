import type { ReactNode } from "react";

type StatusTone = "neutral" | "success" | "warning" | "danger";

const toneClasses: Record<StatusTone, string> = {
  neutral: "border-slate-900/10 bg-white text-slate-600",
  success: "border-emerald-900/10 bg-emerald-50 text-emerald-900",
  warning: "border-amber-900/10 bg-amber-50 text-amber-900",
  danger: "border-rose-900/10 bg-rose-50 text-rose-900",
};

export function StatusBadge({
  tone = "neutral",
  children,
}: {
  tone?: StatusTone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
