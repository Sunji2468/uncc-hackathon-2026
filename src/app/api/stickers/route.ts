import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { getOrCreateUser } from "@/lib/user";
import { listStickerSummaries } from "@/lib/stickers";

export const GET = handler(async () => {
  const user = await getOrCreateUser();
  return NextResponse.json({ stickers: await listStickerSummaries(user.id) });
});
