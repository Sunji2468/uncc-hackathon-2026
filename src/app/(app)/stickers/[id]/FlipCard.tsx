"use client";

import { useState } from "react";
import { Pencil, Repeat } from "lucide-react";
import type { StickerView } from "@/lib/sticker-view";
import { formatCents } from "@/lib/money";
import { PriceEditor } from "./PriceEditor";

const faceBase =
  "flip-face overflow-hidden rounded-[34px] border-8 border-white shadow-[0_20px_40px_rgba(0,0,0,0.45)]";

export function FlipCard({
  view,
  kindLabel,
  onSavePrice,
}: {
  view: StickerView;
  kindLabel: string;
  onSavePrice: (cents: number | null) => Promise<void>;
}) {
  const [flipped, setFlipped] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const keepPerPlate = view.menuPriceCents != null ? view.menuPriceCents - view.homeCostPerServingCents : null;

  return (
    <div>
      <div className="flip rotate-[-1.5deg]">
        {/* Tapping the card flips it; the button below is the keyboard and screen reader path. */}
        <div
          className={`flip-inner cursor-pointer ${flipped ? "is-flipped" : ""}`}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("button, input, form")) return;
            setFlipped((f) => !f);
          }}
        >
          {/* Front: the photo side */}
          <div className={`${faceBase} bg-face text-sticker-ink`} aria-hidden={flipped}>
            <div className="relative h-[260px] bg-butter">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={view.thumbnail} alt={`Photo of ${view.title}`} className="size-full object-cover" />
              <p className="absolute top-4 left-4 rounded-full bg-sticker-ink px-3 py-1.5 text-[13px] font-bold text-face">
                {kindLabel}
              </p>
            </div>
            <div className="px-[22px] pt-[18px] pb-[22px]">
              <h1 className="text-[38px] leading-[1.05] tracking-[-1.2px]">{view.title}</h1>
              {view.kind === "DISH" &&
                (editingPrice ? (
                  <PriceEditor cents={view.menuPriceCents} onSave={onSavePrice} onDone={() => setEditingPrice(false)} />
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <p className="rounded-full bg-chip px-3.5 py-2 text-base font-bold">
                      {view.menuPriceCents != null
                        ? `${formatCents(view.menuPriceCents)} on the menu`
                        : "No menu price yet"}
                    </p>
                    <button
                      type="button"
                      tabIndex={flipped ? -1 : 0}
                      onClick={() => setEditingPrice(true)}
                      aria-label={view.menuPriceCents != null ? "Edit the menu price" : "Add the menu price"}
                      className="flex size-11 items-center justify-center rounded-xl text-sticker-muted hover:bg-chip"
                    >
                      <Pencil size={18} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              {view.kind !== "DISH" && (
                <p className="mt-2 text-[15px] text-sticker-muted">
                  {view.timeLimitMin ? `Made in under ${view.timeLimitMin} minutes` : `About ${view.totalMinutes} minutes`}
                </p>
              )}
            </div>
          </div>

          {/* Back: the recipe side */}
          <div
            className={`${faceBase} flip-back flex flex-col bg-sticker-ink p-6 text-face`}
            aria-hidden={!flipped}
          >
            <p className="text-[13px] font-bold tracking-wide text-butter uppercase">Recipe side</p>
            <p className="mt-1 font-display text-[28px] leading-tight font-extrabold tracking-[-0.6px]">{view.title}</p>
            <dl className="mt-5 grid grid-cols-2 gap-3">
              <Stat label="kcal per serving" value={Math.round(view.perServing.kcal).toLocaleString("en-US")} />
              <Stat label="protein per serving" value={`${Math.round(view.perServing.proteinG)} g`} />
              <Stat label="home cost per serving" value={formatCents(view.homeCostPerServingCents)} />
              <Stat label="ingredients" value={String(view.ingredients.length)} />
            </dl>
            <p className="mt-auto rounded-2xl bg-butter px-4 py-3 font-display text-xl font-extrabold text-bg">
              {keepPerPlate != null
                ? `${formatCents(keepPerPlate)} kept per plate`
                : `${view.totalMinutes} minutes, start to finish`}
            </p>
            <p className="mt-2 text-xs text-[#C9C3B6]">Estimates</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        aria-pressed={flipped}
        onClick={() => setFlipped((f) => !f)}
        className="mx-auto mt-5 flex min-h-12 items-center gap-2 rounded-full border-2 border-ink px-5 font-bold hover:bg-ink/10"
      >
        <Repeat size={18} aria-hidden="true" />
        {flipped ? "Show the photo side" : "Flip to the recipe side"}
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-3.5 py-3">
      <dd className="font-display text-2xl font-extrabold">{value}</dd>
      <dt className="text-[13px] text-[#C9C3B6]">{label}</dt>
    </div>
  );
}
