"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Database, LoaderCircle, Minus, Pencil, Plus, Repeat, Sparkles } from "lucide-react";
import type { Units } from "@/types";
import type { IngredientView, StickerView } from "@/lib/sticker-view";
import { formatAmount } from "@/lib/scale";
import { formatCents } from "@/lib/money";
import { isWater } from "@/lib/prices";
import { LIMITS } from "@/lib/ai/schemas";
import { ApiRequestError, fetchJson } from "@/lib/client/fetch-json";

interface Swap {
  name: string;
  category: string;
  usdaQuery: string;
  source: "USDA" | "MODEL";
  description: string;
  token: string;
}

const STEP_G = 5;

export function IngredientList({
  headingRef,
  view,
  units,
  onBaseChange,
  onLocalEdit,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  view: StickerView;
  units: Units;
  onBaseChange: (v: StickerView) => void;
  onLocalEdit: (ingId: string, gramsPerServing: number) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className="rounded-[28px] border-2 border-line bg-panel p-[22px]" aria-labelledby="ing-h">
      <h2 id="ing-h" ref={headingRef} tabIndex={-1} className="text-[26px] tracking-[-0.6px] focus:outline-none">
        Ingredients
      </h2>
      <p className="mt-1 text-sm text-muted">
        For {view.servings} {view.servings === 1 ? "serving" : "servings"}. Change an amount or swap an item; macros and
        cost update right away.
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {view.ingredients.map((ing) => (
          <IngredientItem
            key={ing.id}
            ing={ing}
            view={view}
            units={units}
            open={openId === ing.id}
            onToggle={() => setOpenId((id) => (id === ing.id ? null : ing.id))}
            onBaseChange={onBaseChange}
            onLocalEdit={onLocalEdit}
          />
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 border-t-2 border-line pt-3.5">
        <span className="text-[15px] text-muted">
          Home cost, estimated · {Math.round(view.total.kcal).toLocaleString("en-US")} kcal total
        </span>
        <span className="font-display text-[32px] font-extrabold">{formatCents(view.homeCostCents)}</span>
      </div>
    </section>
  );
}

function IngredientItem({
  ing,
  view,
  units,
  open,
  onToggle,
  onBaseChange,
  onLocalEdit,
}: {
  ing: IngredientView;
  view: StickerView;
  units: Units;
  open: boolean;
  onToggle: () => void;
  onBaseChange: (v: StickerView) => void;
  onLocalEdit: (ingId: string, gramsPerServing: number) => void;
}) {
  const servings = view.servings;
  // While typing, show the raw text; otherwise always show the live amount.
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef(ing.gramsPerServing);

  const free = isWater(ing.name);
  const label = ing.name.toLowerCase();

  const commit = (gramsPerServing: number) => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(async () => {
      if (Math.abs(gramsPerServing - lastSaved.current) < 0.05) return;
      try {
        await fetchJson(`/api/stickers/${view.id}/ingredients/${ing.id}`, {
          method: "PATCH",
          json: { gramsPerServing },
        });
        lastSaved.current = gramsPerServing;
        setError("");
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      } catch {
        onLocalEdit(ing.id, lastSaved.current);
        setError("Could not save that amount, so it was put back.");
      }
    }, 600);
  };

  useEffect(() => () => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
  }, []);

  /** Edits are made on the scaled amount shown; stored per serving. */
  const setScaledGrams = (scaled: number) => {
    const clamped = Math.min(LIMITS.maxGrams * servings, Math.max(0.5 * servings, scaled));
    const perServing = clamped / servings;
    onLocalEdit(ing.id, perServing);
    commit(perServing);
  };

  return (
    <li className={`rounded-[18px] border-2 bg-bg py-2 pr-2.5 pl-[18px] ${open ? "border-butter pb-4" : "border-line"}`}>
      <div className="flex min-h-12 items-center justify-between gap-2.5">
        <div className="min-w-0">
          <p className="text-[17px] font-bold">{ing.name}</p>
          <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
            <span>{free ? "Free" : formatCents(ing.costCents)}</span>
            <span aria-hidden="true">·</span>
            <span>{Math.round(ing.kcalPerServing * servings)} kcal</span>
            <SourceBadge source={ing.source} fdcId={ing.fdcId} />
          </p>
        </div>

        {open ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label={`Decrease the ${label} amount`}
              onClick={() => setScaledGrams(Math.round(ing.grams / STEP_G) * STEP_G - STEP_G)}
              className="flex size-11 items-center justify-center rounded-xl border-2 border-ink hover:bg-ink/10"
            >
              <Minus size={20} aria-hidden="true" />
            </button>
            <label className="flex items-center gap-1">
              <span className="sr-only">Grams of {label} for {servings} servings</span>
              <input
                type="number"
                inputMode="decimal"
                min={1}
                step={STEP_G}
                value={draft ?? String(Math.round(ing.grams))}
                onFocus={(e) => setDraft(e.target.value)}
                onChange={(e) => {
                  setDraft(e.target.value);
                  const g = Number(e.target.value);
                  if (Number.isFinite(g) && g > 0) setScaledGrams(g);
                }}
                onBlur={() => setDraft(null)}
                className="h-11 w-[72px] rounded-xl border-2 border-line bg-panel text-center text-[17px] font-bold [appearance:textfield] focus:border-butter [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="font-bold text-muted" aria-hidden="true">
                g
              </span>
            </label>
            <button
              type="button"
              aria-label={`Increase the ${label} amount`}
              onClick={() => setScaledGrams(Math.round(ing.grams / STEP_G) * STEP_G + STEP_G)}
              className="flex size-11 items-center justify-center rounded-xl border-2 border-ink hover:bg-ink/10"
            >
              <Plus size={20} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[17px] font-bold whitespace-nowrap">{formatAmount(ing.grams, ing.name, units)}</span>
            <button
              type="button"
              aria-label={`Edit the ${label} amount or swap it`}
              aria-expanded={false}
              onClick={onToggle}
              className="flex size-11 items-center justify-center rounded-xl border-2 border-ink hover:bg-ink/10"
            >
              <Pencil size={18} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {open && (
        <>
          <p role="status" aria-live="polite" className="mt-1 min-h-5 text-[13px] font-bold">
            {error ? (
              <span className="text-coral">{error}</span>
            ) : saved ? (
              <span className="inline-flex items-center gap-1 text-butter">
                <Check size={14} aria-hidden="true" /> Saved
              </span>
            ) : (
              <span className="text-muted">
                {formatAmount(ing.grams, ing.name, units)} for {servings}, about {formatAmount(ing.gramsPerServing, ing.name, units)} each
              </span>
            )}
          </p>
          {!free && <SwapPanel ing={ing} stickerId={view.id} onApplied={onBaseChange} onDone={onToggle} />}
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={true}
            className="mt-3 min-h-11 rounded-xl px-3 text-sm font-bold text-muted hover:text-ink"
          >
            Done
          </button>
        </>
      )}
    </li>
  );
}

function SwapPanel({
  ing,
  stickerId,
  onApplied,
  onDone,
}: {
  ing: IngredientView;
  stickerId: string;
  onApplied: (v: StickerView) => void;
  onDone: () => void;
}) {
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [error, setError] = useState("");
  const [applying, setApplying] = useState<string | null>(null);

  const load = async () => {
    setState("loading");
    setError("");
    try {
      const res = await fetchJson<{ swaps: Swap[] }>(`/api/stickers/${stickerId}/ingredients/${ing.id}/swaps`);
      setSwaps(res.swaps);
      setState("ready");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not load swaps.");
      setState("error");
    }
  };

  const apply = async (s: Swap) => {
    setApplying(s.name);
    setError("");
    try {
      const next = await fetchJson<StickerView>(`/api/stickers/${stickerId}/ingredients/${ing.id}/swap`, {
        method: "POST",
        json: { name: s.name, category: s.category, usdaQuery: s.usdaQuery, token: s.token },
      });
      onApplied(next);
      onDone();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not swap that ingredient.");
      if (err instanceof ApiRequestError && err.code === "stale_swap") setState("idle");
    } finally {
      setApplying(null);
    }
  };

  if (state === "idle" || state === "error") {
    return (
      <div className="mt-2">
        <button
          type="button"
          onClick={load}
          className="flex min-h-11 items-center gap-2 rounded-xl border-2 border-butter px-4 text-sm font-bold text-butter hover:bg-butter/10"
        >
          <Repeat size={16} aria-hidden="true" /> {state === "error" ? "Try swaps again" : "Suggest swaps"}
        </button>
        {error && (
          <p role="alert" className="mt-2 text-sm font-bold text-coral">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2 pr-2">
      <p className="text-[13px] font-bold text-butter">Swap for</p>
      {state === "loading" ? (
        <div className="mt-2 flex flex-wrap gap-2" aria-busy="true">
          <span className="sr-only" role="status">
            Finding swaps
          </span>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[60px] flex-[1_1_180px] animate-pulse rounded-[14px] bg-panel motion-reduce:animate-none" />
          ))}
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {swaps.map((s) => (
            <button
              key={s.name}
              type="button"
              disabled={applying !== null}
              onClick={() => apply(s)}
              className="flex min-h-[60px] flex-[1_1_180px] items-center justify-between gap-2 rounded-[14px] border-2 border-ink px-3.5 py-1.5 text-left hover:bg-ink/10 disabled:opacity-60"
            >
              <span>
                <span className="block text-[15px] font-bold">{s.name}</span>
                <span className="block text-[13px] text-muted">{s.description}</span>
              </span>
              {applying === s.name && <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm font-bold text-coral">
          {error}
        </p>
      )}
    </div>
  );
}

function SourceBadge({ source, fdcId }: { source: "USDA" | "MODEL"; fdcId: number | null }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-panel px-2 py-0.5 text-[11px] font-bold"
      title={source === "USDA" ? `USDA FoodData Central #${fdcId}` : "Estimated by the model"}
    >
      {source === "USDA" ? <Database size={11} aria-hidden="true" /> : <Sparkles size={11} aria-hidden="true" />}
      {source === "USDA" ? "USDA" : "Est."}
    </span>
  );
}
