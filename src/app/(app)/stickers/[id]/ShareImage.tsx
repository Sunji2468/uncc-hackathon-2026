"use client";

import { useRef, useState } from "react";
import { ImageDown, LoaderCircle } from "lucide-react";
import { toBlob } from "html-to-image";
import type { StickerView } from "@/lib/sticker-view";
import { FoodStickerArt } from "@/components/FoodStickerArt";
import { formatCents } from "@/lib/money";

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sticker";
}

/** Renders the 480x600 share card off-screen and exports it as a PNG. */
export function ShareImageButton({ view }: { view: StickerView }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  const make = async () => {
    if (!cardRef.current) return;
    setState("busy");
    try {
      const blob = await toBlob(cardRef.current, { pixelRatio: 2, cacheBust: true, width: 480, height: 600 });
      if (!blob) throw new Error("empty image");
      const file = new File([blob], `bytehacks-${slug(view.title)}.png`, { type: "image/png" });

      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: view.title, text: shareLine(view) });
          setState("done");
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") {
            setState("idle");
            return;
          }
          // Fall through to a download if sharing fails.
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setState("done");
    } catch (err) {
      console.error(err);
      setState("error");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={make}
        disabled={state === "busy"}
        className="flex min-h-14 items-center gap-2.5 rounded-2xl border-2 border-ink px-6 text-[17px] font-bold hover:bg-ink/10 disabled:opacity-60"
      >
        {state === "busy" ? (
          <LoaderCircle size={20} className="animate-spin" aria-hidden="true" />
        ) : (
          <ImageDown size={20} aria-hidden="true" />
        )}
        {state === "busy" ? "Making image..." : "Share as image"}
      </button>
      <p className="sr-only" role="status" aria-live="polite">
        {state === "done" ? "Share image ready" : state === "error" ? "Could not make the image" : ""}
      </p>
      {state === "error" && <p className="w-full text-sm font-bold text-coral">Could not make the image. Please try again.</p>}

      {/* Off-screen; only the inner card is captured. */}
      <div aria-hidden="true" className="pointer-events-none fixed top-0 -left-[10000px]">
        <ShareCard ref={cardRef} view={view} />
      </div>
    </>
  );
}

function shareLine(v: StickerView): string {
  if (v.menuPriceCents != null) {
    const keep = v.menuPriceCents - v.homeCostPerServingCents;
    if (keep > 0) return `I kept ${formatCents(keep)} on this plate.`;
  }
  return `Made at home for ${formatCents(v.homeCostPerServingCents)}.`;
}

function ShareCard({ view, ref }: { view: StickerView; ref: React.Ref<HTMLDivElement> }) {
  const hasMenu = view.menuPriceCents != null;
  return (
    <div
      ref={ref}
      style={{ width: 480, height: 600, fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}
      className="relative overflow-hidden bg-butter text-bg"
    >
      <div className="absolute inset-x-0 top-0 flex items-center gap-2.5 px-8 pt-7">
        <span className="flex size-9 items-center justify-center rounded-[11px] bg-coral">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#12201B" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="4.5" />
          </svg>
        </span>
        <span className="font-display text-2xl font-extrabold tracking-[-0.5px]">Bytehacks</span>
      </div>

      <div
        className="absolute top-24 left-[70px] w-[340px] overflow-hidden rounded-[34px] border-8 border-white bg-face text-sticker-ink"
        style={{ transform: "rotate(-3deg)", boxShadow: "0 20px 40px rgba(18,32,27,0.3)" }}
      >
        <FoodStickerArt thumbnail={view.thumbnail} title={view.title} kind={view.kind} className="h-[170px]" />
        <div className="px-5 pt-4 pb-5">
          <p className="font-display text-[32px] leading-[1.05] font-extrabold tracking-[-1px]">{view.title}</p>
          <div className="mt-3 flex items-center gap-3">
            {hasMenu && (
              <p className="text-xl font-bold text-sticker-muted line-through">{formatCents(view.menuPriceCents!)}</p>
            )}
            <p className="rounded-full bg-coral px-4 py-1.5 font-display text-[34px] leading-[1.1] font-extrabold text-bg">
              {formatCents(view.homeCostPerServingCents)}
            </p>
          </div>
          <p className="mt-2.5 text-[15px] text-sticker-muted">
            About {Math.round(view.perServing.kcal)} kcal and {Math.round(view.perServing.proteinG)} g protein per plate
          </p>
        </div>
      </div>

      <div className="absolute inset-x-8 top-[454px] text-center">
        <p className="font-display text-[38px] leading-[1.05] font-extrabold tracking-[-1px]">{shareLine(view)}</p>
        <p className="mt-2.5 text-[15px] font-medium">Nutrition and costs are estimates</p>
      </div>
    </div>
  );
}
