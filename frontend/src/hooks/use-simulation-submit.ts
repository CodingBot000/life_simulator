import { useCallback, useEffect, useRef, useState } from "react";

import { runSimulation } from "@/lib/api/simulation";
import type { PriorityCatalog, PriorityLocale } from "@/lib/priorities";
import type {
  BuildPayloadOptions,
  FormState,
  OptionFollowupState,
} from "@/lib/simulation/form";
import { buildPayload, buildReevaluationPayload } from "@/lib/simulation/form";
import {
  applyProgressEvent,
  createInitialProgressState,
  type SimulationProgressState,
} from "@/lib/simulation/progress";
import {
  createSimulationResultVersion,
  nextSimulationIteration,
  type SimulationResultVersion,
} from "@/lib/simulation/result-version";
import type { SimulationResponse } from "@/lib/types";

export type SimulationSubmitOptions = BuildPayloadOptions;

export function useSimulationSubmit() {
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [versions, setVersions] = useState<SimulationResultVersion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<SimulationProgressState>(() =>
    createInitialProgressState(),
  );
  const abortControllerRef = useRef<AbortController | null>(null);

  const resetOutput = useCallback(() => {
    setResult(null);
    setVersions([]);
    setError(null);
  }, []);

  const resetProgress = useCallback(() => {
    setProgress(createInitialProgressState());
  }, []);

  const submit = useCallback(async (
    form: FormState,
    locale: PriorityLocale,
    priorityCatalog?: PriorityCatalog | null,
    options?: SimulationSubmitOptions,
  ) => {
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setVersions([]);
    setProgress(createInitialProgressState());

    try {
      const request = buildPayload(form, priorityCatalog, options);
      const nextResult = await runSimulation(request, {
        locale,
        signal: controller.signal,
        onProgressEvent: (progressEvent) => {
          setProgress((current) => applyProgressEvent(current, progressEvent));
        },
      });
      const nextVersion = createSimulationResultVersion(request, nextResult, 1);

      setResult(nextResult);
      setVersions([nextVersion]);
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

  const submitReevaluation = useCallback(async (
    baseVersion: SimulationResultVersion,
    followup: OptionFollowupState,
    locale: PriorityLocale,
  ) => {
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const iteration = nextSimulationIteration(versions);
    const request = buildReevaluationPayload(
      baseVersion.request,
      followup,
      iteration,
      baseVersion.response.request_id,
    );

    setIsLoading(true);
    setError(null);
    setProgress(createInitialProgressState());

    try {
      const nextResult = await runSimulation(request, {
        locale,
        signal: controller.signal,
        onProgressEvent: (progressEvent) => {
          setProgress((current) => applyProgressEvent(current, progressEvent));
        },
      });
      const nextVersion = createSimulationResultVersion(
        request,
        nextResult,
        iteration,
        baseVersion.id,
      );

      setResult(nextResult);
      setVersions((current) => [...current, nextVersion]);
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
  }, [versions]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const latestVersion =
    versions.length > 0 ? versions[versions.length - 1] : null;

  return {
    result,
    versions,
    latestVersion,
    error,
    isLoading,
    progress,
    submit,
    submitReevaluation,
    resetOutput,
    resetProgress,
  };
}
