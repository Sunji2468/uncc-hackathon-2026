"use client";

import { useState } from "react";
import { parsePriceToCents } from "@/lib/money";

/** Inline editor for the menu price, used on the sticker front. */
export function PriceEditor({
  cents,
  onSave,
  onDone,
}: {
  cents: number | null;
  onSave: (cents: number | null) => Promise<void>;
  onDone: () => void;
}) {
  const [draft, setDraft] = useState(cents != null ? (cents / 100).toFixed(2) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const parsed = parsePriceToCents(draft);
  const invalid = Number.isNaN(parsed);

  return (
    <form
      className="mt-3 flex flex-wrap items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (invalid) return;
        setBusy(true);
        try {
          await onSave(parsed);
          onDone();
        } catch {
          setError("Could not save the price.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor="menu-price" className="sr-only">
        Menu price for one plate
      </label>
      <div className={`flex min-h-11 items-center rounded-xl bg-chip px-3 ${invalid ? "ring-2 ring-coral" : ""}`}>
        <span className="font-bold" aria-hidden="true">
          $
        </span>
        <input
          id="menu-price"
          autoFocus
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="25.00"
          className="w-20 bg-transparent px-1 font-bold focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={invalid || busy}
        className="min-h-11 rounded-xl bg-sticker-ink px-4 font-bold text-face disabled:opacity-50"
      >
        Save
      </button>
      <button type="button" onClick={onDone} className="min-h-11 rounded-xl px-3 font-bold text-sticker-muted">
        Cancel
      </button>
      {(error || invalid) && (
        <p role="alert" className="w-full text-sm font-bold text-[#B3261E]">
          {error || "Enter a price like 18.50"}
        </p>
      )}
    </form>
  );
}
