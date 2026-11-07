import "server-only";
import type { UserSettings } from "@/types";
import { formatCents } from "@/lib/money";
import { dietProblems } from "@/lib/diet";
import { callStructured, imagePart } from "./client";
import { analyzeDishSystem } from "./prompts";
import { analyzeDishSchema, validateAnalyzeDish, type AnalyzeDish } from "./schemas";

export async function analyzeDish(
  base64: string,
  mediaType: "image/jpeg" | "image/png",
  menuPriceCents: number | null,
  settings: UserSettings,
): Promise<AnalyzeDish> {
  const price = menuPriceCents ? ` The menu price was ${formatCents(menuPriceCents)}.` : "";
  return callStructured({
    name: "analyze_dish",
    schema: analyzeDishSchema,
    system: analyzeDishSystem(settings),
    user: [
      { type: "text", text: `Identify this dish and write the home recipe for one serving.${price}` },
      imagePart(base64, mediaType),
    ],
    validate: (d) => [
      ...validateAnalyzeDish(d),
      ...(d.is_food ? dietProblems(d.ingredients, settings.diets, settings.allergies) : []),
    ],
  });
}
