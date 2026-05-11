import { RecommendationCard } from "@/components/simulation/recommendation-card";
import {
  recommendationsEnabled,
  useRecommendations,
} from "@/hooks/use-recommendations";
import type { PriorityLocale } from "@/lib/priorities";
import type { SimulationRequest, SimulationResponse } from "@/lib/types";

export function RecommendationPanel({
  request,
  response,
  locale,
}: {
  request: SimulationRequest;
  response: SimulationResponse;
  locale: PriorityLocale;
}) {
  const enabled = recommendationsEnabled();
  const recommendations = useRecommendations({ request, response, locale });

  if (!enabled) {
    return null;
  }

  return (
    <section className="recommendation-surface rounded-[28px] p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="section-label">Recommendations</p>
          <h3 className="display-font mt-2 text-xl font-semibold text-slate-900">
            결과 기반 추천
          </h3>
        </div>
        <button
          type="button"
          disabled={recommendations.state === "loading"}
          onClick={() => void recommendations.load()}
          className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {recommendations.state === "loading" ? "불러오는 중" : "추천 보기"}
        </button>
      </div>

      {recommendations.state === "idle" ? (
        <p className="mt-4 text-sm leading-7 text-slate-600">
          결과를 실행으로 옮길 때 참고할 만한 자료를 확인해보세요.
        </p>
      ) : null}

      {recommendations.state === "loading" ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[0, 1].map((item) => (
            <div
              key={item}
              className="h-40 animate-pulse rounded-2xl border border-slate-900/10 bg-white"
            />
          ))}
        </div>
      ) : null}

      {recommendations.state === "error" ? (
        <p className="mt-4 rounded-2xl border border-rose-900/10 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {recommendations.error ?? "추천을 불러오지 못했습니다."}
        </p>
      ) : null}

      {recommendations.state === "empty" ? (
        <p className="mt-4 rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-600">
          현재 결과에 맞는 추천 항목이 없습니다.
        </p>
      ) : null}

      {recommendations.data ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="rounded-full border border-slate-900/10 bg-white px-3 py-1 font-semibold">
              {recommendations.data.disclosure.label}
            </span>
            <span>{recommendations.data.disclosure.text}</span>
          </div>
          {recommendations.data.items.length > 0 ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {recommendations.data.items.map((item) => (
                <RecommendationCard key={`${item.provider}:${item.id}`} item={item} />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
