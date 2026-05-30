import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const SIMULATOR_FLOW_STEPS = [
  "1. 상황 정리",
  "2. 판단 기준 정리",
  "3. 선택지 비교",
  "4. 리스크 검토",
  "5. 추천 및 주의사항",
];

export function SimulatorFlowInfo({
  compact = false,
  onOpen,
}: {
  compact?: boolean;
  onOpen?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  function handleOpen() {
    if (onOpen) {
      onOpen();
      return;
    }

    setIsOpen(true);
  }

  return (
    <>
      <SimulatorFlowInfoButton compact={compact} onOpen={handleOpen} />
      {onOpen ? null : (
        <SimulatorFlowInfoModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

function SimulatorFlowInfoButton({
  compact,
  onOpen,
}: {
  compact: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={[
        "inline-flex w-fit items-center gap-2 rounded-full border border-slate-900/10 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900/20 hover:bg-white hover:text-slate-950",
        compact ? "" : "mt-5",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white"
      >
        i
      </span>
      {compact ? "도움말" : "어떻게 판단하나요? 알아보기"}
    </button>
  );
}

export function SimulatorFlowInfoModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
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

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 px-4 py-6"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="simulator-flow-title"
        className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-slate-900/10 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.24)] sm:p-7"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="section-label">Decision Simulator</p>
            <h2
              id="simulator-flow-title"
              className="display-font mt-2 text-2xl font-semibold text-slate-950"
            >
              판단 검토 방식
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-900/10 bg-slate-50 text-lg font-semibold leading-none text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            aria-label="닫기"
          >
            x
          </button>
        </div>

        <p className="mt-5 text-base leading-8 text-slate-700">
          사용자 상황과 두 가지 선택지를 바탕으로 판단 기준을 정리하고,
          선택지별 시나리오와 리스크를 비교한 뒤 추천과 유의사항을 함께
          제공합니다. 내부 실행 상세는 리포트의 고급 진단에서 필요할 때만
          확인할 수 있습니다.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {SIMULATOR_FLOW_STEPS.map((step) => (
            <span
              key={step}
              className="rounded-full border border-slate-900/8 bg-slate-50 px-3 py-1 text-sm text-slate-700"
            >
              {step}
            </span>
          ))}
        </div>
      </section>
    </div>,
    document.body,
  );
}
