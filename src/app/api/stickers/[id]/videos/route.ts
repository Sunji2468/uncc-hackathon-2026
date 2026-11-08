import { NextResponse } from "next/server";
import { handler, apiError } from "@/lib/api";
import { getOrCreateUser } from "@/lib/user";
import { loadSticker } from "@/lib/stickers";
import { tooManyAttempts } from "@/lib/auth";
import { findRecipeVideos, YouTubeError } from "@/lib/youtube";

export const GET = handler(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const user = await getOrCreateUser();
  const sticker = await loadSticker(id, user.id);
  if (!sticker || sticker.kind !== "MYSTERY") return apiError(404, "not_found", "Mystery recipe not found.");
  if (tooManyAttempts(`youtube:${user.id}`, 20, 60 * 60_000)) {
    return apiError(429, "rate_limited", "Please try video recommendations again later.");
  }
  try {
    return NextResponse.json({ videos: await findRecipeVideos(sticker.title) });
  } catch (error) {
    if (error instanceof YouTubeError) return apiError(503, error.code, error.message);
    throw error;
  }
});
