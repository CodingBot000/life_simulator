import type { ReactNode } from "react";

type BannerTone = "info" | "error" | "success";

const toneClasses: Record<BannerTone, string> = {
  info: "border-slate-900/10 bg-white/80 text-slate-700",
  error: "border-rose-900/10 bg-rose-50 text-rose-900",
  success: "border-emerald-900/10 bg-emerald-50 text-emerald-900",
};

export function InlineBanner({
  tone = "info",
  title,
  children,
}: {
  tone?: BannerTone;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className={`rounded-[24px] border px-4 py-4 ${toneClasses[tone]}`}>
      <p className="text-sm font-semibold">{title}</p>
      {children ? <div className="mt-2 text-sm leading-7">{children}</div> : null}
    </div>
  );
}
