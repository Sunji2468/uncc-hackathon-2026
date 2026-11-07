import "server-only";
import type { StickerKind } from "@prisma/client";
import { prisma } from "./db";
import { resolveNutritionDb } from "./usda-server";
import { isWater } from "./prices";
import type { ResolvedNutrition } from "./usda";
import type { AiRecipe } from "./ai/schemas";
import { buildStickerView } from "./sticker-view";
import { summarize } from "./sticker-summary";

/** Water is free and has no calories; never look it up. */
const WATER: ResolvedNutrition = { kcalPer100g: 0, proteinPer100g: 0, fdcId: null, source: "MODEL" };

export interface NewSticker {
  userId: string;
  kind: StickerKind;
  title: string;
  thumbnail: string;
  recipe: AiRecipe;
  menuPriceCents?: number | null;
  timeLimitMin?: number | null;
}

/** USDA lookup with the model's estimate as fallback; water is always free and zero. */
export function resolveIngredient(
  name: string,
  usdaQuery: string | null | undefined,
  estimate: { kcalPer100g: number; proteinPer100g: number },
): Promise<ResolvedNutrition> {
  return isWater(name) ? Promise.resolve(WATER) : resolveNutritionDb(usdaQuery, estimate);
}

/** Resolves nutrition for every ingredient in parallel, then saves the sticker. */
export async function createSticker(input: NewSticker): Promise<string> {
  const { recipe } = input;
  const resolved = await Promise.all(
    recipe.ingredients.map((ing) =>
      resolveIngredient(ing.name, ing.usda_query, {
        kcalPer100g: ing.kcal_per_100g_estimate,
        proteinPer100g: ing.protein_per_100g_estimate,
      }),
    ),
  );

  const sticker = await prisma.sticker.create({
    data: {
      userId: input.userId,
      kind: input.kind,
      title: input.title.trim().slice(0, 80),
      thumbnail: input.thumbnail,
      menuPriceCents: input.menuPriceCents ?? null,
      timeLimitMin: input.timeLimitMin ?? null,
      totalMinutes: Math.round(recipe.total_minutes),
      confidence: recipe.confidence,
      assumptions: recipe.assumptions.trim(),
      steps: recipe.steps.map((s) => s.trim()),
      ingredients: {
        create: recipe.ingredients.map((ing, position) => ({
          position,
          name: ing.name.trim(),
          gramsPerServing: ing.grams_per_serving,
          category: ing.category,
          usdaQuery: ing.usda_query.trim() || null,
          fdcId: resolved[position].fdcId,
          kcalPer100g: resolved[position].kcalPer100g,
          proteinPer100g: resolved[position].proteinPer100g,
          source: resolved[position].source,
        })),
      },
    },
    select: { id: true },
  });
  return sticker.id;
}

const viewInclude = { ingredients: { orderBy: { position: "asc" as const } } };

/** One sticker with ingredients, only if it belongs to this user. */
export async function loadSticker(id: string, userId: string) {
  return prisma.sticker.findFirst({ where: { id, userId }, include: viewInclude });
}

export async function loadStickerView(id: string, userId: string) {
  const s = await loadSticker(id, userId);
  return s ? buildStickerView(s) : null;
}

export async function listStickerSummaries(userId: string) {
  const rows = await prisma.sticker.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: viewInclude,
  });
  return rows.map(summarize);
}

/** An ingredient with nutrition already resolved (twist drafts, after rescaling). */
export interface ResolvedRow {
  name: string;
  gramsPerServing: number;
  category: string;
  usdaQuery: string | null;
  fdcId: number | null;
  kcalPer100g: number;
  proteinPer100g: number;
  source: "USDA" | "MODEL";
}

export async function resolveRecipeIngredients(recipe: AiRecipe): Promise<ResolvedRow[]> {
  return Promise.all(
    recipe.ingredients.map(async (ing) => {
      const r = await resolveIngredient(ing.name, ing.usda_query, {
        kcalPer100g: ing.kcal_per_100g_estimate,
        proteinPer100g: ing.protein_per_100g_estimate,
      });
      return {
        name: ing.name.trim(),
        gramsPerServing: ing.grams_per_serving,
        category: ing.category,
        usdaQuery: ing.usda_query.trim() || null,
        fdcId: r.fdcId,
        kcalPer100g: r.kcalPer100g,
        proteinPer100g: r.proteinPer100g,
        source: r.source,
      };
    }),
  );
}
