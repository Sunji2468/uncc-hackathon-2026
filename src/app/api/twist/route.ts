import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, handler, parseBody } from "@/lib/api";
import { getOrCreateUser } from "@/lib/user";
import { settingsFromUser } from "@/lib/settings";
import { resolveRecipeIngredients } from "@/lib/stickers";
import { rescaleToTarget, twistTarget, TWIST_MIN_KCAL } from "@/lib/twist";
import { homeCostCents } from "@/lib/prices";
import { signPayload } from "@/lib/sign";
import { smartTwist } from "@/lib/ai/twist";
import { consumeAiCall } from "@/lib/ai/limit";
import { AiError } from "@/lib/ai/errors";
import { isDemo, demoDelay } from "@/lib/demo";
import { demoTwist } from "@/lib/demo-ai";
import type { TwistDraft, TwistTokenPayload } from "@/types";

export const maxDuration = 60;

const bodySchema = z.object({
  remainingKcal: z.number().int().min(-20_000).max(20_000),
  remainingProteinG: z.number().int().min(-2_000).max(2_000),
  /** Titles already shown, so "Show another" gives something new. */
  avoid: z.array(z.string().max(80)).max(10).optional(),
});

export const POST = handler(async (request: Request) => {
  const parsed = await parseBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;
  const { remainingKcal, remainingProteinG, avoid = [] } = parsed.data;
  if (remainingKcal < TWIST_MIN_KCAL) {
    return apiError(422, "not_enough_left", `A twist needs at least ${TWIST_MIN_KCAL} kcal left today.`);
  }
  const targetKcal = twistTarget(remainingKcal);
  const targetProteinG = Math.max(0, remainingProteinG);
  const user = await getOrCreateUser();

  try {
    const settings = settingsFromUser(user);
    let recipe;
    if (await isDemo()) {
      await demoDelay();
      recipe = demoTwist(avoid, settings);
    } else {
      await consumeAiCall(user.id);
      recipe = await smartTwist(targetKcal, targetProteinG, avoid, settings);
    }
    // Recompute from database nutrition and resize; the model's macro guesses are never shown.
    const rows = await resolveRecipeIngredients(recipe);
    const scaled = rescaleToTarget(rows, targetKcal);

    const payload: TwistTokenPayload = {
      title: recipe.title.trim().slice(0, 80),
      totalMinutes: Math.round(recipe.total_minutes),
      confidence: recipe.confidence,
      assumptions: recipe.assumptions.trim(),
      steps: recipe.steps.map((s) => s.trim()),
      ingredients: scaled.ingredients,
      targetKcal,
    };
    const draft: TwistDraft = {
      ...payload,
      targetProteinG,
      kcal: Math.round(scaled.kcal),
      proteinG: Math.round(scaled.proteinG),
      homeCostCents: homeCostCents(scaled.ingredients, 1),
      rescaled: scaled.factor !== 1,
      token: signPayload(payload, 2 * 60 * 60),
    };
    return NextResponse.json({ draft });
  } catch (err) {
    if (err instanceof AiError) return apiError(err.status, err.code, err.message);
    throw err;
  }
});
