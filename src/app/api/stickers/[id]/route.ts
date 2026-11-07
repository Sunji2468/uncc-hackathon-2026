import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiError, handler, parseBody } from "@/lib/api";
import { getOrCreateUser } from "@/lib/user";
import { loadStickerView } from "@/lib/stickers";
import { MAX_SERVINGS, MIN_SERVINGS } from "@/lib/sticker-view";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z
  .object({
    servings: z.number().int().min(MIN_SERVINGS).max(MAX_SERVINGS).optional(),
    menuPriceCents: z.number().int().min(0).max(100_000).nullable().optional(),
    title: z.string().trim().min(1).max(80).optional(),
  })
  .refine((b) => Object.keys(b).length > 0, "Nothing to update.");

const notFound = () => apiError(404, "not_found", "That sticker does not exist.");

export const GET = handler(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const user = await getOrCreateUser();
  const view = await loadStickerView(id, user.id);
  return view ? NextResponse.json(view) : notFound();
});

export const PATCH = handler(async (request: Request, { params }: Ctx) => {
  const { id } = await params;
  const user = await getOrCreateUser();
  const parsed = await parseBody(request, patchSchema);
  if (!parsed.ok) return parsed.response;

  const { count } = await prisma.sticker.updateMany({ where: { id, userId: user.id }, data: parsed.data });
  if (count === 0) return notFound();
  return NextResponse.json(await loadStickerView(id, user.id));
});

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const user = await getOrCreateUser();
  const { count } = await prisma.sticker.deleteMany({ where: { id, userId: user.id } });
  return count === 0 ? notFound() : NextResponse.json({ deleted: true });
});
