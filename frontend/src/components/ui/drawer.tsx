import { useEffect, type ReactNode } from "react";

export function Drawer({
  title,
  description,
  size = "default",
  isOpen,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  size?: "default" | "wide";
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const sizeClass = size === "wide" ? "w-full max-w-4xl" : "w-full max-w-xl";

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/45"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className={`${sizeClass} h-full overflow-y-auto border-l border-slate-900/10 bg-[#fffaf2] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.24)] sm:p-7`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="section-label">Workspace</p>
            <h2
              id="drawer-title"
              className="display-font mt-2 text-2xl font-semibold text-slate-950"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-900/10 bg-white text-lg font-semibold leading-none text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            aria-label="닫기"
          >
            x
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </section>
    </div>
  );
}
