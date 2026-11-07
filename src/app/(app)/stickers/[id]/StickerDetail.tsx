"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChefHat, Pencil } from "lucide-react";
import type { Units } from "@/types";
import { buildStickerView, MAX_SERVINGS, MIN_SERVINGS, type StickerView } from "@/lib/sticker-view";
import { formatCents } from "@/lib/money";
import { fetchJson } from "@/lib/client/fetch-json";
import { FlipCard } from "./FlipCard";
import { AddToDayButton } from "@/components/AddToDayButton";
import { ShareToFridgeButton } from "@/components/ShareToFridgeButton";
import { ShoppingList } from "./ShoppingList";
import { ShareImageButton } from "./ShareImage";
import { dietConflict } from "@/lib/diet";
import { IngredientList } from "./IngredientList";

const panel = "rounded-3xl border-2 border-line bg-panel px-[22px] py-5";

export function StickerDetail({
  initial,
  units,
  diets,
  allergies,
}: {
  initial: StickerView;
  units: Units;
  diets: string[];
  allergies: string[];
}) {
  // `base` holds the stored rows; every number on screen is derived from it + servings.
  const [base, setBase] = useState<StickerView>(initial);
  const [servings, setServings] = useState(initial.servings);
  const [saveError, setSaveError] = useState("");
  const view = useMemo(() => buildStickerView(base, servings), [base, servings]);
  const ingredientsRef = useRef<HTMLHeadingElement>(null);

  // Persist the slider value, debounced. Display never waits on this.
  const firstServings = useRef(true);
  useEffect(() => {
    if (firstServings.current) {
      firstServings.current = false;
      return;
    }
    const t = setTimeout(() => {
      fetchJson(`/api/stickers/${base.id}`, { method: "PATCH", json: { servings } })
        .then(() => setSaveError(""))
        .catch(() => setSaveError("Could not save the servings. Your change shows here but may not be kept."));
    }, 500);
    return () => clearTimeout(t);
  }, [servings, base.id]);

  const savePrice = async (cents: number | null) => {
    const next = await fetchJson<StickerView>(`/api/stickers/${base.id}`, {
      method: "PATCH",
      json: { menuPriceCents: cents },
    });
    setBase(next);
  };

  const conflicts = view.ingredients.flatMap((i) => {
    const c = dietConflict(i, diets, allergies);
    return c ? [c] : [];
  });

  const kindLabel = base.kind === "DISH" ? "Restaurant heist" : base.kind === "MYSTERY" ? "Mystery Box" : "Smart twist";

  return (
    <>
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-[15px] font-bold text-muted hover:text-ink">
        <ArrowLeft size={18} aria-hidden="true" /> Back to the board
      </Link>

      <div className="mt-3 flex flex-wrap items-start gap-9">
        <div className="flex max-w-[440px] min-w-0 flex-[1_1_360px] flex-col gap-6">
          <FlipCard view={view} kindLabel={kindLabel} onSavePrice={savePrice} />
          <ShoppingList view={view} units={units} />
        </div>

        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-5">
          <div className="flex flex-wrap gap-2.5">
            <Link
              href={`/stickers/${base.id}/cook`}
              className="flex min-h-14 items-center gap-2.5 rounded-2xl bg-coral px-7 text-[17px] font-bold text-bg hover:brightness-105"
            >
              <ChefHat size={22} aria-hidden="true" /> Start cooking
            </Link>
            <ShareImageButton view={view} />
            <AddToDayButton stickerId={base.id} />
            {base.kind === "DISH" && <ShareToFridgeButton stickerId={base.id} hasMenuPrice={base.menuPriceCents != null} />}
          </div>

          {conflicts.length > 0 && (
            <p role="note" className="rounded-2xl border-2 border-coral bg-coral/10 p-4 font-bold">
              Heads up: {conflicts.map((c) => c.reason).join("; ")}. Swap {conflicts.length === 1 ? "it" : "them"} below.
            </p>
          )}

          {/* Macros */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-[1_1_220px] rounded-3xl bg-butter px-[22px] py-5 text-bg">
              <p className="font-display text-[56px] leading-none font-extrabold tracking-[-1.5px]">
                {Math.round(view.perServing.kcal).toLocaleString("en-US")}
              </p>
              <p className="mt-1 text-[15px] font-bold">kcal per serving (est.)</p>
              <p className="mt-1.5 text-sm">
                Range {view.kcalRange[0].toLocaleString("en-US")} to {view.kcalRange[1].toLocaleString("en-US")}
              </p>
            </div>
            <div className="flex-[1_1_220px] rounded-3xl bg-ink px-[22px] py-5 text-bg">
              <p className="font-display text-[56px] leading-none font-extrabold tracking-[-1.5px]">
                {Math.round(view.perServing.proteinG)} g
              </p>
              <p className="mt-1 text-[15px] font-bold">protein per serving (est.)</p>
              <p className="mt-1.5 text-sm">
                Range {view.proteinRange[0]} to {view.proteinRange[1]}
              </p>
            </div>
          </div>

          {/* Confidence */}
          <div className={`${panel} flex flex-wrap items-center justify-between gap-3.5`}>
            <div className="flex-[1_1_300px]">
              <ConfidenceBar level={view.confidenceLevel} />
              <p className="mt-1.5 text-sm leading-snug text-muted">
                {view.assumptions} Correct an amount below and everything recalculates.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                ingredientsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                ingredientsRef.current?.focus({ preventScroll: true });
              }}
              className="flex min-h-12 items-center gap-2 rounded-[14px] border-2 border-ink px-5 text-[15px] font-bold hover:bg-ink/10"
            >
              <Pencil size={18} aria-hidden="true" /> Edit portion
            </button>
          </div>

          {/* Servings + heist */}
          <div className="flex flex-wrap gap-4">
            <div className={`${panel} flex-[1_1_240px]`}>
              <div className="flex items-baseline justify-between">
                <label htmlFor="servings" className="text-base font-bold">
                  Servings
                </label>
                <p className="font-display text-4xl leading-none font-extrabold" aria-hidden="true">
                  {servings}
                </p>
              </div>
              <input
                id="servings"
                type="range"
                min={MIN_SERVINGS}
                max={MAX_SERVINGS}
                step={1}
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
                aria-valuetext={`${servings} ${servings === 1 ? "serving" : "servings"}`}
                className="mt-2.5 block h-8 w-full cursor-pointer accent-butter"
              />
              <div className="flex justify-between px-1 text-[13px] text-muted" aria-hidden="true">
                {Array.from({ length: MAX_SERVINGS }, (_, i) => (
                  <span key={i}>{i + 1}</span>
                ))}
              </div>
              {saveError && (
                <p role="alert" className="mt-2 text-sm font-bold text-coral">
                  {saveError}
                </p>
              )}
            </div>

            <HeistCard view={view} />
          </div>

          <IngredientList
            headingRef={ingredientsRef}
            view={view}
            units={units}
            onBaseChange={setBase}
            onLocalEdit={(ingId, gramsPerServing) =>
              setBase((b) => ({
                ...b,
                ingredients: b.ingredients.map((i) => (i.id === ingId ? { ...i, gramsPerServing } : i)),
              }))
            }
          />

          {/* Steps */}
          <section className="rounded-[28px] border-2 border-line bg-panel p-[22px]" aria-labelledby="steps-h">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="steps-h" className="text-[26px] tracking-[-0.6px]">
                Steps
              </h2>
              <p className="text-sm text-muted">About {view.totalMinutes} minutes</p>
            </div>
            <ol className="mt-3.5 flex flex-col gap-3.5">
              {view.steps.map((step, i) => (
                <li key={i} className="flex gap-3.5 text-[17px] leading-snug">
                  <span
                    className="flex size-[34px] flex-none items-center justify-center rounded-full bg-butter text-base font-extrabold text-bg"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <span className="pt-1">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <p className="text-xs text-muted">
            Nutrition and costs are estimates. Calories and protein come from USDA FoodData Central where possible.
          </p>
        </div>
      </div>
    </>
  );
}

function ConfidenceBar({ level }: { level: StickerView["confidenceLevel"] }) {
  const filled = level === "low" ? 1 : level === "good" ? 2 : 3;
  return (
    <div className="flex items-center gap-3.5">
      <p className="text-base font-bold">Confidence: {level}</p>
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`h-2 w-8 rounded ${i < filled ? "bg-butter" : "bg-line"}`} />
        ))}
      </div>
    </div>
  );
}

function HeistCard({ view }: { view: StickerView }) {
  const { heist, servings } = view;
  const plates = `${servings} ${servings === 1 ? "plate" : "plates"}`;

  if (!heist) {
    return (
      <div className={`${panel} flex-[1_1_300px]`}>
        <div className="flex justify-between text-[15px] font-bold">
          <span>At home, {plates}, estimated</span>
          <span>{formatCents(view.homeCostCents)}</span>
        </div>
        <div className="mt-1.5 h-5 rounded-lg bg-coral" />
        <p className="mt-3.5 text-sm text-muted">
          {view.kind === "DISH"
            ? "Add the menu price on the sticker to see what you keep."
            : `About ${formatCents(view.homeCostPerServingCents)} per serving.`}
        </p>
      </div>
    );
  }

  const homePct = heist.restaurantTotalCents > 0 ? (heist.homeTotalCents / heist.restaurantTotalCents) * 100 : 100;
  return (
    <div className={`${panel} flex-[1_1_300px]`} aria-live="polite">
      <div className="flex justify-between text-[15px] font-bold">
        <span>Restaurant, {plates}</span>
        <span>{formatCents(heist.restaurantTotalCents)}</span>
      </div>
      <div className="mt-1.5 h-5 rounded-lg bg-ink" />
      <div className="mt-3 flex justify-between text-[15px] font-bold">
        <span>At home, estimated</span>
        <span>{formatCents(heist.homeTotalCents)}</span>
      </div>
      <div
        className="mt-1.5 h-5 min-w-2 rounded-lg bg-coral transition-[width] duration-300"
        style={{ width: `${Math.min(100, homePct)}%` }}
      />
      <p className="mt-3.5 inline-block rounded-full bg-butter px-[18px] py-2 font-display text-2xl font-extrabold text-bg">
        {heist.keepCents >= 0
          ? `You keep ${formatCents(heist.keepCents)}`
          : `Home costs ${formatCents(-heist.keepCents)} more`}
      </p>
    </div>
  );
}
