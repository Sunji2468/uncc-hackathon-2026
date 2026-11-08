"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Box, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StickerTile, tileTilt } from "@/components/StickerTile";
import { filterStickers, totalKept, type BoardFilter, type StickerSummary } from "@/lib/sticker-summary";
import { formatCents } from "@/lib/money";
import { localDay } from "@/lib/day";
import { fetchJson } from "@/lib/client/fetch-json";

const FILTERS: { id: BoardFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "heists", label: "Restaurant heists" },
  { id: "mystery", label: "Mystery Boxes" },
];

export function Board({ initial, initialFilter, signedIn }: { initial: StickerSummary[]; initialFilter: BoardFilter; signedIn: boolean }) {
  const [stickers, setStickers] = useState(initial);
  const [filter, setFilter] = useState<BoardFilter>(initialFilter);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // The filter lives in the URL so a reload or shared link renders it server-side, with no flash.
  const choose = (f: BoardFilter) => {
    setFilter(f);
    const url = new URL(window.location.href);
    if (f === "all") url.searchParams.delete("filter");
    else url.searchParams.set("filter", f);
    window.history.replaceState(null, "", url);
  };

  const remove = async (s: StickerSummary) => {
    setConfirmId(null);
    setError("");
    const before = stickers;
    setStickers((list) => list.filter((x) => x.id !== s.id));
    try {
      await fetchJson(`/api/stickers/${s.id}`, { method: "DELETE" });
    } catch {
      setStickers(before);
      setError(`Could not delete ${s.title}. Please try again.`);
    }
  };

  const shown = filterStickers(stickers, filter);
  const kept = totalKept(stickers);
  const count = stickers.length;

  return (
    <>
      <PageHeader
        title="Your board"
        subtitle={count === 0 ? "Nothing here yet." : `${count} ${count === 1 ? "sticker" : "stickers"}, ${signedIn ? "saved to your account" : "saved in this browser"}.`}
      >
        <div role="group" aria-label="Filter stickers" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => choose(f.id)}
              className={`min-h-11 rounded-full border-2 px-[18px] text-[15px] font-bold transition ${
                filter === f.id ? "border-butter bg-butter text-bg" : "border-ink text-ink hover:bg-ink/10"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </PageHeader>

      {error && (
        <p role="alert" className="mt-4 rounded-2xl bg-coral/15 p-4 font-bold">
          {error}
        </p>
      )}

      <div className="mt-7 flex flex-wrap items-start gap-7">
        <div className="dotted-board min-h-[420px] min-w-0 flex-[1_1_640px] rounded-[32px] border-2 border-line p-4 sm:p-8">
          {shown.length === 0 ? (
            <EmptyBoard filter={filter} hasAny={count > 0} onShowAll={() => choose("all")} />
          ) : (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-x-7 sm:gap-y-8">
              {shown.map((s, i) => (
                <li key={s.id} className="relative" style={{ marginTop: tileTilt(i).offset }}>
                  <StickerTile s={s} index={i} />
                  {confirmId === s.id ? (
                    <div
                      role="alertdialog"
                      aria-label={`Delete ${s.title}?`}
                      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-[26px] bg-bg/95 p-3 text-center"
                    >
                      <p className="font-bold">Delete {s.title}?</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          autoFocus
                          onClick={() => void remove(s)}
                          className="min-h-11 rounded-xl bg-coral px-4 font-bold text-bg"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmId(null)}
                          className="min-h-11 rounded-xl border-2 border-ink px-4 font-bold"
                        >
                          Keep
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Delete the ${s.title} sticker`}
                      onClick={() => setConfirmId(s.id)}
                      className="absolute -top-2 -right-2 z-10 flex size-11 items-center justify-center rounded-full border-2 border-line bg-bg text-muted shadow-lg transition hover:text-coral"
                    >
                      <Trash2 size={18} aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex min-w-[280px] flex-[0_1_340px] flex-col gap-5 max-sm:min-w-0 max-sm:flex-[1_1_100%]">
          <TodayAndTwist />
          <div className="rounded-[28px] border-2 border-line bg-panel p-[22px]">
            <p className="text-sm font-bold text-muted">
              Kept across {kept.dishes} {kept.dishes === 1 ? "dish" : "dishes"}
            </p>
            <p className="mt-1.5 font-display text-[56px] leading-none font-extrabold tracking-[-1.5px] text-butter">
              {formatCents(kept.cents)}
            </p>
            <p className="mt-2 text-[13px] text-muted">One plate each, menu price minus estimated home cost.</p>
          </div>
        </div>
      </div>
    </>
  );
}

function EmptyBoard({ filter, hasAny, onShowAll }: { filter: BoardFilter; hasAny: boolean; onShowAll: () => void }) {
  if (filter === "mystery") {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 text-center">
        <Box size={40} className="text-butter" aria-hidden="true" />
        <p className="font-display text-2xl font-extrabold">No Mystery Boxes yet</p>
        <p className="max-w-sm text-muted">Photograph what is on your counter and get a recipe that uses only that.</p>
        <Link href="/mystery" className="mt-2 flex min-h-[52px] items-center rounded-2xl bg-butter px-6 font-bold text-bg">
          Open a Mystery Box
        </Link>
      </div>
    );
  }
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 text-center">
      <p className="font-display text-3xl font-extrabold tracking-[-0.6px]">
        {filter === "heists" && hasAny ? "No restaurant heists yet" : "No stickers yet"}
      </p>
      <p className="max-w-sm text-muted">Photograph a restaurant dish to see what it costs to cook at home.</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Link href="/new" className="flex min-h-[52px] items-center gap-2 rounded-2xl bg-coral px-6 font-bold text-bg">
          <Plus size={20} strokeWidth={2.4} aria-hidden="true" /> New sticker
        </Link>
        {filter !== "all" && hasAny && (
          <button type="button" onClick={onShowAll} className="min-h-[52px] rounded-2xl border-2 border-ink px-6 font-bold">
            Show all
          </button>
        )}
      </div>
    </div>
  );
}

interface MealsResponse {
  totals: { kcal: number; proteinG: number };
  goals: { calorieGoal: number; proteinGoal: number };
}

function TodayAndTwist() {
  const [data, setData] = useState<MealsResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetchJson<MealsResponse>(`/api/meals?day=${localDay()}`)
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  if (failed) {
    return (
      <div className="rounded-[28px] border-2 border-line bg-panel p-[22px]">
        <h2 className="text-2xl tracking-[-0.5px]">Today</h2>
        <p className="mt-2 text-sm text-muted">Could not load today&apos;s meals. Refresh to try again.</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-[28px] border-2 border-line bg-panel p-[22px]" aria-busy="true">
        <h2 className="text-2xl tracking-[-0.5px]">Today</h2>
        <div className="mt-4 h-4 animate-pulse rounded-lg bg-line motion-reduce:animate-none" />
        <div className="mt-6 h-4 animate-pulse rounded-lg bg-line motion-reduce:animate-none" />
      </div>
    );
  }

  const { totals, goals } = data;
  const remainingKcal = goals.calorieGoal - totals.kcal;
  const remainingProtein = Math.max(0, goals.proteinGoal - totals.proteinG);

  return (
    <>
      <Link href="/macros" className="block rounded-[28px] border-2 border-line bg-panel p-[22px] hover:border-muted">
        <h2 className="text-2xl tracking-[-0.5px]">Today</h2>
        <Bar label="Calories" value={totals.kcal} goal={goals.calorieGoal} unit="kcal" color="bg-coral" />
        <Bar label="Protein" value={totals.proteinG} goal={goals.proteinGoal} unit="g" color="bg-butter" />
      </Link>

      <Link href="/macros" className="block rounded-[28px] bg-butter p-[22px] text-bg hover:brightness-105">
        <p className="inline-block rounded-full bg-bg px-2.5 py-1 text-xs font-bold text-butter">Smart twist</p>
        {remainingKcal >= 250 ? (
          <>
            <h2 className="mt-2.5 text-[26px] leading-[1.1] tracking-[-0.6px]">A meal sized to what is left</h2>
            <p className="mt-2 text-[15px] leading-snug">
              Get a recipe for the {remainingKcal.toLocaleString("en-US")} kcal and {remainingProtein} g protein you have
              left today.
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-2.5 text-[26px] leading-[1.1] tracking-[-0.6px]">You are close to your goal</h2>
            <p className="mt-2 text-[15px] leading-snug">Under 250 kcal left today, so no twist needed.</p>
          </>
        )}
      </Link>
    </>
  );
}

function Bar({ label, value, goal, unit, color }: { label: string; value: number; goal: number; unit: string; color: string }) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  return (
    <div className="mt-3.5">
      <div className="flex items-baseline justify-between text-[15px] font-bold">
        <span>{label}</span>
        <span>
          {value.toLocaleString("en-US")} of {goal.toLocaleString("en-US")} {unit}
        </span>
      </div>
      <div
        className="mt-2 h-4 overflow-hidden rounded-lg bg-line"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={value}
      >
        <div className={`h-4 rounded-lg ${color} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
