import type { RecommendationItem } from "@/lib/recommendations/types";

export function RecommendationCard({ item }: { item: RecommendationItem }) {
  return (
    <article className="rounded-2xl border border-slate-900/10 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-900/10 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase text-slate-500">
              {labelForType(item.type)}
            </span>
            {item.is_affiliate || item.sponsored ? (
              <span className="rounded-full border border-amber-900/10 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                제휴
              </span>
            ) : null}
          </div>
          <h4 className="mt-3 line-clamp-2 text-base font-semibold leading-6 text-slate-950">
            {item.title}
          </h4>
        </div>
        <span className="shrink-0 rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-semibold text-white">
          {Math.round(item.rank_score * 100)}
        </span>
      </div>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
        {item.description}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-700">{item.why}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 text-xs text-slate-500">
          {item.creator_name ? <span>{item.creator_name}</span> : null}
          {item.price_label ? (
            <span className={item.creator_name ? "before:px-1 before:content-['/']" : ""}>
              {item.price_label}
            </span>
          ) : null}
        </div>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          열기
        </a>
      </div>
    </article>
  );
}

function labelForType(type: string) {
  switch (type) {
    case "book":
      return "Book";
    case "youtube_channel":
      return "Channel";
    case "youtube_video":
      return "Video";
    case "course":
      return "Course";
    case "template":
      return "Template";
    case "product":
      return "Product";
    case "service":
      return "Service";
    default:
      return type || "Item";
  }
}
