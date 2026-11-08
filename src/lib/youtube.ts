import "server-only";
import { z } from "zod";

export interface RecipeVideo {
  id: string;
  title: string;
  channel: string;
}

const responseSchema = z.object({
  items: z.array(z.object({
    id: z.object({ videoId: z.string().regex(/^[\w-]{11}$/) }),
    snippet: z.object({ title: z.string(), channelTitle: z.string() }),
  })),
});

export class YouTubeError extends Error {
  constructor(readonly code: "not_configured" | "unavailable") {
    super(code === "not_configured"
      ? "Video recommendations are not available yet."
      : "YouTube videos could not be loaded right now. Please try again later.");
  }
}

export async function findRecipeVideos(title: string): Promise<RecipeVideo[]> {
  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (!key) throw new YouTubeError("not_configured");
  const params = new URLSearchParams({
    part: "snippet", type: "video", maxResults: "3", order: "relevance",
    q: `${title} recipe cooking tutorial`, videoEmbeddable: "true",
    safeSearch: "strict", key,
  });
  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new YouTubeError("unavailable");
    const parsed = responseSchema.parse(await response.json());
    return parsed.items.map(({ id, snippet }) => ({
      id: id.videoId, title: snippet.title, channel: snippet.channelTitle,
    }));
  } catch {
    // Never expose provider responses or the URL containing the server API key.
    throw new YouTubeError("unavailable");
  }
}
