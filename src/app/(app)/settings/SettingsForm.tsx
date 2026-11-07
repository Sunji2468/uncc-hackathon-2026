"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus, X } from "lucide-react";
import { DIETS, type Diet, type UserSettings } from "@/types";
import { CALORIE_GOAL, PROTEIN_GOAL, clampStep } from "@/lib/settings";

type SaveState = "idle" | "saving" | "saved" | "error";

const DIET_LABELS: Record<Diet, string> = {
  vegetarian: "Vegetarian",
  "gluten-free": "Gluten-free",
  "nut-free": "Nut-free",
  "dairy-free": "Dairy-free",
};

const DEMO_KEY = "th_demo"; // cookie name, read by isDemo() on the server

const panel = "rounded-[28px] border-2 border-line bg-panel px-6 py-6 md:px-[26px]";
const h2 = "text-[26px] tracking-[-0.6px]";

export function SettingsForm({ initial, demo }: { initial: UserSettings; demo: { on: boolean; forced: boolean } }) {
  const [settings, setSettings] = useState<UserSettings>(initial);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");
  // What the server last confirmed. Saving only on a real difference (not on
  // "first render") also stays correct when React runs effects twice in dev.
  const lastSaved = useRef(JSON.stringify(initial));

  // Debounced autosave whenever settings actually change.
  useEffect(() => {
    const snapshot = JSON.stringify(settings);
    if (snapshot === lastSaved.current) return;
    setSaveState("saving");
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          // A blank name is simply not sent, so the rest still saves.
          body: JSON.stringify({ ...settings, displayName: settings.displayName?.trim() || undefined }),
          signal: controller.signal,
        });
        const body: unknown = await res.json();
        if (!res.ok) {
          const message =
            typeof body === "object" && body && "error" in body
              ? String((body as { error: { message: string } }).error.message)
              : "Could not save.";
          throw new Error(message);
        }
        lastSaved.current = snapshot;
        setSaveState("saved");
      } catch (err) {
        if (controller.signal.aborted) return;
        setSaveError(err instanceof Error ? err.message : "Could not save.");
        setSaveState("error");
      }
    }, 450);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [settings]);

  // If someone leaves within the debounce window, send the pending change anyway.
  const latest = useRef(settings);
  latest.current = settings;
  useEffect(() => {
    const flush = () => {
      const s = latest.current;
      if (JSON.stringify(s) === lastSaved.current) return;
      lastSaved.current = JSON.stringify(s);
      void fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...s, displayName: s.displayName?.trim() || undefined }),
        keepalive: true, // survives navigation and tab close
      }).catch(() => {});
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush(); // client-side navigation away from Settings
    };
  }, []);

  const update = (patch: Partial<UserSettings>) => setSettings((s) => ({ ...s, ...patch }));

  return (
    <>
      <SaveStatus state={saveState} error={saveError} />

      <div className="mt-6 flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-6">
          <section className={panel} aria-labelledby="name-h">
            <h2 id="name-h" className={h2}>
              Your name on the Fridge
            </h2>
            <p className="mt-1 text-sm text-muted">Shown on dishes and notes you share. No account needed.</p>
            <label htmlFor="display-name" className="sr-only">
              Display name
            </label>
            <input
              id="display-name"
              value={settings.displayName ?? ""}
              maxLength={24}
              autoComplete="nickname"
              onChange={(e) => update({ displayName: e.target.value })}
              placeholder="Guest"
              className="mt-3.5 min-h-12 w-full max-w-sm rounded-[14px] border-2 border-line bg-face px-4 text-base font-bold text-sticker-ink placeholder:text-sticker-muted"
            />
          </section>

          <section className={panel} aria-labelledby="goals-h">
            <h2 id="goals-h" className={h2}>
              Daily goals
            </h2>
            <Stepper
              label="Calories"
              value={settings.calorieGoal}
              format={(v) => `${v.toLocaleString("en-US")} kcal`}
              range={CALORIE_GOAL}
              noun="calorie goal"
              onChange={(calorieGoal) => update({ calorieGoal })}
            />
            <Stepper
              label="Protein"
              value={settings.proteinGoal}
              format={(v) => `${v} g`}
              range={PROTEIN_GOAL}
              noun="protein goal"
              onChange={(proteinGoal) => update({ proteinGoal })}
            />
          </section>

          <section className={panel} aria-labelledby="units-h">
            <h2 id="units-h" className={h2}>
              Units
            </h2>
            <div
              role="group"
              aria-labelledby="units-h"
              className="mt-3.5 inline-flex gap-1 rounded-full border-2 border-line bg-bg p-1"
            >
              {(
                [
                  ["metric", "Metric (g, ml)"],
                  ["us", "US (oz, cups)"],
                ] as const
              ).map(([value, label]) => {
                const on = settings.units === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => update({ units: value })}
                    className={`min-h-12 rounded-full px-4 text-[15px] font-bold whitespace-nowrap transition sm:px-6 sm:text-base ${
                      on ? "bg-butter text-bg" : "text-ink hover:bg-panel"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </section>

          <DemoModeToggle initialOn={demo.on} forced={demo.forced} />
        </div>

        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-6">
          <section className={panel} aria-labelledby="diet-h">
            <h2 id="diet-h" className={h2}>
              Dietary needs
            </h2>
            <p className="mt-1 text-sm text-muted">Applied to every recipe, swap and suggestion.</p>
            <div className="mt-2.5 flex flex-col gap-0.5">
              {DIETS.map((diet) => (
                <label
                  key={diet}
                  className="flex min-h-14 cursor-pointer items-center justify-between text-[17px] font-bold"
                >
                  {DIET_LABELS[diet]}
                  <input
                    type="checkbox"
                    checked={settings.diets.includes(diet)}
                    onChange={(e) =>
                      update({
                        diets: e.target.checked
                          ? [...settings.diets, diet]
                          : settings.diets.filter((d) => d !== diet),
                      })
                    }
                  />
                </label>
              ))}
            </div>
          </section>

          <Allergies value={settings.allergies} onChange={(allergies) => update({ allergies })} />

          <ClearBoard />
        </div>
      </div>
    </>
  );
}

function SaveStatus({ state, error }: { state: SaveState; error: string }) {
  return (
    <p role="status" aria-live="polite" className="mt-3 min-h-6 text-sm font-bold">
      {state === "saving" && <span className="text-muted">Saving...</span>}
      {state === "saved" && (
        <span className="inline-flex items-center gap-1.5 text-butter">
          <Check size={16} aria-hidden="true" /> Saved
        </span>
      )}
      {state === "error" && <span className="text-coral">Not saved: {error}</span>}
    </p>
  );
}

function Stepper({
  label,
  value,
  format,
  range,
  noun,
  onChange,
}: {
  label: string;
  value: number;
  format: (v: number) => string;
  range: { min: number; max: number; step: number };
  noun: string;
  onChange: (v: number) => void;
}) {
  const btn =
    "flex size-12 items-center justify-center rounded-[14px] border-2 border-ink text-ink transition hover:bg-ink/10 disabled:opacity-40";
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <span className="basis-full text-[17px] font-bold sm:basis-auto">{label}</span>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          aria-label={`Lower the ${noun}`}
          className={btn}
          disabled={value <= range.min}
          onClick={() => onChange(clampStep(value - range.step, range))}
        >
          <Minus size={22} aria-hidden="true" />
        </button>
        <span className="min-w-[110px] text-center text-[22px] font-extrabold" aria-live="polite">
          {format(value)}
        </span>
        <button
          type="button"
          aria-label={`Raise the ${noun}`}
          className={btn}
          disabled={value >= range.max}
          onClick={() => onChange(clampStep(value + range.step, range))}
        >
          <Plus size={22} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function Allergies({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const commit = () => {
    const v = draft.trim().toLowerCase().slice(0, 40);
    if (v && !value.includes(v) && value.length < 20) onChange([...value, v]);
    setDraft("");
    setAdding(false);
  };

  return (
    <section className={panel} aria-labelledby="allergy-h">
      <h2 id="allergy-h" className={h2}>
        Allergies
      </h2>
      <p className="mt-1 text-sm text-muted">Never included in a recipe or suggested as a swap.</p>
      <ul className="mt-3.5 flex flex-wrap gap-2">
        {value.map((a) => (
          <li
            key={a}
            className="flex min-h-11 items-center gap-1 rounded-full bg-ink pr-1 pl-4 text-base font-bold text-bg capitalize"
          >
            {a}
            <button
              type="button"
              aria-label={`Remove ${a}`}
              onClick={() => onChange(value.filter((x) => x !== a))}
              className="flex size-9 items-center justify-center rounded-full hover:bg-bg/10"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </li>
        ))}
        <li>
          {adding ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                commit();
              }}
              className="flex items-center gap-2"
            >
              <label htmlFor="allergy-input" className="sr-only">
                Allergy
              </label>
              <input
                id="allergy-input"
                ref={inputRef}
                value={draft}
                maxLength={40}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setDraft("");
                    setAdding(false);
                  }
                }}
                placeholder="e.g. sesame"
                className="min-h-11 w-40 rounded-full border-2 border-butter bg-bg px-4 text-base text-ink placeholder:text-muted"
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex min-h-11 items-center gap-1.5 rounded-full border-2 border-dashed border-muted px-4 text-base font-bold text-ink hover:border-ink"
            >
              <Plus size={18} aria-hidden="true" />
              Add an allergy
            </button>
          )}
        </li>
      </ul>
    </section>
  );
}

function DemoModeToggle({ initialOn, forced }: { initialOn: boolean; forced: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initialOn || forced);

  return (
    <section className={`${panel} py-2`}>
      <label className="flex min-h-20 cursor-pointer items-center justify-between gap-4 text-[17px] font-bold">
        <span>
          Demo mode
          <span className="mt-0.5 block text-sm font-normal text-muted">
            {forced
              ? "Turned on for this whole server (DEMO_MODE=true). No AI calls are made."
              : "Use saved results instead of AI for every photo, recipe, swap and twist, so presentations work without wifi or API keys."}
          </span>
        </span>
        <input
          type="checkbox"
          checked={on}
          disabled={forced}
          onChange={(e) => {
            const next = e.target.checked;
            setOn(next);
            // A plain cookie (not secret) so the server can serve fixtures for this browser.
            document.cookie = `${DEMO_KEY}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
            router.refresh();
          }}
        />
      </label>
    </section>
  );
}

function ClearBoard() {
  const [confirming, setConfirming] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  const clear = async () => {
    setState("busy");
    try {
      const res = await fetch("/api/data", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setState("done");
      setConfirming(false);
    } catch {
      setState("error");
    }
  };

  return (
    <section className={panel} aria-labelledby="data-h">
      <h2 id="data-h" className={h2}>
        Your data
      </h2>
      <p className="mt-1 text-sm text-muted">
        Removes your stickers, meals and Fridge posts. Your goals and diet stay.
      </p>
      {confirming ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={clear}
            disabled={state === "busy"}
            className="min-h-[52px] rounded-2xl bg-coral px-6 font-bold text-bg"
          >
            {state === "busy" ? "Clearing..." : "Yes, clear everything"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="min-h-[52px] rounded-2xl border-2 border-ink px-6 font-bold"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setState("idle");
            setConfirming(true);
          }}
          className="mt-4 min-h-[52px] rounded-2xl border-2 border-ink px-6 font-bold hover:bg-ink/10"
        >
          Clear my board
        </button>
      )}
      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm font-bold">
        {state === "done" && <span className="text-butter">Board cleared.</span>}
        {state === "error" && <span className="text-coral">Could not clear the board. Try again.</span>}
      </p>
    </section>
  );
}
