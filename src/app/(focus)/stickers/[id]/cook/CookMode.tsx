"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Minus, Pause, Play, Plus, RotateCcw, Sun } from "lucide-react";
import type { Units } from "@/types";
import type { StickerView } from "@/lib/sticker-view";
import { formatAmount } from "@/lib/scale";
import { formatClock, ingredientsForStep, shortStep, stepTimerSeconds } from "@/lib/cook";
import { AddToDayButton } from "@/components/AddToDayButton";

export function CookMode({ view, units }: { view: StickerView; units: Units }) {
  const steps = view.steps.length ? view.steps : ["Cook and enjoy."];
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const wakeLock = useWakeLock();

  const go = useCallback(
    (i: number) => {
      if (i >= steps.length) {
        setFinished(true);
        return;
      }
      setFinished(false);
      setIndex(Math.max(0, i));
    },
    [steps.length],
  );

  useEffect(() => {
    headingRef.current?.focus();
  }, [index, finished]);

  // Arrow keys move between steps (ignored while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea")) return;
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index]);

  const step = steps[index];
  const needed = ingredientsForStep(step, view.ingredients);

  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-6 pb-14 md:px-10 md:pt-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/stickers/${view.id}`}
          className="flex min-h-12 items-center gap-2 rounded-full border-2 border-line bg-panel px-5 text-[15px] font-bold hover:border-muted"
        >
          <ArrowLeft size={18} aria-hidden="true" /> Exit cook mode
        </Link>
        <div className="text-right">
          <p className="font-display text-[26px] font-extrabold tracking-[-0.6px]">{view.title}</p>
          <p className="text-sm text-muted">
            Serves {view.servings}
            {wakeLock && (
              <span className="ml-2 inline-flex items-center gap-1">
                · <Sun size={13} aria-hidden="true" /> Screen stays on
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="mt-7 flex gap-2.5" aria-hidden="true">
        {steps.map((_, i) => (
          <span key={i} className={`h-2.5 flex-1 rounded-full ${finished || i <= index ? "bg-butter" : "bg-line"}`} />
        ))}
      </div>

      {finished ? (
        <div className="mt-10 flex flex-col items-start gap-5">
          <h1 ref={headingRef} tabIndex={-1} className="text-5xl tracking-[-1.5px] focus:outline-none md:text-[64px]">
            Done. Enjoy your {view.title}.
          </h1>
          <p className="text-lg text-muted">Log it to today&apos;s macro budget, or head back to the sticker.</p>
          <div className="flex flex-wrap gap-3">
            <AddToDayButton stickerId={view.id} />
            <Link href={`/stickers/${view.id}`} className="flex min-h-14 items-center rounded-2xl bg-butter px-8 text-[17px] font-bold text-bg">
              Back to the sticker
            </Link>
            <button type="button" onClick={() => go(steps.length - 1)} className="min-h-14 rounded-2xl px-5 font-bold text-muted hover:text-ink">
              Back to the last step
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-3.5 text-lg font-bold text-butter" aria-live="polite">
            Step {index + 1} of {steps.length}
          </p>

          <div className="mt-6 flex flex-wrap items-start gap-12">
            <div className="min-w-0 flex-[1_1_520px]">
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="text-[40px] leading-[1.08] tracking-[-1.2px] focus:outline-none md:text-[64px] md:tracking-[-2px]"
              >
                {step}
              </h1>

              {needed.length > 0 && (
                <div className="mt-8">
                  <p className="text-[15px] font-bold text-butter">You need for this step</p>
                  <ul className="mt-2.5 flex flex-wrap gap-2.5">
                    {needed.map((i) => (
                      <li key={i.id} className="rounded-full bg-ink px-[18px] py-2.5 text-[17px] font-bold text-bg">
                        {i.name} {formatAmount(i.grams, i.name, units)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-10 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => go(index - 1)}
                  disabled={index === 0}
                  className="min-h-16 rounded-[18px] border-2 border-ink px-9 text-[19px] font-bold hover:bg-ink/10 disabled:opacity-40"
                >
                  Previous step
                </button>
                <button
                  type="button"
                  onClick={() => go(index + 1)}
                  className="min-h-16 rounded-[18px] bg-butter px-11 text-[19px] font-bold text-bg hover:brightness-105"
                >
                  {index === steps.length - 1 ? "Finish" : "Next step"}
                </button>
              </div>
              <p className="mt-3 hidden text-sm text-muted md:block">Tip: the left and right arrow keys move between steps.</p>
            </div>

            <div className="flex min-w-[280px] flex-[0_1_360px] flex-col gap-5 max-sm:min-w-0 max-sm:flex-[1_1_100%]">
              <Timer key={index} step={step} />

              <nav aria-label="All steps" className="rounded-[28px] border-2 border-line bg-panel p-[22px]">
                <p className="text-base font-bold">All steps</p>
                <ol className="mt-3 flex flex-col gap-2">
                  {steps.map((s, i) => {
                    const done = i < index;
                    const current = i === index;
                    return (
                      <li key={i}>
                        <button
                          type="button"
                          onClick={() => go(i)}
                          aria-current={current ? "step" : undefined}
                          className={`flex min-h-11 w-full items-center gap-3 rounded-[14px] px-3 py-2 text-left text-[15px] ${
                            current ? "border-2 border-butter bg-bg font-bold" : done ? "text-muted hover:bg-bg" : "hover:bg-bg"
                          }`}
                        >
                          <span
                            className={`flex size-[30px] flex-none items-center justify-center rounded-full text-sm font-extrabold ${
                              done ? "bg-butter text-bg" : current ? "bg-coral text-bg" : "border-2 border-muted text-muted"
                            }`}
                          >
                            {done ? <Check size={16} aria-label="done" /> : i + 1}
                          </span>
                          {shortStep(s)}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </nav>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** A per-step countdown. Re-keyed on each step so it starts from that step's duration. */
function Timer({ step }: { step: string }) {
  const initial = stepTimerSeconds(step);
  const [duration, setDuration] = useState(initial.seconds);
  const [left, setLeft] = useState(initial.seconds);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const endAt = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const remaining = Math.max(0, Math.round(((endAt.current ?? Date.now()) - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) {
        setRunning(false);
        setDone(true);
        alarm();
      }
    }, 250);
    return () => clearInterval(t);
  }, [running]);

  const start = () => {
    const from = left > 0 ? left : duration;
    endAt.current = Date.now() + from * 1000;
    setLeft(from);
    setDone(false);
    setRunning(true);
  };
  const pause = () => setRunning(false);
  const reset = () => {
    setRunning(false);
    setDone(false);
    setLeft(duration);
  };
  const adjust = (delta: number) => {
    const next = Math.min(6 * 3600, Math.max(30, (running ? left : duration) + delta));
    if (running) endAt.current = Date.now() + next * 1000;
    else setDuration(next);
    setLeft(next);
    setDone(false);
  };

  const r = 96;
  const circ = 2 * Math.PI * r;
  const frac = duration > 0 ? left / Math.max(duration, left) : 0;

  return (
    <section aria-label="Step timer" className="flex flex-col items-center rounded-[28px] border-2 border-line bg-panel p-7">
      <div className="relative size-[220px]">
        <svg width="220" height="220" viewBox="0 0 220 220" aria-hidden="true" className="-rotate-90">
          <circle cx="110" cy="110" r={r} fill="none" stroke="#2E4439" strokeWidth="14" />
          <circle
            cx="110"
            cy="110"
            r={r}
            fill="none"
            stroke={done ? "#FF5A36" : "#FFD54A"}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - frac)}
            className="transition-[stroke-dashoffset] duration-300"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-display text-[58px] leading-none font-extrabold" role="timer" aria-live="off">
            {formatClock(left)}
          </p>
          <p className="mt-1 text-sm text-muted" aria-live="polite">
            {done ? "Time is up" : running ? "Running" : left < duration ? "Paused" : initial.fromText ? "From this step" : "Ready to start"}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => adjust(-30)}
          aria-label="30 seconds less"
          className="flex size-11 items-center justify-center rounded-full border-2 border-line hover:border-ink"
        >
          <Minus size={18} aria-hidden="true" />
        </button>
        <span className="min-w-[90px] text-center text-sm text-muted">30 s steps</span>
        <button
          type="button"
          onClick={() => adjust(30)}
          aria-label="30 seconds more"
          className="flex size-11 items-center justify-center rounded-full border-2 border-line hover:border-ink"
        >
          <Plus size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="mt-4 flex gap-2.5">
        {running ? (
          <button type="button" onClick={pause} className="flex min-h-14 items-center gap-2 rounded-full bg-coral px-8 text-lg font-bold text-bg">
            <Pause size={20} aria-hidden="true" /> Pause
          </button>
        ) : (
          <button type="button" onClick={start} className="flex min-h-14 items-center gap-2 rounded-full bg-coral px-8 text-lg font-bold text-bg">
            <Play size={20} aria-hidden="true" /> {left < duration && left > 0 ? "Resume" : "Start timer"}
          </button>
        )}
        <button
          type="button"
          onClick={reset}
          className="flex min-h-14 items-center gap-2 rounded-full border-2 border-ink px-6 text-lg font-bold hover:bg-ink/10"
        >
          <RotateCcw size={18} aria-hidden="true" /> Reset
        </button>
      </div>
      <p className="sr-only" role="status" aria-live="assertive">
        {done ? "Timer finished" : ""}
      </p>
    </section>
  );
}

function alarm() {
  try {
    navigator.vibrate?.([300, 150, 300]);
  } catch {}
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.35, 0.7].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.2, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.3);
    });
    setTimeout(() => void ctx.close(), 1500);
  } catch {}
}

/** Keeps the screen awake while cooking where the Wake Lock API exists. Returns whether it is active. */
function useWakeLock(): boolean {
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void lock.release();
          return;
        }
        setActive(true);
        lock.addEventListener("release", () => setActive(false));
      } catch {
        setActive(false);
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void request();
    };
    void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, []);
  return active;
}
