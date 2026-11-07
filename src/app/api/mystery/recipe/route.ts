import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiError, handler, parseBody } from "@/lib/api";
import { getOrCreateUser } from "@/lib/user";
import { settingsFromUser } from "@/lib/settings";
import { thumbnailSchema } from "@/lib/images";
import { plateThumbnail } from "@/lib/plate";
import { MAX_MYSTERY_ITEMS, TIME_LIMITS, normalizeItems } from "@/lib/mystery";
import { createSticker } from "@/lib/stickers";
import { mysteryRecipe } from "@/lib/ai/mystery";
import { consumeAiCall } from "@/lib/ai/limit";
import { AiError } from "@/lib/ai/errors";
import { isDemo, demoDelay } from "@/lib/demo";
import { demoMysteryRecipe } from "@/lib/demo-ai";

export const maxDuration = 60;

const bodySchema = z.object({
  ingredients: z.array(z.string().trim().min(1).max(40)).min(1).max(MAX_MYSTERY_ITEMS),
  timeLimitMin: z.union(TIME_LIMITS.map((t) => z.literal(t)) as [z.ZodLiteral<15>, z.ZodLiteral<30>, z.ZodLiteral<60>]),
  /** Optional: you can type ingredients without a photo. */
  thumbnail: thumbnailSchema.optional(),
  /** A draft Mystery sticker from this session to replace (when the dial is turned). */
  replaceStickerId: z.string().max(40).optional(),
});

export const POST = handler(async (request: Request) => {
  const parsed = await parseBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const listed = normalizeItems(body.ingredients);
  const user = await getOrCreateUser();

  try {
    const settings = settingsFromUser(user);
    let recipe;
    if (await isDemo()) {
      await demoDelay();
      recipe = demoMysteryRecipe(listed, body.timeLimitMin, settings);
    } else {
      await consumeAiCall(user.id);
      recipe = await mysteryRecipe(listed, body.timeLimitMin, settings);
    }
    const stickerId = await createSticker({
      userId: user.id,
      kind: "MYSTERY",
      title: recipe.title,
      thumbnail: body.thumbnail ?? plateThumbnail("#12201B", "#FFD54A"),
      recipe,
      timeLimitMin: body.timeLimitMin,
    });
    if (body.replaceStickerId) {
      // Only ever removes this user's own Mystery stickers.
      await prisma.sticker.deleteMany({ where: { id: body.replaceStickerId, userId: user.id, kind: "MYSTERY" } });
    }
    return NextResponse.json({ stickerId });
  } catch (err) {
    if (err instanceof AiError && err.code === "invalid_response") {
      return apiError(
        422,
        "recipe_rules",
        `We could not make a good recipe from only those ingredients in ${body.timeLimitMin} minutes. Try adding an ingredient or more time.`,
      );
    }
    if (err instanceof AiError) return apiError(err.status, err.code, err.message);
    throw err;
  }
});
