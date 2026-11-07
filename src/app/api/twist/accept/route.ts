import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiError, handler, parseBody } from "@/lib/api";
import { getOrCreateUser } from "@/lib/user";
import { verifyPayload } from "@/lib/sign";
import { isValidDay } from "@/lib/day";
import { oneServing } from "@/lib/twist";
import { plateThumbnail } from "@/lib/plate";
import type { TwistTokenPayload } from "@/types";

const bodySchema = z.object({
  // Only the signed token is trusted; any numbers sent alongside it are ignored.
  draft: z.object({ token: z.string().min(10).max(20_000) }).passthrough(),
  day: z.string().refine(isValidDay, "day must be a date like 2026-11-07"),
});

export const POST = handler(async (request: Request) => {
  const parsed = await parseBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;
  const t = verifyPayload<TwistTokenPayload>(parsed.data.draft.token);
  if (!t) return apiError(409, "stale_twist", "This suggestion has expired. Please ask for another.");

  const user = await getOrCreateUser();
  const macros = oneServing(t.ingredients); // recomputed server-side from the signed rows

  const result = await prisma.$transaction(async (tx) => {
    const sticker = await tx.sticker.create({
      data: {
        userId: user.id,
        kind: "TWIST",
        title: t.title,
        thumbnail: plateThumbnail("#FFD54A", "#FF5A36"),
        totalMinutes: t.totalMinutes,
        servings: 1,
        confidence: t.confidence,
        assumptions: t.assumptions,
        steps: t.steps,
        ingredients: {
          create: t.ingredients.map((ing, position) => ({
            position,
            name: ing.name,
            gramsPerServing: ing.gramsPerServing,
            category: ing.category,
            usdaQuery: ing.usdaQuery,
            fdcId: ing.fdcId,
            kcalPer100g: ing.kcalPer100g,
            proteinPer100g: ing.proteinPer100g,
            source: ing.source,
          })),
        },
      },
      select: { id: true },
    });
    const meal = await tx.mealLog.create({
      data: { userId: user.id, stickerId: sticker.id, name: t.title, ...macros, day: parsed.data.day },
      select: { id: true, stickerId: true, name: true, kcal: true, proteinG: true, day: true, createdAt: true },
    });
    return { stickerId: sticker.id, meal };
  });

  return NextResponse.json(result);
});
