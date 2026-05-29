import { useEffect, useState } from "react";

const SIMULATOR_FLOW_STEPS = [
  "1. State Loader",
  "2. Planner",
  "3. Scenario A",
  "4. Scenario B",
  "5. Risk A",
  "6. Risk B",
  "7. A/B Reasoning",
  "8. Guardrail",
  "9. Advisor",
  "10. Reflection",
];

export function SimulatorFlowInfo() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-slate-900/10 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900/20 hover:bg-white hover:text-slate-950"
      >
        <span
          aria-hidden="true"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white"
        >
          i
        </span>
        어떻게 동작하나요? 알아보기
      </button>

      {isOpen ? (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6"
          onMouseDown={() => setIsOpen(false)}
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
                  의사결정 시뮬레이션 동작 방식
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-900/10 bg-slate-50 text-lg font-semibold leading-none text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                aria-label="닫기"
              >
                x
              </button>
            </div>

            <p className="mt-5 text-base leading-8 text-slate-700">
              사용자 프로필과 두 가지 선택지를 입력하면 State Loader가 먼저
              사용자 상태를 구조화하고, 이어서 Planner, Scenario, Risk, A/B
              Reasoning, Guardrail, Advisor, Reflection 단계가 그 상태를
              공통으로 사용합니다. 실제 실행 경로는 요청 위험도에 따라
              `light`, `standard`, `careful`, `full` 중 하나로 선택됩니다.
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
        </div>
      ) : null}
    </>
  );
}
