import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, handler, parseBody } from "@/lib/api";
import { getOrCreateUser } from "@/lib/user";
import { isDemo, demoDelay } from "@/lib/demo";
import { bodyTooLarge, imageSchema, mediaTypeSchema, sniffMediaType } from "@/lib/images";
import { normalizeItems } from "@/lib/mystery";
import { detectIngredients } from "@/lib/ai/mystery";
import { consumeAiCall } from "@/lib/ai/limit";
import { AiError } from "@/lib/ai/errors";

export const maxDuration = 60;

const bodySchema = z.object({ image: imageSchema, mediaType: mediaTypeSchema });

const DEMO_INGREDIENTS = ["Eggs", "Cooked rice", "Scallions", "Tomatoes"];

export const POST = handler(async (request: Request) => {
  if (bodyTooLarge(request)) return apiError(413, "too_large", "That photo is too large. Please use one under 4 MB.");
  const parsed = await parseBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;
  const { image, mediaType } = parsed.data;
  if (sniffMediaType(image) !== mediaType) return apiError(415, "bad_image", "Please use a JPG or PNG photo.");

  if (await isDemo()) {
    await demoDelay();
    return NextResponse.json({ ingredients: DEMO_INGREDIENTS });
  }

  const user = await getOrCreateUser();
  try {
    await consumeAiCall(user.id);
    const ingredients = normalizeItems(await detectIngredients(image, mediaType));
    return NextResponse.json({ ingredients });
  } catch (err) {
    if (err instanceof AiError) return apiError(err.status, err.code, err.message);
    throw err;
  }
});
