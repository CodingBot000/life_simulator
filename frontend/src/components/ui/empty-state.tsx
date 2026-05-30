import type { ReactNode } from "react";

export function EmptyState({
  label,
  title,
  description,
  action,
}: {
  label: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className="card-surface rounded-[28px] p-6">
      <p className="section-label">{label}</p>
      <h2 className="display-font mt-2 text-2xl font-semibold text-slate-950">
        {title}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}
