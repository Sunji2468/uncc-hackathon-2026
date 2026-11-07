import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiError, handler, parseBody } from "@/lib/api";
import { getOrCreateUser } from "@/lib/user";
import { loadStickerView } from "@/lib/stickers";
import { LIMITS } from "@/lib/ai/schemas";

type Ctx = { params: Promise<{ id: string; ingId: string }> };

const bodySchema = z.object({
  gramsPerServing: z.number().min(0.5).max(LIMITS.maxGrams),
});

export const PATCH = handler(async (request: Request, { params }: Ctx) => {
  const { id, ingId } = await params;
  const user = await getOrCreateUser();
  const parsed = await parseBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;

  // Scoped through the sticker so nobody can edit another user's ingredient.
  const { count } = await prisma.ingredient.updateMany({
    where: { id: ingId, stickerId: id, sticker: { userId: user.id } },
    data: { gramsPerServing: Math.round(parsed.data.gramsPerServing * 10) / 10 },
  });
  if (count === 0) return apiError(404, "not_found", "That ingredient does not exist.");
  return NextResponse.json(await loadStickerView(id, user.id));
});
