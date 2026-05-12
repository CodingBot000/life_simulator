import { useEffect, useState } from "react";

import type { RecommendationItem } from "@/lib/recommendations/types";

export function RecommendationCard({ item }: { item: RecommendationItem }) {
  const youtubeVideoId = youtubeVideoIdFromUrl(item.url);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setPlaying(false);
  }, [item.url]);

  return (
    <article className="rounded-2xl border border-slate-900/10 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {item.image_url ? (
          <RecommendationImagePreview imageUrl={item.image_url} title={item.title} />
        ) : null}
        <div className="min-w-0 flex-1">
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
        </div>
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
        {youtubeVideoId ? (
          <button
            type="button"
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-slate-900/10 bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-50"
            onClick={() => setPlaying((current) => !current)}
          >
            {playing ? "Close" : "Play"}
          </button>
        ) : null}
      </div>
      {youtubeVideoId && playing ? (
        <div className="mt-4 aspect-video min-h-[200px] overflow-hidden rounded-lg border border-slate-900/10 bg-slate-950">
          <iframe
            src={youtubeEmbedUrl(youtubeVideoId)}
            title={`${item.title} video player`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      ) : null}
    </article>
  );
}

function RecommendationImagePreview({
  imageUrl,
  title,
}: {
  imageUrl: string;
  title: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  return (
    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-900/10 bg-slate-50 text-center text-[11px] font-medium leading-4 text-slate-500">
      {failed ? (
        <span className="px-2">Image load failed</span>
      ) : (
        <img
          src={imageUrl}
          alt={`${title} preview`}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
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

function youtubeVideoIdFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host.endsWith("youtu.be")) {
      return validVideoId(parsed.pathname.replace(/^\/+/, "").split("/")[0]);
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      if (parsed.pathname.startsWith("/embed/")) {
        return validVideoId(parsed.pathname.replace("/embed/", "").split("/")[0]);
      }
      return validVideoId(parsed.searchParams.get("v") ?? "");
    }
  } catch {
    return null;
  }
  return null;
}

function validVideoId(value: string) {
  return /^[A-Za-z0-9_-]{11}$/.test(value) ? value : null;
}

function youtubeEmbedUrl(videoId: string) {
  return `https://www.youtube.com/embed/${videoId}`;
}
