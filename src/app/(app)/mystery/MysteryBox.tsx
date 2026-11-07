"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Box, Camera, ChefHat, ImagePlus, LoaderCircle, Plus, Upload, X } from "lucide-react";
import type { UserSettings } from "@/types";
import type { StickerView } from "@/lib/sticker-view";
import { MAX_MYSTERY_ITEMS, TIME_LIMITS, isPantryStaple, type TimeLimit } from "@/lib/mystery";
import { ImageDecodeError, prepareImage } from "@/lib/client/image";
import { ApiRequestError, fetchJson } from "@/lib/client/fetch-json";
import { formatCents } from "@/lib/money";
import { AddToDayButton } from "@/components/AddToDayButton";

const panel = "rounded-[28px] border-2 border-line bg-panel";
const NEEDLE: Record<TimeLimit, number> = { 15: -62, 30: 0, 60: 62 };
const DIAL_LABEL: Record<TimeLimit, string> = { 15: "15 min", 30: "30 min", 60: "1 hr" };

type RecipeState = "idle" | "loading" | "ready" | "error";

export function MysteryBox({ settings }: { settings: UserSettings }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState("");
  const [detected, setDetected] = useState<boolean | null>(null); // null = no photo yet
  const [items, setItems] = useState<string[]>([]);
  const [timeLimit, setTimeLimit] = useState<TimeLimit>(15);
  const [recipeState, setRecipeState] = useState<RecipeState>("idle");
  const [recipeError, setRecipeError] = useState("");
  const [recipe, setRecipe] = useState<StickerView | null>(null);
  const [madeFor, setMadeFor] = useState<{ items: string; time: TimeLimit } | null>(null);

  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const recipeRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (recipeState === "ready") recipeRef.current?.focus();
  }, [recipeState]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setDetectError("");
    setDetecting(true);
    try {
      const img = await prepareImage(file);
      setPreview(img.thumbnail);
      const res = await fetchJson<{ ingredients: string[] }>("/api/mystery/detect", {
        method: "POST",
        json: { image: img.image, mediaType: img.mediaType },
      });
      setItems(res.ingredients);
      setDetected(res.ingredients.length > 0);
    } catch (err) {
      setDetectError(
        err instanceof ImageDecodeError || err instanceof ApiRequestError ? err.message : "Could not read that photo.",
      );
    } finally {
      setDetecting(false);
    }
  };

  const open = async () => {
    if (items.length === 0) return;
    setRecipeState("loading");
    setRecipeError("");
    try {
      const { stickerId } = await fetchJson<{ stickerId: string }>("/api/mystery/recipe", {
        method: "POST",
        json: {
          ingredients: items,
          timeLimitMin: timeLimit,
          thumbnail: preview ?? undefined,
          // Turning the dial rewrites the draft instead of piling up stickers.
          replaceStickerId: recipe?.id,
        },
      });
      setRecipe(await fetchJson<StickerView>(`/api/stickers/${stickerId}`));
      setMadeFor({ items: items.join("|"), time: timeLimit });
      setRecipeState("ready");
    } catch (err) {
      setRecipeError(err instanceof ApiRequestError ? err.message : "Could not open the box. Please try again.");
      setRecipeState("error");
    }
  };

  const stale = recipe && madeFor && (madeFor.items !== items.join("|") || madeFor.time !== timeLimit);
  const busy = recipeState === "loading";

  return (
    <div className="mt-8 flex flex-wrap items-start gap-7">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {/* Left: photo, chips, dial */}
      <div className={`${panel} min-w-0 flex-[1_1_520px] p-5 md:p-6`}>
        <div className="relative overflow-hidden rounded-[22px] border-2 border-line bg-bg">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Your counter" className="max-h-[280px] w-full object-cover" />
          ) : (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 p-6 text-center">
              <ImagePlus size={36} className="text-butter" aria-hidden="true" />
              <p className="font-display text-2xl font-extrabold">Snap your counter</p>
              <p className="text-sm text-muted">Or skip the photo and type what you have below.</p>
            </div>
          )}
          {detecting && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-bg/80 font-bold" role="status">
              <LoaderCircle className="animate-spin text-butter" aria-hidden="true" /> Spotting ingredients...
            </div>
          )}
        </div>
        <div className="mt-3.5 flex flex-wrap gap-2.5">
          <button
            type="button"
            disabled={detecting}
            onClick={() => cameraRef.current?.click()}
            className="flex min-h-12 items-center gap-2 rounded-[14px] bg-coral px-[22px] text-[15px] font-bold text-bg disabled:opacity-60"
          >
            <Camera size={18} aria-hidden="true" /> {preview ? "Take a new photo" : "Take a photo"}
          </button>
          <button
            type="button"
            disabled={detecting}
            onClick={() => uploadRef.current?.click()}
            className="flex min-h-12 items-center gap-2 rounded-[14px] border-2 border-ink px-[22px] text-[15px] font-bold hover:bg-ink/10 disabled:opacity-60"
          >
            <Upload size={18} aria-hidden="true" /> Upload a file
          </button>
        </div>
        {detectError && (
          <p role="alert" className="mt-3 flex items-start gap-2 font-bold text-coral">
            <AlertTriangle size={18} className="mt-0.5 flex-none" aria-hidden="true" /> {detectError}
          </p>
        )}

        <Chips items={items} setItems={setItems} detected={detected} />

        <TimeDial value={timeLimit} onChange={setTimeLimit} diets={settings.diets} allergies={settings.allergies} />

        <button
          type="button"
          onClick={open}
          disabled={items.length === 0 || busy || detecting}
          className="mt-6 flex min-h-[60px] w-full items-center justify-center gap-2 rounded-[18px] bg-butter text-[19px] font-bold text-bg transition hover:brightness-105 disabled:bg-line disabled:text-muted"
        >
          {busy ? (
            <>
              <LoaderCircle className="animate-spin" aria-hidden="true" /> Opening the box...
            </>
          ) : items.length === 0 ? (
            "Add ingredients to continue"
          ) : stale ? (
            `Rewrite for ${DIAL_LABEL[timeLimit]}`
          ) : recipe ? (
            "Try another recipe"
          ) : (
            "Open the box"
          )}
        </button>
      </div>

      {/* Right: the recipe sticker */}
      <div className="min-w-0 flex-[1_1_440px]" aria-live="polite">
        {recipeState === "ready" && recipe ? (
          <RecipeCard recipe={recipe} listedCount={items.length} headingRef={recipeRef} stale={Boolean(stale)} />
        ) : (
          <div
            className={`flex min-h-[460px] flex-col items-center justify-center gap-4 rounded-[34px] border-8 border-white bg-bg p-8 text-center shadow-[0_0_0_10px_rgba(255,213,74,0.18),0_20px_44px_rgba(0,0,0,0.45)] ${
              busy ? "animate-wiggle" : ""
            }`}
          >
            <span className="flex size-24 items-center justify-center rounded-full bg-butter shadow-[0_0_0_9px_rgba(255,213,74,0.25),0_0_40px_rgba(255,213,74,0.5)]">
              <Box size={48} className="text-bg" aria-hidden="true" />
            </span>
            {recipeState === "error" ? (
              <>
                <p className="font-display text-2xl font-extrabold">The box stayed shut</p>
                <p role="alert" className="max-w-sm text-muted">
                  {recipeError}
                </p>
              </>
            ) : busy ? (
              <>
                <p className="font-display text-2xl font-extrabold">Opening the box</p>
                <p className="max-w-sm text-muted">Writing a {DIAL_LABEL[timeLimit]} recipe from only what you have.</p>
              </>
            ) : (
              <>
                <p className="font-display text-2xl font-extrabold">Your recipe appears here</p>
                <p className="max-w-sm text-muted">Add what you have, set the dial, and open the box.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Chips({
  items,
  setItems,
  detected,
}: {
  items: string[];
  setItems: (v: string[]) => void;
  detected: boolean | null;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const commit = (keepOpen: boolean) => {
    const v = draft.trim().replace(/\s+/g, " ").slice(0, 40);
    if (v && !items.some((i) => i.toLowerCase() === v.toLowerCase()) && items.length < MAX_MYSTERY_ITEMS) {
      setItems([...items, v]);
    }
    setDraft("");
    if (!keepOpen) setAdding(false);
  };

  const heading =
    detected === false && items.length === 0
      ? "We could not spot any ingredients. Add them yourself:"
      : items.length > 0
        ? `${detected ? "Found" : "You have"} ${items.length} ${items.length === 1 ? "ingredient" : "ingredients"}`
        : "Your ingredients";

  return (
    <div className="mt-6">
      <p className="text-[17px] font-bold" id="chips-h">
        {heading}
      </p>
      <ul className="mt-2.5 flex flex-wrap gap-2" aria-labelledby="chips-h">
        {items.map((item) => (
          <li key={item}>
            <button
              type="button"
              aria-label={`Remove ${item}`}
              onClick={() => setItems(items.filter((i) => i !== item))}
              className="flex min-h-11 items-center gap-2 rounded-full bg-ink px-3.5 text-[15px] font-bold text-bg hover:bg-muted"
            >
              {item}
              <X size={16} aria-hidden="true" />
            </button>
          </li>
        ))}
        <li>
          {adding ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                commit(true);
              }}
            >
              <label htmlFor="add-item" className="sr-only">
                Add an ingredient
              </label>
              <input
                id="add-item"
                ref={inputRef}
                value={draft}
                maxLength={40}
                placeholder="e.g. spinach"
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => commit(false)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setDraft("");
                    setAdding(false);
                    addBtnRef.current?.focus();
                  }
                }}
                className="min-h-11 w-44 rounded-full border-2 border-butter bg-bg px-4 text-[15px] text-ink placeholder:text-muted"
              />
            </form>
          ) : (
            <button
              ref={addBtnRef}
              type="button"
              disabled={items.length >= MAX_MYSTERY_ITEMS}
              onClick={() => setAdding(true)}
              className="flex min-h-11 items-center gap-1.5 rounded-full border-2 border-dashed border-muted px-3.5 text-[15px] font-bold hover:border-ink disabled:opacity-50"
            >
              <Plus size={16} aria-hidden="true" /> Add
            </button>
          )}
        </li>
      </ul>
    </div>
  );
}

function TimeDial({
  value,
  onChange,
  diets,
  allergies,
}: {
  value: TimeLimit;
  onChange: (t: TimeLimit) => void;
  diets: string[];
  allergies: string[];
}) {
  const constraints = [...diets, ...allergies.map((a) => `no ${a}`)];
  return (
    <div className="mt-6 rounded-[22px] border-2 border-line bg-bg px-5 py-[18px]">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <p className="text-[17px] font-bold" id="dial-h">
          Time-crunch dial
        </p>
        {constraints.length > 0 && (
          <p className="rounded-full bg-panel px-3 py-1 text-[13px] font-bold text-butter">
            Diet: {constraints.join(", ")}
          </p>
        )}
      </div>
      <div className="relative mx-auto mt-4 h-[112px] w-[200px]" aria-hidden="true">
        <div className="absolute top-0 left-0 h-[102px] w-[200px] rounded-t-[200px] border-[5px] border-b-0 border-ink" />
        <span className="absolute top-[58px] left-4 text-[13px] font-bold">15</span>
        <span className="absolute top-3 left-[88px] text-[13px] font-bold">30</span>
        <span className="absolute top-[58px] right-3.5 text-[13px] font-bold">60</span>
        <div
          className="absolute top-6 left-[98px] h-[74px] w-1 origin-bottom rounded bg-coral transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `rotate(${NEEDLE[value]}deg)` }}
        />
        <div className="absolute top-[90px] left-[91px] size-[18px] rounded-full bg-ink" />
      </div>
      <div role="group" aria-labelledby="dial-h" className="mt-3.5 flex flex-wrap justify-center gap-2.5">
        {TIME_LIMITS.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={value === t}
            onClick={() => onChange(t)}
            className={`min-h-12 min-w-24 rounded-full border-2 text-base font-bold transition ${
              value === t ? "border-coral bg-coral text-bg" : "border-ink text-ink hover:bg-ink/10"
            }`}
          >
            {DIAL_LABEL[t]}
          </button>
        ))}
      </div>
      <p className="mt-3 text-center text-[13px] text-muted">
        {value === 15 ? "Stir-fry, scramble or microwave." : value === 30 ? "Skillet or one-pot." : "Baking and roasting allowed."}
      </p>
    </div>
  );
}

function RecipeCard({
  recipe,
  listedCount,
  headingRef,
  stale,
}: {
  recipe: StickerView;
  listedCount: number;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  stale: boolean;
}) {
  const used = recipe.ingredients.filter((i) => !isPantryStaple(i.name)).length;
  return (
    <article
      className={`rounded-[34px] border-8 border-white bg-face px-[26px] pt-[26px] pb-7 text-sticker-ink shadow-[0_0_0_10px_rgba(255,213,74,0.22),0_20px_44px_rgba(0,0,0,0.45)] transition-opacity ${
        stale ? "opacity-60" : ""
      }`}
    >
      <div className="flex flex-wrap gap-2">
        <p className="rounded-full bg-butter px-3.5 py-1.5 text-[15px] font-bold">{recipe.totalMinutes} min</p>
        <p className="rounded-full bg-chip px-3.5 py-1.5 text-[15px] font-bold">
          About {Math.round(recipe.perServing.kcal)} kcal
        </p>
        <p className="rounded-full bg-chip px-3.5 py-1.5 text-[15px] font-bold">
          {Math.round(recipe.perServing.proteinG)} g protein
        </p>
        <p className="rounded-full bg-chip px-3.5 py-1.5 text-[15px] font-bold">
          {formatCents(recipe.homeCostPerServingCents)} a serving
        </p>
      </div>
      <h2 ref={headingRef} tabIndex={-1} className="mt-4 text-[42px] leading-[1.05] tracking-[-1.3px] focus:outline-none">
        {recipe.title}
      </h2>
      <p className="mt-2 text-base leading-normal text-sticker-muted">
        Uses {used} of your {listedCount} ingredients{used < recipe.ingredients.length ? ", plus pantry staples" : ""}.{" "}
        {stale ? "You changed the dial or ingredients; rewrite to update." : "Turn the dial to rewrite it."}
      </p>
      <p className="mt-3 text-[15px] font-bold">
        {recipe.ingredients.map((i) => i.name).join(" · ")}
      </p>
      <ol className="mt-5 flex flex-col gap-3.5 border-t-2 border-chip pt-[18px]">
        {recipe.steps.map((s, i) => (
          <li key={i} className="flex gap-3.5 text-[17px] leading-snug">
            <span
              className="flex size-[34px] flex-none items-center justify-center rounded-full bg-sticker-ink text-base font-extrabold text-face"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <span className="pt-1">{s}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-sticker-muted">Saved to your board. Nutrition and costs are estimates.</p>
      <div className="mt-5 flex flex-wrap gap-2.5">
        <Link
          href={`/stickers/${recipe.id}/cook`}
          className="flex min-h-14 flex-[1_1_160px] items-center justify-center gap-2 rounded-2xl bg-coral text-[17px] font-bold text-bg"
        >
          <ChefHat size={20} aria-hidden="true" /> Start cooking
        </Link>
        <Link
          href={`/stickers/${recipe.id}`}
          className="flex min-h-14 flex-[1_1_160px] items-center justify-center rounded-2xl border-2 border-sticker-ink text-[17px] font-bold"
        >
          Open sticker
        </Link>
        <div className="flex-[1_1_100%]">
          <AddToDayButton stickerId={recipe.id} tone="light" />
        </div>
      </div>
    </article>
  );
}
