import { buildStickerView, type StickerRow } from "./sticker-view";

export interface StickerSummary {
  id: string;
  kind: StickerRow["kind"];
  title: string;
  thumbnail: string;
  menuPriceCents: number | null;
  timeLimitMin: number | null;
  totalMinutes: number;
  servings: number;
  ingredientCount: number;
  kcalPerServing: number;
  proteinPerServing: number;
  homeCostPerServingCents: number;
  /** Menu price minus home cost for ONE plate; null without a menu price. */
  keepPerPlateCents: number | null;
  createdAt: string;
}

export function summarize(row: StickerRow): StickerSummary {
  const v = buildStickerView(row);
  return {
    id: v.id,
    kind: v.kind,
    title: v.title,
    thumbnail: v.thumbnail,
    menuPriceCents: v.menuPriceCents,
    timeLimitMin: v.timeLimitMin,
    totalMinutes: v.totalMinutes,
    servings: v.servings,
    ingredientCount: v.ingredients.length,
    kcalPerServing: Math.round(v.perServing.kcal),
    proteinPerServing: Math.round(v.perServing.proteinG),
    homeCostPerServingCents: v.homeCostPerServingCents,
    keepPerPlateCents: v.menuPriceCents != null ? v.menuPriceCents - v.homeCostPerServingCents : null,
    createdAt: v.createdAt,
  };
}

/** Total kept across restaurant heists, one plate each. Negative heists don't subtract. */
export function totalKept(stickers: StickerSummary[]): { cents: number; dishes: number } {
  const heists = stickers.filter((s) => s.kind === "DISH" && s.keepPerPlateCents != null);
  return {
    cents: heists.reduce((sum, s) => sum + Math.max(0, s.keepPerPlateCents ?? 0), 0),
    dishes: heists.length,
  };
}

export type BoardFilter = "all" | "heists" | "mystery";

export function filterStickers(stickers: StickerSummary[], filter: BoardFilter): StickerSummary[] {
  if (filter === "heists") return stickers.filter((s) => s.kind === "DISH");
  if (filter === "mystery") return stickers.filter((s) => s.kind === "MYSTERY");
  return stickers;
}

export function parseFilter(v: string | undefined): BoardFilter {
  return v === "heists" || v === "mystery" ? v : "all";
}
