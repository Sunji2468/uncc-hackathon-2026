import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseBody } from "@/lib/api";
import { loadSticker } from "@/lib/stickers";
import { oneServing } from "@/lib/twist";
import { apiError, handler } from "@/lib/api";
import { getOrCreateUser } from "@/lib/user";
import { isValidDay } from "@/lib/day";
import { mealsForDay } from "@/lib/meals";

export const GET = handler(async (request: Request) => {
  const day = new URL(request.url).searchParams.get("day") ?? "";
  if (!isValidDay(day)) return apiError(400, "invalid_day", "day must be a date like 2026-11-07.");
  const user = await getOrCreateUser();
  const { meals, totals } = await mealsForDay(user.id, day);
  return NextResponse.json({
    day,
    meals,
    totals,
    goals: { calorieGoal: user.calorieGoal, proteinGoal: user.proteinGoal },
  });
});

const mealSelect = { id: true, stickerId: true, name: true, kcal: true, proteinG: true, day: true, createdAt: true } as const;

const postSchema = z.object({
  stickerId: z.string().max(40).optional(),
  name: z.string().trim().min(1).max(80),
  kcal: z.number().int().min(0).max(5000),
  proteinG: z.number().int().min(0).max(500),
  day: z.string().refine(isValidDay, "day must be a date like 2026-11-07"),
});

export const POST = handler(async (request: Request) => {
  const parsed = await parseBody(request, postSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const user = await getOrCreateUser();

  let data = { name: body.name, kcal: body.kcal, proteinG: body.proteinG, stickerId: null as string | null };
  if (body.stickerId) {
    // From a sticker: one serving, recomputed here. Client numbers are ignored.
    const sticker = await loadSticker(body.stickerId, user.id);
    if (!sticker) return apiError(404, "not_found", "That sticker does not exist.");
    data = { name: sticker.title, ...oneServing(sticker.ingredients), stickerId: sticker.id };
  }
  const meal = await prisma.mealLog.create({ data: { ...data, userId: user.id, day: body.day }, select: mealSelect });
  return NextResponse.json({ meal }, { status: 201 });
});
