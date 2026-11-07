import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiError, handler, parseBody } from "@/lib/api";
import { getOrCreateUser } from "@/lib/user";
import { loadSticker, loadStickerView, resolveIngredient } from "@/lib/stickers";
import { verifyPayload } from "@/lib/sign";
import { PRICE_CATEGORIES } from "@/lib/prices";
import type { SwapToken } from "../swaps/route";

type Ctx = { params: Promise<{ id: string; ingId: string }> };

const bodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  category: z.enum(PRICE_CATEGORIES),
  usdaQuery: z.string().trim().max(120),
  /** Issued by GET .../swaps; proves this is one of our suggestions and carries its estimates. */
  token: z.string().min(10).max(2000),
});

export const POST = handler(async (request: Request, { params }: Ctx) => {
  const { id, ingId } = await params;
  const user = await getOrCreateUser();
  const parsed = await parseBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const t = verifyPayload<SwapToken>(body.token);
  if (!t || t.sid !== id || t.iid !== ingId || t.name !== body.name || t.category !== body.category || t.usdaQuery !== body.usdaQuery) {
    return apiError(409, "stale_swap", "These suggestions have expired. Please load swaps again.");
  }

  const sticker = await loadSticker(id, user.id);
  if (!sticker?.ingredients.some((i) => i.id === ingId)) {
    return apiError(404, "not_found", "That ingredient does not exist.");
  }

  const resolved = await resolveIngredient(t.name, t.usdaQuery, {
    kcalPer100g: t.kcalEst,
    proteinPer100g: t.proteinEst,
  });
  await prisma.ingredient.update({
    where: { id: ingId },
    data: {
      name: t.name,
      category: t.category,
      usdaQuery: t.usdaQuery || null,
      fdcId: resolved.fdcId,
      kcalPer100g: resolved.kcalPer100g,
      proteinPer100g: resolved.proteinPer100g,
      source: resolved.source,
    },
  });
  return NextResponse.json(await loadStickerView(id, user.id));
});
