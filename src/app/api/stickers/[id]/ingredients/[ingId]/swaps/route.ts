import { NextResponse } from "next/server";
import { apiError, handler } from "@/lib/api";
import { getOrCreateUser } from "@/lib/user";
import { settingsFromUser } from "@/lib/settings";
import { loadSticker, resolveIngredient } from "@/lib/stickers";
import { describeDelta, swapDelta } from "@/lib/swaps";
import { signPayload } from "@/lib/sign";
import { suggestSwaps } from "@/lib/ai/swaps";
import { consumeAiCall } from "@/lib/ai/limit";
import { AiError } from "@/lib/ai/errors";
import { isDemo, demoDelay } from "@/lib/demo";
import { demoSwaps } from "@/lib/demo-ai";

export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string; ingId: string }> };

export interface SwapToken {
  sid: string;
  iid: string;
  name: string;
  category: string;
  usdaQuery: string;
  kcalEst: number;
  proteinEst: number;
}

export const GET = handler(async (_req: Request, { params }: Ctx) => {
  const { id, ingId } = await params;
  const user = await getOrCreateUser();
  const sticker = await loadSticker(id, user.id);
  const current = sticker?.ingredients.find((i) => i.id === ingId);
  if (!sticker || !current) return apiError(404, "not_found", "That ingredient does not exist.");

  try {
    const settings = settingsFromUser(user);
    let raw;
    if (await isDemo()) {
      await demoDelay(600);
      raw = demoSwaps(current, settings);
    } else {
      await consumeAiCall(user.id);
      raw = await suggestSwaps(
        sticker.title,
        current,
        sticker.ingredients.filter((i) => i.id !== ingId).map((i) => i.name),
        settings,
      );
    }

    const swaps = await Promise.all(
      raw.map(async (w) => {
        const resolved = await resolveIngredient(w.name, w.usda_query, {
          kcalPer100g: w.kcal_per_100g_estimate,
          proteinPer100g: w.protein_per_100g_estimate,
        });
        const delta = swapDelta(current, { name: w.name, category: w.category, ...resolved });
        const token: SwapToken = {
          sid: id,
          iid: ingId,
          name: w.name.trim(),
          category: w.category,
          usdaQuery: w.usda_query.trim(),
          kcalEst: w.kcal_per_100g_estimate,
          proteinEst: w.protein_per_100g_estimate,
        };
        return {
          name: token.name,
          category: token.category,
          usdaQuery: token.usdaQuery,
          source: resolved.source,
          delta,
          description: describeDelta(delta),
          token: signPayload(token, 60 * 60),
        };
      }),
    );
    return NextResponse.json({ swaps });
  } catch (err) {
    if (err instanceof AiError) return apiError(err.status, err.code, err.message);
    throw err;
  }
});
