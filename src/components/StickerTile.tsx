import Link from "next/link";
import { Box, Sparkles } from "lucide-react";
import type { StickerSummary } from "@/lib/sticker-summary";
import { formatCents } from "@/lib/money";

const ROTATIONS = [-2, 2, -1, 1.5, -1.5, 2.5, -2.5, 1];
const OFFSETS = [0, 14, 0, 0, 10, 0, 6, 12];

export function tileTilt(index: number) {
  return { rotate: ROTATIONS[index % ROTATIONS.length], offset: OFFSETS[index % OFFSETS.length] };
}

const shell =
  "block w-full overflow-hidden rounded-[26px] border-[6px] border-white shadow-[0_14px_28px_rgba(0,0,0,0.4)] transition-transform duration-200 hover:-translate-y-1 hover:rotate-0 focus-visible:rotate-0";

/** One sticker on the board. Pure markup so it can be wrapped by drag and drop later. */
export function StickerTile({ s, index, compact = false }: { s: StickerSummary; index: number; compact?: boolean }) {
  const { rotate } = tileTilt(index);
  const style = { transform: `rotate(${rotate}deg)` };
  const head = compact ? "h-[84px]" : "h-[118px]";

  if (s.kind === "MYSTERY") {
    return (
      <Link href={`/stickers/${s.id}`} style={style} className={`${shell} bg-bg px-4 py-5 text-ink`}>
        <span className="flex size-[72px] items-center justify-center rounded-full bg-butter shadow-[0_0_0_7px_rgba(255,213,74,0.25),0_0_32px_rgba(255,213,74,0.5)]">
          <Box size={38} className="text-bg" aria-hidden="true" />
        </span>
        <p className="mt-4 font-display text-xl leading-tight font-extrabold">{s.title}</p>
        <p className="mt-1 text-sm text-muted">
          {s.ingredientCount} ingredients · {s.timeLimitMin ?? s.totalMinutes} min
        </p>
        <p className="mt-2 inline-block rounded-full bg-panel px-2.5 py-1 text-[13px] font-bold text-butter">
          {formatCents(s.homeCostPerServingCents)} a serving
        </p>
      </Link>
    );
  }

  const twist = s.kind === "TWIST";
  return (
    <Link
      href={`/stickers/${s.id}`}
      style={style}
      className={`${shell} bg-face text-sticker-ink`}
    >
      <div className={`${head} ${twist ? "flex items-center justify-center bg-butter" : "bg-chip"}`}>
        {twist ? (
          <Sparkles size={56} className="text-sticker-ink" aria-hidden="true" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.thumbnail} alt="" className="size-full object-cover" loading="lazy" />
        )}
      </div>
      <div className="px-3.5 pt-3 pb-3.5">
        <p className="font-display text-xl leading-[1.1] font-extrabold">{s.title}</p>
        <p className="mt-1 text-sm text-sticker-muted">
          {twist
            ? `${s.kcalPerServing} kcal · ${s.proteinPerServing} g protein`
            : s.menuPriceCents != null
              ? `${formatCents(s.menuPriceCents)} menu · ${formatCents(s.homeCostPerServingCents)} home`
              : `${formatCents(s.homeCostPerServingCents)} at home`}
        </p>
        <p className="mt-2 inline-block rounded-full bg-chip px-2.5 py-1 text-[13px] font-bold">
          {twist
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
