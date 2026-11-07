import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiError, handler, parseBody } from "@/lib/api";
import { getOrCreateUser } from "@/lib/user";
import { loadSticker } from "@/lib/stickers";
import { homeCostCents } from "@/lib/prices";
import { parseSort } from "@/lib/fridge";
import { fridgePost, listFridge } from "@/lib/fridge-server";

export const GET = handler(async (request: Request) => {
  const user = await getOrCreateUser();
  const sort = parseSort(new URL(request.url).searchParams.get("sort"));
  return NextResponse.json({ posts: await listFridge(user.id, sort) });
});

const postSchema = z.object({ stickerId: z.string().min(1).max(40) });

/** Snapshots a sticker into a post. Prices are recomputed here, never taken from the client. */
export const POST = handler(async (request: Request) => {
  const parsed = await parseBody(request, postSchema);
  if (!parsed.ok) return parsed.response;
  const user = await getOrCreateUser();
  const sticker = await loadSticker(parsed.data.stickerId, user.id);
  if (!sticker) return apiError(404, "not_found", "That sticker does not exist.");
  if (sticker.menuPriceCents == null) {
    return apiError(422, "no_menu_price", "Add the menu price first, so the Fridge can show what you kept.");
  }

  const existing = await prisma.fridgePost.findFirst({ where: { userId: user.id, stickerId: sticker.id }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ post: await fridgePost(existing.id, user.id), alreadyShared: true });
  }
  const created = await prisma.fridgePost.create({
    data: {
      userId: user.id,
      stickerId: sticker.id,
      title: sticker.title,
      thumbnail: sticker.thumbnail,
      menuPriceCents: sticker.menuPriceCents,
      homeCostCents: homeCostCents(sticker.ingredients, 1),
    },
    select: { id: true },
  });
  return NextResponse.json({ post: await fridgePost(created.id, user.id), alreadyShared: false }, { status: 201 });
});
