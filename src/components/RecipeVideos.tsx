"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { fetchJson } from "@/lib/client/fetch-json";
import type { RecipeVideo } from "@/lib/youtube";

export function RecipeVideos({ stickerId, light = false }: { stickerId: string; light?: boolean }) {
  const [videos, setVideos] = useState<RecipeVideo[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    fetchJson<{ videos: RecipeVideo[] }>(`/api/stickers/${stickerId}/videos`, { signal: controller.signal })
      .then((data) => { if (active) setVideos(data.videos); })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Videos could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [stickerId, retry]);

  return (
    <section className={`mt-5 rounded-2xl border-2 p-4 ${light ? "border-chip text-sticker-ink" : "border-line bg-panel text-ink"}`} aria-label="Related YouTube videos">
      <h3 className="flex items-center gap-2 text-xl font-bold"><Play aria-hidden="true" /> Cook along on YouTube</h3>
      <p className={`mt-2 text-sm ${light ? "text-sticker-muted" : "text-muted"}`}>Related recipes for inspiration. Ingredients and cooking times may differ.</p>
      <div aria-live="polite">
        {loading ? <p className="mt-3 text-sm">Finding recipe videos…</p> : error ? (
          <div className="mt-3 text-sm">
            <p>{error}</p>
            <button type="button" className="mt-2 min-h-11 underline" onClick={() => { setError(""); setLoading(true); setRetry((n) => n + 1); }}>Try again</button>
          </div>
        ) : videos.length === 0 ? <p className="mt-3 text-sm">No matching videos found for this recipe.</p> : (
          <div className="mt-4 grid gap-5">
            {videos.map((video) => (
              <article key={video.id}>
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${video.id}`}
                  title={video.title}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="aspect-video w-full rounded-xl border-0"
                />
                <a className="mt-2 block font-bold underline" href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer">{video.title}</a>
                <p className="mt-1 text-sm">{video.channel} · YouTube</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
