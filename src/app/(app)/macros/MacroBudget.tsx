"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { GripVertical, LoaderCircle, Plus, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import type { StickerSummary } from "@/lib/sticker-summary";
import type { Meal, TwistDraft, UserSettings } from "@/types";
import { localDay } from "@/lib/day";
import { formatAmount } from "@/lib/scale";
import { formatCents } from "@/lib/money";
import { TWIST_MIN_KCAL } from "@/lib/twist";
import { ApiRequestError, fetchJson } from "@/lib/client/fetch-json";

const DRAG_TYPE = "application/x-tasteheist-sticker";
const ROT = [-2, 2, -1, 1.5];

interface DayData {
  meals: Meal[];
  totals: { kcal: number; proteinG: number };
}

export function MacroBudget({ stickers: initialStickers, goals }: { stickers: StickerSummary[]; goals: UserSettings }) {
  const [stickers, setStickers] = useState(initialStickers);
  const [day, setDay] = useState<string | null>(null);
  const [data, setData] = useState<DayData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async (d: string) => {
    try {
      setData(await fetchJson<DayData>(`/api/meals?day=${d}`));
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    const d = localDay();
    setDay(d);
    void load(d);
  }, [load]);

  const totals = data?.totals ?? { kcal: 0, proteinG: 0 };
  const leftKcal = goals.calorieGoal - totals.kcal;
  const leftProtein = goals.proteinGoal - totals.proteinG;

  const eat = async (s: StickerSummary) => {
    if (!day || busyId) return;
    setBusyId(s.id);
    setError("");
    try {
      const { meal } = await fetchJson<{ meal: Meal }>("/api/meals", {
        method: "POST",
        json: { stickerId: s.id, name: s.title, kcal: 0, proteinG: 0, day },
      });
      setData((d) => addMeal(d, meal));
      setAnnounce(`Added ${meal.name}: ${meal.kcal} kcal and ${meal.proteinG} g protein.`);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not add that meal.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (m: Meal) => {
    const before = data;
    setData((d) => (d ? { meals: d.meals.filter((x) => x.id !== m.id), totals: sub(d.totals, m) } : d));
    try {
      await fetchJson(`/api/meals/${m.id}`, { method: "DELETE" });
      setAnnounce(`Removed ${m.name}.`);
    } catch {
      setData(before);
      setError(`Could not remove ${m.name}.`);
    }
  };

  const onTwistAccepted = async (meal: Meal) => {
    setData((d) => addMeal(d, meal));
    setAnnounce(`Added ${meal.name}: ${meal.kcal} kcal.`);
    try {
      setStickers((await fetchJson<{ stickers: StickerSummary[] }>("/api/stickers")).stickers);
    } catch {}
  };

  return (
    <>
      <PageHeader title="Macro budget" subtitle="Drag stickers into today and watch the bars fill.">
        <Link
          href="/settings"
          className="flex min-h-12 items-center rounded-full border-2 border-line bg-panel px-[22px] text-[15px] font-bold hover:border-muted"
        >
          Edit goals
        </Link>
      </PageHeader>

      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      <section aria-label="Today's totals" className="mt-7 flex flex-wrap gap-7 rounded-[28px] border-2 border-line bg-panel px-7 py-6">
        <BigBar label="Calories" value={totals.kcal} goal={goals.calorieGoal} unit="kcal" color="bg-coral" left={leftKcal} leftWord="left" loading={!data && !loadError} />
        <BigBar label="Protein" value={totals.proteinG} goal={goals.proteinGoal} unit="g" color="bg-butter" left={leftProtein} leftWord="to go" loading={!data && !loadError} />
        {loadError && (
          <p role="alert" className="w-full font-bold text-coral">
            Could not load today&apos;s meals.{" "}
            <button type="button" className="underline" onClick={() => day && load(day)}>
              Try again
            </button>
          </p>
        )}
      </section>

      {error && (
        <p role="alert" className="mt-4 rounded-2xl bg-coral/15 p-4 font-bold">
          {error}
        </p>
      )}

      <div className="mt-7 flex flex-wrap items-start gap-7">
        <section className="min-w-0 flex-[1_1_440px]" aria-labelledby="yours-h">
          <h2 id="yours-h" className="text-[28px] tracking-[-0.7px]">
            Your stickers
          </h2>
          <p className="mt-1 text-[15px] text-muted">Drag one into the Consumed zone, or press Eat. Each adds one serving.</p>
          {stickers.length === 0 ? (
            <div className="mt-5 rounded-[28px] border-2 border-dashed border-line p-8 text-center">
              <p className="font-bold">No stickers yet.</p>
              <Link href="/new" className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-coral px-5 font-bold text-bg">
                <Plus size={18} aria-hidden="true" /> New sticker
              </Link>
            </div>
          ) : (
            <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] sm:gap-5">
              {stickers.map((s, i) => (
                <li
                  key={s.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(DRAG_TYPE, s.id);
                    e.dataTransfer.setData("text/plain", s.title);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  style={{ transform: `rotate(${ROT[i % ROT.length]}deg)` }}
                  className="flex cursor-grab flex-col overflow-hidden rounded-[22px] border-[5px] border-white bg-face text-sticker-ink shadow-[0_10px_22px_rgba(0,0,0,0.4)] active:cursor-grabbing"
                >
                  <div className="relative h-20 bg-chip">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.thumbnail} alt="" className="size-full object-cover" draggable={false} />
                    <GripVertical size={18} className="absolute top-2 right-2 rounded bg-white/80 text-sticker-ink" aria-hidden="true" />
                  </div>
                  <div className="flex flex-1 flex-col px-3.5 pt-3 pb-3.5">
                    <p className="font-display text-lg leading-[1.1] font-extrabold">{s.title}</p>
                    <p className="mt-1 text-[13px] text-sticker-muted">
                      {s.kcalPerServing} kcal · {s.proteinPerServing} g protein
                    </p>
                    <div className="mt-auto pt-2.5">
                      <button
                        type="button"
                        onClick={() => void eat(s)}
                        disabled={busyId !== null || !day}
                        aria-label={`Eat one serving of ${s.title}`}
                        className="min-h-11 w-full rounded-xl bg-sticker-ink text-[15px] font-bold text-face disabled:opacity-60"
                      >
                        {busyId === s.id ? "Adding..." : "Eat"}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-5">
          <section
            aria-labelledby="consumed-h"
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes(DRAG_TYPE)) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
                setDragOver(true);
              }
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const s = stickers.find((x) => x.id === e.dataTransfer.getData(DRAG_TYPE));
              if (s) void eat(s);
            }}
            className={`rounded-[28px] border-[3px] border-dashed px-6 py-[22px] transition ${
              dragOver ? "border-butter bg-panel" : "border-[#5C7A6B] bg-bg"
            }`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="consumed-h" className="text-[26px] tracking-[-0.6px]">
                Consumed today
              </h2>
              <p className="text-sm text-muted">{dragOver ? "Let go to add it" : "Drop stickers here"}</p>
            </div>
            {data && data.meals.length === 0 && (
              <p className="mt-4 rounded-2xl bg-panel p-4 text-muted">Nothing yet. Drop a sticker here or press Eat.</p>
            )}
            {busyId && (
              <p className="mt-3 flex items-center gap-2 text-sm text-muted">
                <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> Adding...
              </p>
            )}
            <ul className="mt-3.5 flex flex-col gap-2">
              {data?.meals.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-x-2.5 gap-y-1 rounded-2xl bg-panel py-2 pr-2 pl-4">
                  <span className="min-w-[9rem] flex-1 text-base font-bold">{m.name}</span>
                  <span className="ml-auto flex flex-none items-center gap-2.5 text-sm text-muted">
                    <span>
                      {m.kcal} kcal · {m.proteinG} g
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${m.name}`}
                      onClick={() => void remove(m)}
                      className="min-h-11 rounded-xl border-2 border-ink px-3.5 text-sm font-bold text-ink hover:bg-ink/10"
                    >
                      Remove
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {data && (
            <TwistCard
              leftKcal={leftKcal}
              leftProtein={Math.max(0, leftProtein)}
              day={day}
              units={goals.units}
              onAccepted={onTwistAccepted}
            />
          )}
        </div>
      </div>
    </>
  );
}

function addMeal(d: DayData | null, m: Meal): DayData {
  const meals = [...(d?.meals ?? []), m];
  return { meals, totals: { kcal: (d?.totals.kcal ?? 0) + m.kcal, proteinG: (d?.totals.proteinG ?? 0) + m.proteinG } };
}

function sub(t: DayData["totals"], m: Meal) {
  return { kcal: t.kcal - m.kcal, proteinG: t.proteinG - m.proteinG };
}

function BigBar({
  label,
  value,
  goal,
  unit,
  color,
  left,
  leftWord,
  loading,
}: {
  label: string;
  value: number;
  goal: number;
  unit: string;
  color: string;
  left: number;
  leftWord: string;
  loading: boolean;
}) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  return (
    <div className="min-w-0 flex-[1_1_300px]">
      <div className="flex items-baseline justify-between text-[17px] font-bold">
        <span>{label}</span>
        <span>
          {loading ? "..." : value.toLocaleString("en-US")} of {goal.toLocaleString("en-US")} {unit}
        </span>
      </div>
      <div
        className="mt-2.5 h-6 overflow-hidden rounded-xl bg-line"
        role="progressbar"
        aria-label={`${label} eaten today`}
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={value}
        aria-valuetext={`${value} of ${goal} ${unit}`}
      >
        <div className={`h-6 rounded-xl ${color} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-sm text-muted">
        {loading ? " " : left >= 0 ? `${left.toLocaleString("en-US")} ${unit} ${leftWord}` : `${(-left).toLocaleString("en-US")} ${unit} over`}
      </p>
    </div>
  );
}

function TwistCard({
  leftKcal,
  leftProtein,
  day,
  units,
  onAccepted,
}: {
  leftKcal: number;
  leftProtein: number;
  day: string | null;
  units: UserSettings["units"];
  onAccepted: (m: Meal) => void;
}) {
  const [draft, setDraft] = useState<TwistDraft | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "accepting" | "error">("idle");
  const [error, setError] = useState("");
  const [seen, setSeen] = useState<string[]>([]);
  const [madeFor, setMadeFor] = useState<number | null>(null);

  if (leftKcal < TWIST_MIN_KCAL) {
    return (
      <div className="rounded-[28px] border-2 border-line bg-panel px-[26px] py-6">
        <p className="inline-block rounded-full bg-bg px-3 py-1 text-[13px] font-bold text-butter">Smart twist</p>
        <p className="mt-3 font-display text-2xl font-extrabold">You are close to your goal</p>
        <p className="mt-1 text-muted">Under {TWIST_MIN_KCAL} kcal left today, so no twist needed.</p>
      </div>
    );
  }

  const fetchTwist = async () => {
    setState("loading");
    setError("");
    try {
      const { draft: d } = await fetchJson<{ draft: TwistDraft }>("/api/twist", {
        method: "POST",
        json: { remainingKcal: leftKcal, remainingProteinG: leftProtein, avoid: seen.slice(-5) },
      });
      setDraft(d);
      setSeen((s) => [...s, d.title]);
      setMadeFor(leftKcal);
      setState("idle");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not get a suggestion.");
      setState("error");
    }
  };

  const accept = async () => {
    if (!draft || !day) return;
    setState("accepting");
    try {
      const { meal } = await fetchJson<{ meal: Meal }>("/api/twist/accept", { method: "POST", json: { draft, day } });
      setDraft(null);
      setState("idle");
      onAccepted(meal);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not add it.");
      setState("error");
    }
  };

  const stale = draft && madeFor !== leftKcal;
  const loading = state === "loading";

  return (
    <section aria-labelledby="twist-h" aria-busy={loading} className="rounded-[28px] bg-butter px-[26px] py-6 text-bg">
      <p className="inline-flex items-center gap-1.5 rounded-full bg-bg px-3 py-1 text-[13px] font-bold text-butter">
        <Sparkles size={14} aria-hidden="true" /> Smart twist
      </p>
      {draft ? (
        <>
          <h2 id="twist-h" className="mt-3 text-[34px] leading-[1.08] tracking-[-0.9px]">
            {draft.title}
          </h2>
          <p className="mt-2 text-base leading-normal">
            You have {leftKcal.toLocaleString("en-US")} kcal and {leftProtein} g protein left today. This portion lands at{" "}
            <strong>
              {draft.kcal} kcal and {draft.proteinG} g protein
            </strong>
            , about {formatCents(draft.homeCostCents)} to make. {draft.totalMinutes} minutes.
          </p>
          {stale && <p className="mt-2 text-sm font-bold">Your numbers changed. Show another to resize it.</p>}
          <ul className="mt-3.5">
            {draft.ingredients.map((i) => (
              <li key={i.name} className="flex justify-between gap-3 border-b-2 border-bg/20 py-2 text-base">
                <span>{i.name}</span>
                <span className="font-bold whitespace-nowrap">{formatAmount(i.gramsPerServing, i.name, units)}</span>
              </li>
            ))}
          </ul>
          <details className="mt-3">
            <summary className="min-h-11 cursor-pointer py-2 font-bold">Steps</summary>
            <ol className="list-decimal space-y-1 pl-5">
              {draft.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </details>
          <div className="mt-[18px] flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={accept}
              disabled={state !== "idle" || Boolean(stale)}
              className="min-h-[52px] rounded-2xl bg-bg px-7 text-base font-bold text-butter disabled:opacity-60"
            >
              {state === "accepting" ? "Adding..." : "Add to my day"}
            </button>
            <button
              type="button"
              onClick={fetchTwist}
              disabled={state !== "idle" && state !== "error"}
              className="flex min-h-[52px] items-center gap-2 rounded-2xl border-2 border-bg px-6 text-base font-bold disabled:opacity-60"
            >
              {loading && <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />}
              Show another
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 id="twist-h" className="mt-3 text-[30px] leading-[1.08] tracking-[-0.8px]">
            A meal sized to what is left
          </h2>
          <p className="mt-2 text-base leading-normal">
            You have {leftKcal.toLocaleString("en-US")} kcal and {leftProtein} g protein left today. Get one recipe sized to
            fit, in 30 minutes or less.
          </p>
          <button
            type="button"
            onClick={fetchTwist}
            disabled={loading}
            className="mt-[18px] flex min-h-[52px] items-center gap-2 rounded-2xl bg-bg px-7 text-base font-bold text-butter disabled:opacity-60"
          >
            {loading ? (
              <>
                <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> Sizing a meal...
              </>
            ) : (
              "Size a meal for me"
            )}
          </button>
        </>
      )}
      {state === "error" && (
        <p role="alert" className="mt-3 font-bold">
          {error}
        </p>
      )}
      <p className="mt-3.5 text-[13px]">Calories come from USDA data and are estimates.</p>
    </section>
  );
}
