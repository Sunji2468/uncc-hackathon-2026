"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import type { Units } from "@/types";
import type { StickerView } from "@/lib/sticker-view";
import { formatAmount } from "@/lib/scale";
import { formatCents } from "@/lib/money";
import { isWater } from "@/lib/prices";

const GROUPS: { label: string; categories: string[] }[] = [
  { label: "Produce", categories: ["vegetable", "fruit"] },
  { label: "Meat and fish", categories: ["beef", "pork", "chicken", "fish", "seafood"] },
  { label: "Dairy and eggs", categories: ["dairy_milk", "cheese", "eggs", "butter"] },
  { label: "Pasta, grains and bread", categories: ["pasta", "rice_grain", "bread", "legume"] },
  { label: "Pantry", categories: ["oil", "nuts", "spice", "sauce", "sugar", "other"] },
];

/** "butter_oil" is one price category but two aisles: butter and ghee are dairy, oils are pantry. */
function aisle(i: { name: string; category: string }): string {
  if (i.category !== "butter_oil") return i.category;
  return /\b(butter|ghee)\b/i.test(i.name) ? "butter" : "oil";
}

export function ShoppingList({ view, units }: { view: StickerView; units: Units }) {
  const storageKey = `th_shop_${view.id}`;
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<"idle" | "copied" | "error">("idle");
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as string[];
      setChecked(new Set(saved));
    } catch {}
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, [storageKey]);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  const items = view.ingredients.filter((i) => !isWater(i.name));
  const groups = useMemo(
    () =>
      GROUPS.map((g) => ({ ...g, items: items.filter((i) => g.categories.includes(aisle(i))) }))
        .concat([{ label: "Other", categories: [], items: items.filter((i) => !GROUPS.some((g) => g.categories.includes(aisle(i)))) }])
        .filter((g) => g.items.length > 0),
    [items],
  );
  const total = items.reduce((s, i) => s + i.costCents, 0);

  const asText = () =>
    [
      `${view.title}, serves ${view.servings}`,
      ...groups.flatMap((g) => [``, `${g.label}:`, ...g.items.map((i) => `- ${i.name}, ${formatAmount(i.grams, i.name, units)}`)]),
      ``,
      `Estimated total ${formatCents(total)} (TasteHeist estimate)`,
    ].join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(asText());
      setCopied("copied");
    } catch {
      setCopied("error");
    }
    setTimeout(() => setCopied("idle"), 2500);
  };

  const share = async () => {
    try {
      await navigator.share({ title: `${view.title} shopping list`, text: asText() });
    } catch {
      // The user closed the share sheet, or it failed; nothing to do.
    }
  };

  return (
    <section className="rounded-[28px] border-2 border-line bg-panel p-[22px]" aria-labelledby="shop-h">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="shop-h" className="text-2xl tracking-[-0.5px]">
          Shopping list
        </h2>
        <p className="text-[13px] text-muted">Serves {view.servings}</p>
      </div>
      {groups.map((g) => (
        <div key={g.label} className="mt-3">
          <p className="text-[13px] font-bold tracking-wide text-butter uppercase">{g.label}</p>
          <ul className="mt-1 flex flex-col">
            {g.items.map((i) => {
              const on = checked.has(i.id);
              return (
                <li key={i.id}>
                  <label className="flex min-h-[52px] cursor-pointer items-center gap-3.5 text-base font-bold">
                    <input type="checkbox" checked={on} onChange={() => toggle(i.id)} />
                    <span className={`flex-1 ${on ? "text-muted line-through" : ""}`}>
                      {i.name} {formatAmount(i.grams, i.name, units)}
                    </span>
                    <span className={on ? "text-muted" : ""}>{formatCents(i.costCents)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div className="mt-3 flex items-baseline justify-between border-t-2 border-line pt-3.5">
        <span className="text-[15px] text-muted">Estimated total</span>
        <span className="font-display text-[32px] font-extrabold">{formatCents(total)}</span>
      </div>
      <div className="mt-3.5 flex gap-2.5">
        <button
          type="button"
          onClick={copy}
          className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl bg-coral text-base font-bold text-bg"
        >
          {copied === "copied" ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
          {copied === "copied" ? "Copied" : copied === "error" ? "Copy failed" : "Copy list"}
        </button>
        {canShare && (
          <button
            type="button"
            onClick={share}
            className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-ink text-base font-bold hover:bg-ink/10"
          >
            <Share2 size={18} aria-hidden="true" /> Share list
          </button>
        )}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {copied === "copied" ? "Shopping list copied" : ""}
      </p>
    </section>
  );
}
