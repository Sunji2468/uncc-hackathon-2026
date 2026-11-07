"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Users } from "lucide-react";
import { ApiRequestError, fetchJson } from "@/lib/client/fetch-json";

/** Snapshots a restaurant heist onto the Community Fridge. */
export function ShareToFridgeButton({ stickerId, hasMenuPrice }: { stickerId: string; hasMenuPrice: boolean }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const share = async () => {
    setState("busy");
    try {
      await fetchJson("/api/fridge", { method: "POST", json: { stickerId } });
      setState("done");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not share it.");
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <Link
        href="/fridge"
        className="flex min-h-14 items-center gap-2.5 rounded-2xl border-2 border-butter px-6 text-[17px] font-bold text-butter"
      >
        <Check size={20} aria-hidden="true" /> On the Fridge. See it
      </Link>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={share}
        disabled={!hasMenuPrice || state === "busy"}
        title={hasMenuPrice ? undefined : "Add the menu price on the sticker first"}
        className="flex min-h-14 items-center gap-2.5 rounded-2xl border-2 border-ink px-6 text-[17px] font-bold hover:bg-ink/10 disabled:opacity-50"
      >
        <Users size={20} aria-hidden="true" /> {state === "busy" ? "Sharing..." : "Share to Fridge"}
      </button>
      {!hasMenuPrice && <p className="text-xs text-muted">Add the menu price to share.</p>}
      <p role="status" aria-live="polite" className="text-sm font-bold text-coral">
        {state === "error" ? error : ""}
      </p>
    </div>
  );
}
