import { useCallback, useEffect, useRef, useState } from "react";

import { fetchRecommendations } from "@/lib/api/recommendations";
import type { PriorityLocale } from "@/lib/priorities";
import type {
  RecommendationResponse,
} from "@/lib/recommendations/types";
import type { SimulationRequest, SimulationResponse } from "@/lib/types";

export type RecommendationLoadState = "idle" | "loading" | "success" | "empty" | "error";

export function recommendationsEnabled() {
  return import.meta.env.VITE_RECOMMENDATIONS_ENABLED !== "false";
}

function recommendationProviders() {
  return String(import.meta.env.VITE_RECOMMENDATION_PROVIDERS ?? "catalog")
    .split(",")
    .map((provider) => provider.trim())
    .filter(Boolean);
}

export function useRecommendations(params: {
  request: SimulationRequest;
  response: SimulationResponse;
  locale: PriorityLocale;
}) {
  const [state, setState] = useState<RecommendationLoadState>("idle");
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setState("loading");
    setError(null);

    try {
      const result = await fetchRecommendations(
        {
          request_id: params.response.request_id,
          locale: params.locale,
          case_input: params.request,
          simulation_response: params.response,
          max_items: 6,
          enabled_providers: recommendationProviders(),
        },
        { signal: controller.signal },
      );

      setData(result);
      setState(result.items.length > 0 ? "success" : "empty");
    } catch (loadError) {
      if (controller.signal.aborted) {
        return;
      }
      setState("error");
      setError(
        loadError instanceof Error
          ? loadError.message
          : "추천을 불러오지 못했습니다.",
      );
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [params.locale, params.request, params.response]);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setState("idle");
    setData(null);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    reset();
  }, [params.response.request_id, reset]);

  return {
    state,
    data,
    error,
    load,
  };
}
