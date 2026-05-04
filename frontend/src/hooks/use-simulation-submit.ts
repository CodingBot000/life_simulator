import { useCallback, useEffect, useRef, useState } from "react";

import { runSimulation } from "@/lib/api/simulation";
import type { PriorityLocale } from "@/lib/priorities";
import type { FormState } from "@/lib/simulation/form";
import { buildPayload } from "@/lib/simulation/form";
import {
  applyProgressEvent,
  createInitialProgressState,
  type SimulationProgressState,
} from "@/lib/simulation/progress";
import type { SimulationResponse } from "@/lib/types";

export function useSimulationSubmit() {
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<SimulationProgressState>(() =>
    createInitialProgressState(),
  );
  const abortControllerRef = useRef<AbortController | null>(null);

  const resetOutput = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const resetProgress = useCallback(() => {
    setProgress(createInitialProgressState());
  }, []);

  const submit = useCallback(async (form: FormState, locale: PriorityLocale) => {
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setProgress(createInitialProgressState());

    try {
      const nextResult = await runSimulation(buildPayload(form), {
        locale,
        signal: controller.signal,
        onProgressEvent: (progressEvent) => {
          setProgress((current) => applyProgressEvent(current, progressEvent));
        },
      });

      setResult(nextResult);
    } catch (submitError) {
      if (controller.signal.aborted) {
        return;
      }

      setError(
        submitError instanceof Error
          ? submitError.message
          : "알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }

      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    result,
    error,
    isLoading,
    progress,
    submit,
    resetOutput,
    resetProgress,
  };
}
