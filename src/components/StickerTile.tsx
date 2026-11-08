import Link from "next/link";
import { FoodStickerArt } from "./FoodStickerArt";
import type { StickerSummary } from "@/lib/sticker-summary";
import { formatCents } from "@/lib/money";

const ROTATIONS = [-2, 2, -1, 1.5, -1.5, 2.5, -2.5, 1];
const OFFSETS = [0, 14, 0, 0, 10, 0, 6, 12];

export function tileTilt(index: number) {
  return { rotate: ROTATIONS[index % ROTATIONS.length], offset: OFFSETS[index % OFFSETS.length] };
}

const shell =
  "block w-full overflow-hidden rounded-[38px_24px_36px_22px] border-[6px] border-[#fffdf2] shadow-[0_14px_28px_rgba(0,0,0,0.4)] transition-transform duration-200 hover:-translate-y-1 hover:rotate-0 focus-visible:rotate-0";

/** One sticker on the board. Pure markup so it can be wrapped by drag and drop later. */
export function StickerTile({ s, index, compact = false }: { s: StickerSummary; index: number; compact?: boolean }) {
  const { rotate } = tileTilt(index);
  const style = { transform: `rotate(${rotate}deg)` };
  const twist = s.kind === "TWIST";
  return (
    <Link
      href={`/stickers/${s.id}`}
      style={style}
      className={`${shell} bg-face text-sticker-ink`}
    >
      <FoodStickerArt thumbnail={s.thumbnail} title={s.title} kind={s.kind} savings={s.keepPerPlateCents} className={compact ? "h-[170px]" : "h-[200px]"} />
      <div className="px-3.5 pt-3 pb-3.5">
        <p className="food-sticker-ribbon font-display text-xl leading-[1.1] font-extrabold">{s.title}</p>
        <p className="mt-1 text-sm text-sticker-muted">
          {s.kind === "MYSTERY" ? `${s.ingredientCount} ingredients · ${s.totalMinutes} min` : twist
            ? `${s.kcalPerServing} kcal · ${s.proteinPerServing} g protein`
            : s.menuPriceCents != null
              ? `${formatCents(s.menuPriceCents)} menu · ${formatCents(s.homeCostPerServingCents)} home`
              : `${formatCents(s.homeCostPerServingCents)} at home`}
        </p>
        <p className="mt-2 inline-block rounded-full bg-chip px-2.5 py-1 text-[13px] font-bold">
          {s.kind === "MYSTERY" ? `${formatCents(s.homeCostPerServingCents)} a serving` : twist
            ? "Smart twist"
            : s.keepPerPlateCents != null
              ? s.keepPerPlateCents >= 0
                ? `Kept ${formatCents(s.keepPerPlateCents)}`
                : "Cheaper out"
              : "Add a menu price"}
        </p>
      </div>
    </Link>
  );
}
