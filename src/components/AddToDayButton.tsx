"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Utensils } from "lucide-react";
import { localDay } from "@/lib/day";
import { ApiRequestError, fetchJson } from "@/lib/client/fetch-json";
import type { Meal } from "@/types";

/** Logs one serving of a sticker to today. The server computes the macros. */
export function AddToDayButton({ stickerId, tone = "dark" }: { stickerId: string; tone?: "dark" | "light" }) {
  const outline = tone === "dark" ? "border-ink text-ink hover:bg-ink/10" : "border-sticker-ink text-sticker-ink hover:bg-sticker-ink/10";
  const doneTone = tone === "dark" ? "border-butter text-butter" : "border-sticker-ink bg-butter text-sticker-ink";
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [meal, setMeal] = useState<Meal | null>(null);
  const [error, setError] = useState("");

  const add = async () => {
    setState("busy");
    try {
      const res = await fetchJson<{ meal: Meal }>("/api/meals", {
        method: "POST",
        // Name and numbers are placeholders: the server recomputes them from the sticker.
        json: { stickerId, name: "sticker", kcal: 0, proteinG: 0, day: localDay() },
      });
      setMeal(res.meal);
      setState("done");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not add it.");
      setState("error");
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {state === "done" && meal ? (
        <Link
          href="/macros"
          className={`flex min-h-14 items-center justify-center gap-2.5 rounded-2xl border-2 px-6 text-[17px] font-bold ${doneTone}`}
        >
          <Check size={20} aria-hidden="true" /> Added {meal.kcal} kcal. See today
        </Link>
      ) : (
        <button
          type="button"
          onClick={add}
          disabled={state === "busy"}
          className={`flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl border-2 px-6 text-[17px] font-bold disabled:opacity-60 ${outline}`}
        >
          <Utensils size={20} aria-hidden="true" /> {state === "busy" ? "Adding..." : "Add to my day"}
        </button>
      )}
      <p role="status" aria-live="polite" className="text-sm font-bold text-coral">
        {state === "error" ? error : ""}
      </p>
    </div>
  );
}
