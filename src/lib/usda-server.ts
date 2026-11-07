import "server-only";
import { prisma } from "./db";
import { resolveNutrition, type Per100g, type UsdaDeps, type UsdaMatch } from "./usda";

const deps: UsdaDeps = {
  apiKey: process.env.USDA_API_KEY,
  fetch: (...args) => fetch(...args),
  async cacheGet(query) {
    const row = await prisma.nutrientCache.findUnique({ where: { query } });
    return row
      ? { fdcId: row.fdcId, description: row.description, kcalPer100g: row.kcalPer100g, proteinPer100g: row.proteinPer100g }
      : null;
  },
  async cacheSet(query, m: UsdaMatch) {
    await prisma.nutrientCache.upsert({
      where: { query },
      update: { ...m, fetchedAt: new Date() },
      create: { query, ...m },
    });
  },
};

export function resolveNutritionDb(usdaQuery: string | null | undefined, estimate: Per100g) {
  return resolveNutrition(usdaQuery, estimate, deps);
}
