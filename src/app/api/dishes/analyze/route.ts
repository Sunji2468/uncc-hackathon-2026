import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, handler, parseBody } from "@/lib/api";
import { getOrCreateUser } from "@/lib/user";
import { settingsFromUser } from "@/lib/settings";
import { isDemo } from "@/lib/demo";
import { DEMO_IDS, loadDemoDish } from "@/lib/fixtures";
import { plateThumbnail } from "@/lib/plate";
import { bodyTooLarge, imageSchema, mediaTypeSchema, sniffMediaType, thumbnailSchema } from "@/lib/images";
import { createSticker } from "@/lib/stickers";
import { analyzeDish } from "@/lib/ai/dish";
import { consumeAiCall } from "@/lib/ai/limit";
import { AiError } from "@/lib/ai/errors";

export const maxDuration = 60;

const bodySchema = z.union([
  z.object({ demoId: z.enum(DEMO_IDS) }),
  z.object({
    image: imageSchema,
    mediaType: mediaTypeSchema,
    thumbnail: thumbnailSchema,
    menuPriceCents: z.number().int().min(0).max(100_000).nullable().optional(),
  }),
]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const POST = handler(async (request: Request) => {
  if (bodyTooLarge(request)) {
    return apiError(413, "too_large", "That photo is too large. Please use one under 4 MB.");
  }
  const parsed = await parseBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;
  const user = await getOrCreateUser();
  const body = parsed.data;

  // Demo path: the sample dish buttons, or DEMO_MODE for every request. No AI call.
  if ("demoId" in body || (await isDemo())) {
    const demo = loadDemoDish("demoId" in body ? body.demoId : "cacio-e-pepe");
    await sleep(1500);
    const photo = "demoId" in body ? null : body;
    const stickerId = await createSticker({
      userId: user.id,
      kind: "DISH",
      title: demo.dish.dish_name,
      thumbnail: photo?.thumbnail ?? plateThumbnail(demo.colors[0], demo.colors[1]),
      recipe: demo.dish,
      menuPriceCents: photo?.menuPriceCents ?? demo.menuPriceCents,
    });
    return NextResponse.json({ stickerId });
  }

  if (sniffMediaType(body.image) !== body.mediaType) {
    return apiError(415, "bad_image", "Please use a JPG or PNG photo.");
  }

  try {
    await consumeAiCall(user.id);
    const dish = await analyzeDish(
      body.image,
      body.mediaType,
      body.menuPriceCents ?? null,
      settingsFromUser(user),
    );
    if (!dish.is_food) {
      return apiError(422, "not_food", "That does not look like food, so we did not make a sticker.");
    }
    const stickerId = await createSticker({
      userId: user.id,
      kind: "DISH",
      title: dish.dish_name,
      thumbnail: body.thumbnail,
      recipe: dish,
      menuPriceCents: body.menuPriceCents ?? null,
    });
    return NextResponse.json({ stickerId });
  } catch (err) {
    if (err instanceof AiError) return apiError(err.status, err.code, err.message);
    throw err;
  }
});
