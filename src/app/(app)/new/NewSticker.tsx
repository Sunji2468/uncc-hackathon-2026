"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, ImageOff, ImagePlus, RotateCcw, Sparkles, Upload, X } from "lucide-react";
import { Checklist, type StepState } from "@/components/Checklist";
import { DIETS, type Diet, type UserSettings } from "@/types";
import { ImageDecodeError, prepareImage, type PreparedImage } from "@/lib/client/image";
import { formatCents, parsePriceToCents } from "@/lib/money";

type Phase = "idle" | "analyzing" | "flipping" | "not_food";
type DemoId = "cacio-e-pepe" | "smash-burger" | "pad-see-ew";

const SAMPLES: { id: DemoId; name: string; cents: number; color: string }[] = [
  { id: "cacio-e-pepe", name: "Cacio e Pepe", cents: 2500, color: "#FFD54A" },
  { id: "smash-burger", name: "Smash burger", cents: 1800, color: "#FFB199" },
  { id: "pad-see-ew", name: "Pad see ew", cents: 1700, color: "#9FE3C4" },
];

const STEP_LABELS = ["Spotting ingredients", "Estimating portion size", "Looking up nutrition"];

const DIET_LABELS: Record<Diet, string> = {
  vegetarian: "Vegetarian",
  "gluten-free": "Gluten-free",
  "nut-free": "Nut-free",
  "dairy-free": "Dairy-free",
};

const TIPS = [
  "Fill the frame with the plate.",
  "Use natural light and avoid glare.",
  "Keep menus and people out of the shot.",
];

const panel = "rounded-[28px] border-2 border-line bg-panel";

function errorMessage(body: unknown, fallback: string): { code: string; message: string } {
  if (typeof body === "object" && body && "error" in body) {
    const e = (body as { error: { code?: string; message?: string } }).error;
    return { code: e.code ?? "error", message: e.message ?? fallback };
  }
  return { code: "error", message: fallback };
}

export function NewSticker({ initialSettings }: { initialSettings: UserSettings }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [photo, setPhoto] = useState<PreparedImage | null>(null);
  const [preview, setPreview] = useState<{ src: string; color?: string } | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [price, setPrice] = useState("");
  const [settings, setSettings] = useState(initialSettings);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0); // index of the active checklist step; 3 = all done
  const [dragOver, setDragOver] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLHeadingElement>(null);

  const priceCents = parsePriceToCents(price);
  const priceInvalid = Number.isNaN(priceCents);

  // Advance the checklist on a timer while the request runs.
  useEffect(() => {
    if (phase !== "analyzing") return;
    setStep(0);
    const t1 = setTimeout(() => setStep(1), 1400);
    const t2 = setTimeout(() => setStep(2), 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [phase]);

  useEffect(() => {
    if (phase === "analyzing" || phase === "not_food") statusRef.current?.focus();
  }, [phase]);

  const handleFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("That file is not a photo. Please use a JPG or PNG.");
      return;
    }
    setPreparing(true);
    try {
      const prepared = await prepareImage(file);
      setPhoto(prepared);
      setPreview({ src: prepared.thumbnail });
      setPhase("idle");
    } catch (err) {
      setError(err instanceof ImageDecodeError ? err.message : "We could not open that photo.");
    } finally {
      setPreparing(false);
    }
  }, []);

  const submit = async (body: Record<string, unknown>) => {
    setError("");
    setPhase("analyzing");
    try {
      const res = await fetch("/api/dishes/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const e = errorMessage(json, "Something went wrong. Please try again.");
        if (e.code === "not_food") {
          setPhase("not_food");
        } else {
          setError(e.message);
          setPhase("idle");
        }
        return;
      }
      const { stickerId } = json as { stickerId: string };
      setStep(3);
      setPhase("flipping");
      setTimeout(() => router.push(`/stickers/${stickerId}`), 900);
    } catch {
      setError("You seem to be offline. Check your connection and try again.");
      setPhase("idle");
    }
  };

  const createFromPhoto = () => {
    if (!photo || priceInvalid) return;
    void submit({ ...photo, menuPriceCents: priceCents });
  };

  const createFromSample = (s: (typeof SAMPLES)[number]) => {
    setPreview({ src: "", color: s.color });
    void submit({ demoId: s.id });
  };

  const toggleDiet = async (diet: Diet) => {
    const next = {
      ...settings,
      diets: settings.diets.includes(diet) ? settings.diets.filter((d) => d !== diet) : [...settings.diets, diet],
    };
    setSettings(next);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error();
    } catch {
      setSettings(settings);
      setError("Could not save your dietary needs. Please try again.");
    }
  };

  const clearPhoto = () => {
    setPhoto(null);
    setPreview(null);
    setPhase("idle");
  };

  const busy = phase === "analyzing" || phase === "flipping";
  const steps = STEP_LABELS.map((label, i) => ({
    label,
    state: (i < step ? "done" : i === step && busy ? "active" : "todo") as StepState,
  }));

  const fileInputs = (
    <>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={uploadRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </>
  );

  return (
    <div className="mt-8 flex flex-wrap items-start gap-7">
      {fileInputs}

      <div className={`${panel} min-w-0 flex-[1_1_520px] p-5 md:p-7`}>
        {busy && <WaitingSticker preview={preview} flipped={phase === "flipping"} headingRef={statusRef} />}

        {phase === "not_food" && (
          <NotFood
            headingRef={statusRef}
            preview={preview?.src}
            onCamera={() => cameraRef.current?.click()}
            onUpload={() => uploadRef.current?.click()}
          />
        )}

        {phase === "idle" && (
          <>
            <div className="inline-flex gap-1 rounded-full border-2 border-line bg-bg p-1">
              <span
                aria-current="page"
                className="flex min-h-12 items-center rounded-full bg-butter px-4 text-base font-bold whitespace-nowrap text-bg sm:px-6"
              >
                Restaurant dish
              </span>
              <Link
                href="/mystery"
                className="flex min-h-12 items-center rounded-full px-4 text-base font-bold whitespace-nowrap text-ink hover:bg-panel sm:px-6"
              >
                My counter
              </Link>
            </div>

            {photo && preview ? (
              <div className="mt-5 flex flex-col items-center gap-4 rounded-3xl bg-bg p-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview.src}
                  alt="Your dish photo"
                  className="max-h-[300px] w-auto rotate-[-2deg] rounded-[22px] border-[6px] border-white object-cover shadow-[0_14px_28px_rgba(0,0,0,0.4)]"
                />
                <div className="flex flex-wrap justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => uploadRef.current?.click()}
                    className="flex min-h-12 items-center gap-2 rounded-2xl border-2 border-ink px-5 font-bold hover:bg-ink/10"
                  >
                    <RotateCcw size={18} aria-hidden="true" /> Change photo
                  </button>
                  <button
                    type="button"
                    onClick={clearPhoto}
                    className="flex min-h-12 items-center gap-2 rounded-2xl px-5 font-bold text-muted hover:text-ink"
                  >
                    <X size={18} aria-hidden="true" /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  void handleFile(e.dataTransfer.files?.[0]);
                }}
                className={`mt-5 flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-3xl border-[3px] border-dashed p-6 text-center transition ${
                  dragOver ? "border-butter bg-panel" : "border-[#5C7A6B] bg-bg"
                }`}
              >
                <div className="flex size-[72px] items-center justify-center rounded-full bg-panel text-butter">
                  <ImagePlus size={34} aria-hidden="true" />
                </div>
                <p className="font-display text-[26px] font-extrabold tracking-[-0.6px]">
                  {preparing ? "Preparing your photo..." : "Drop a photo here"}
                </p>
                <p className="text-[15px] text-muted">JPG or PNG. Center the plate and use good light.</p>
                <div className="flex flex-wrap justify-center gap-2.5">
                  <button
                    type="button"
                    disabled={preparing}
                    onClick={() => cameraRef.current?.click()}
                    className="flex min-h-[52px] items-center gap-2 rounded-2xl bg-coral px-7 font-bold text-bg disabled:opacity-60"
                  >
                    <Camera size={20} aria-hidden="true" /> Take a photo
                  </button>
                  <button
                    type="button"
                    disabled={preparing}
                    onClick={() => uploadRef.current?.click()}
                    className="flex min-h-[52px] items-center gap-2 rounded-2xl border-2 border-ink px-7 font-bold hover:bg-ink/10 disabled:opacity-60"
                  >
                    <Upload size={20} aria-hidden="true" /> Upload a file
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-6">
              <div className="flex-[1_1_200px]">
                <label htmlFor="price" className="block text-base font-bold">
                  Menu price <span className="font-normal text-muted">(one plate)</span>
                </label>
                <div
                  className={`mt-2 flex min-h-[52px] items-center gap-1 rounded-[14px] bg-face px-4 text-sticker-ink ${
                    priceInvalid ? "ring-3 ring-coral" : ""
                  }`}
                >
                  <span className="text-xl font-bold" aria-hidden="true">
                    $
                  </span>
                  <input
                    id="price"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="25.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    aria-invalid={priceInvalid}
                    aria-describedby="price-help"
                    className="min-h-12 w-full border-0 bg-transparent text-xl font-bold text-sticker-ink placeholder:text-sticker-muted focus:outline-none"
                  />
                </div>
                <p id="price-help" className={`mt-1.5 text-sm ${priceInvalid ? "text-coral" : "text-muted"}`}>
                  {priceInvalid ? "Enter a price like 18.50" : "Optional. Used for the heist math."}
                </p>
              </div>

              <div className="flex-[2_1_320px]">
                <p className="text-base font-bold" id="diet-label">
                  Dietary needs
                </p>
                <div role="group" aria-labelledby="diet-label" className="mt-2 flex flex-wrap gap-2">
                  {DIETS.map((d) => {
                    const on = settings.diets.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={on}
                        onClick={() => void toggleDiet(d)}
                        className={`min-h-12 rounded-full border-2 px-[18px] text-[15px] font-bold transition ${
                          on ? "border-butter bg-butter text-bg" : "border-ink text-ink hover:bg-ink/10"
                        }`}
                      >
                        {DIET_LABELS[d]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {error && (
              <p role="alert" className="mt-6 flex items-start gap-2 rounded-2xl bg-coral/15 p-4 font-bold text-ink">
                <AlertTriangle size={20} className="mt-0.5 flex-none text-coral" aria-hidden="true" />
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={createFromPhoto}
              disabled={!photo || priceInvalid || preparing}
              className="mt-7 flex min-h-[60px] w-full items-center justify-center rounded-[18px] bg-butter text-[19px] font-bold text-bg transition hover:brightness-105 disabled:bg-line disabled:text-muted"
            >
              {photo ? "Create sticker" : "Add a photo to continue"}
            </button>
          </>
        )}
      </div>

      <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-5">
        <section className={`${panel} p-6`} aria-labelledby="works-h">
          <h2 id="works-h" className="text-2xl tracking-[-0.5px]">
            While it works
          </h2>
          <p className="mt-1 text-sm text-muted">Usually about five seconds. The sticker flips when it is ready.</p>
          <div className="mt-[18px]">
            <Checklist steps={steps} />
          </div>
        </section>

        <section className={`${panel} p-6`} aria-labelledby="sample-h">
          <div className="flex items-center gap-3">
            <div className="flex size-11 flex-none items-center justify-center rounded-xl bg-bg text-butter">
              <Sparkles size={22} aria-hidden="true" />
            </div>
            <h2 id="sample-h" className="text-xl tracking-[-0.4px]">
              Try a sample dish
            </h2>
          </div>
          <p className="mt-3 text-[15px] text-muted">No photo handy? Start from one of ours.</p>
          <div className="mt-4 flex flex-col gap-2">
            {SAMPLES.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={busy}
                onClick={() => createFromSample(s)}
                className="flex min-h-[52px] items-center justify-between gap-3 rounded-2xl bg-bg px-4 text-left font-bold transition hover:bg-line disabled:opacity-50"
              >
                <span className="flex items-center gap-3">
                  <span className="size-6 rounded-full border-2 border-white" style={{ background: s.color }} aria-hidden="true" />
                  {s.name}
                </span>
                <span className="text-muted">{formatCents(s.cents)}</span>
              </button>
            ))}
          </div>
        </section>

        <section className={`${panel} p-6`} aria-labelledby="nf-h">
          <div className="flex items-center gap-3">
            <div className="flex size-11 flex-none items-center justify-center rounded-xl bg-bg text-muted">
              <ImageOff size={22} aria-hidden="true" />
            </div>
            <h2 id="nf-h" className="text-xl tracking-[-0.4px]">
              If it is not food
            </h2>
          </div>
          <p className="mt-3 text-[15px] leading-normal text-muted">
            We will say so, skip the sticker, and ask for a new photo. Fill the frame with the plate, use natural light,
            and keep menus and people out of the shot.
          </p>
        </section>
      </div>
    </div>
  );
}

function WaitingSticker({
  preview,
  flipped,
  headingRef,
}: {
  preview: { src: string; color?: string } | null;
  flipped: boolean;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <h2 ref={headingRef} tabIndex={-1} className="text-[32px] tracking-[-1px] focus:outline-none">
        {flipped ? "Here it comes" : "Reading your plate"}
      </h2>
      <p role="status" aria-live="polite" className="mt-2 text-[15px] text-muted">
        {flipped ? "Your sticker is ready." : "Your sticker flips over when it is ready."}
      </p>

      <div className="flip mt-9 w-[250px]">
        <div className={`flip-inner ${flipped ? "is-flipped" : "animate-wiggle"}`}>
          <div className="flip-face overflow-hidden rounded-[28px] border-[6px] border-white bg-face shadow-[0_18px_36px_rgba(0,0,0,0.45)]">
            <div
              className="flex h-[190px] items-center justify-center"
              style={{ background: preview?.color ?? "#FFD54A" }}
            >
              {preview?.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.src} alt="" className="size-full object-cover" />
              ) : (
                <PlateIcon />
              )}
            </div>
            <div className="px-[18px] pt-4 pb-5">
              <div className="h-5 w-3/4 animate-pulse rounded-lg bg-[#E7DFCF] motion-reduce:animate-none" />
              <div className="mt-2.5 h-3.5 w-[45%] animate-pulse rounded-md bg-[#E7DFCF] motion-reduce:animate-none" />
            </div>
          </div>
          <div className="flip-face flip-back flex flex-col items-center justify-center gap-3 rounded-[28px] border-[6px] border-white bg-butter text-bg shadow-[0_18px_36px_rgba(0,0,0,0.45)]">
            <Sparkles size={44} aria-hidden="true" />
            <p className="font-display text-2xl font-extrabold">Heist ready</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlateIcon() {
  return (
    <svg width="120" height="120" viewBox="0 0 200 200" aria-hidden="true">
      <circle cx="100" cy="100" r="92" fill="#FFFFFF" stroke="#E7DFCF" strokeWidth="4" />
      <circle cx="100" cy="100" r="66" fill="#FFF6E0" stroke="#E7DFCF" strokeWidth="2" />
      <path
        d="M58 100 C58 66 142 66 142 100 C142 130 66 132 66 102 C66 82 134 82 134 100"
        fill="none"
        stroke="#E9A93A"
        strokeWidth="9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function NotFood({
  headingRef,
  preview,
  onCamera,
  onUpload,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  preview?: string;
  onCamera: () => void;
  onUpload: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-6 text-center">
      <div className="flex size-[200px] rotate-2 items-center justify-center overflow-hidden rounded-[36px] border-4 border-dashed border-muted">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="The photo you sent" className="size-full object-cover opacity-50 grayscale" />
        ) : (
          <ImageOff size={64} className="text-muted" aria-hidden="true" />
        )}
      </div>
      <h2 ref={headingRef} tabIndex={-1} className="mt-9 text-[32px] leading-tight tracking-[-1px] focus:outline-none">
        That does not look like food
      </h2>
      <p role="status" className="mt-3 text-base leading-normal text-muted">
        We could not find a dish in this photo, so we did not make a sticker.
      </p>
      <ul className="mt-7 flex w-full flex-col gap-2.5 text-left">
        {TIPS.map((t) => (
          <li key={t} className="rounded-2xl bg-bg px-4 py-3.5 text-[15px]">
            {t}
          </li>
        ))}
      </ul>
      <div className="mt-7 flex w-full flex-col gap-3">
        <button
          type="button"
          onClick={onCamera}
          className="flex min-h-14 items-center justify-center gap-2 rounded-[18px] bg-coral text-[17px] font-bold text-bg"
        >
          <Camera size={20} aria-hidden="true" /> Try again
        </button>
        <button
          type="button"
          onClick={onUpload}
          className="flex min-h-14 items-center justify-center gap-2 rounded-[18px] border-2 border-ink text-[17px] font-bold hover:bg-ink/10"
        >
          <Upload size={20} aria-hidden="true" /> Upload a different photo
        </button>
      </div>
    </div>
  );
}
