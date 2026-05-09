import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { InputField } from "@/components/simulation/shared";
import type { OptionFollowupState } from "@/lib/simulation/form";
import type { SimulationRequest } from "@/lib/types";

type FollowupReevaluationPanelProps = {
  request: SimulationRequest;
  versionLabel: string;
  disabled?: boolean;
  onSubmit: (followup: OptionFollowupState) => Promise<void> | void;
};

export function FollowupReevaluationPanel({
  request,
  versionLabel,
  disabled = false,
  onSubmit,
}: FollowupReevaluationPanelProps) {
  const [followup, setFollowup] = useState<OptionFollowupState>(() =>
    followupFromRequest(request),
  );

  useEffect(() => {
    setFollowup(followupFromRequest(request));
  }, [request]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(followup);
  }

  function updateFollowup(
    option: keyof OptionFollowupState,
    field: keyof OptionFollowupState["A"],
    value: string,
  ) {
    setFollowup((current) => ({
      ...current,
      [option]: {
        ...current[option],
        [field]: value,
      },
    }));
  }

  return (
    <section className="card-surface-strong rounded-[32px] p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="section-label">Follow-up Re-evaluation</p>
          <h3 className="display-font mt-2 text-2xl font-semibold text-slate-950">
            결과를 더 정확하게 만들기
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            {versionLabel} 결과를 기준으로 기본 정보는 그대로 승계하고, 각
            선택지의 최악의 경우와 되돌릴 수 있는 조건만 추가해 전체 판단을
            다시 실행합니다.
          </p>
        </div>
        <span className="w-fit rounded-full border border-slate-900/10 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
          full rerun
        </span>
      </div>

      <form className="mt-5 grid gap-5" onSubmit={handleSubmit}>
        <OptionFollowupFields
          label="A"
          optionTitle={request.decision.optionA}
          value={followup.A}
          disabled={disabled}
          onChange={(field, value) => updateFollowup("A", field, value)}
        />
        <OptionFollowupFields
          label="B"
          optionTitle={request.decision.optionB}
          value={followup.B}
          disabled={disabled}
          onChange={(field, value) => updateFollowup("B", field, value)}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-7 text-slate-500">
            일부 항목을 비워도 재평가는 가능합니다. 비어 있는 정보는 낮은
            신뢰도 또는 추가 확인 사항으로 반영됩니다.
          </p>
          <button
            type="submit"
            disabled={disabled}
            className="inline-flex min-w-[220px] items-center justify-center rounded-full bg-amber-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {disabled ? "재평가 실행 중..." : "이 정보로 다시 평가하기"}
          </button>
        </div>
      </form>
    </section>
  );
}

function OptionFollowupFields({
  label,
  optionTitle,
  value,
  disabled,
  onChange,
}: {
  label: keyof OptionFollowupState;
  optionTitle: string;
  value: OptionFollowupState["A"];
  disabled: boolean;
  onChange: (field: keyof OptionFollowupState["A"], value: string) => void;
}) {
  return (
    <div className="grid gap-4 rounded-[28px] border border-slate-900/8 bg-white/70 p-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          Option {label}
        </p>
        <h4 className="mt-1 text-lg font-semibold text-slate-950">
          {optionTitle}
        </h4>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <InputField label={`${label}안의 최악의 경우`}>
          <textarea
            rows={4}
            value={value.worstCase}
            disabled={disabled}
            onChange={(event) => onChange("worstCase", event.target.value)}
            className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </InputField>

        <InputField label={`${label}안을 되돌릴 수 있는 조건`}>
          <textarea
            rows={4}
            value={value.rollbackCondition}
            disabled={disabled}
            onChange={(event) =>
              onChange("rollbackCondition", event.target.value)
            }
            className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-500/10 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </InputField>
      </div>
    </div>
  );
}

function followupFromRequest(request: SimulationRequest): OptionFollowupState {
  return {
    A: {
      worstCase: request.decision.optionDetails?.A?.worstCase ?? "",
      rollbackCondition:
        request.decision.optionDetails?.A?.rollbackCondition ?? "",
    },
    B: {
      worstCase: request.decision.optionDetails?.B?.worstCase ?? "",
      rollbackCondition:
        request.decision.optionDetails?.B?.rollbackCondition ?? "",
    },
  };
}
