"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

/** Friendly error page; never shows a stack trace. */
export function ErrorScreen({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto mt-10 flex max-w-xl flex-col items-center gap-4 rounded-[32px] border-2 border-line bg-panel p-10 text-center">
      <TriangleAlert size={44} className="text-butter" aria-hidden="true" />
      <h1 className="text-3xl tracking-[-0.8px]">Something went wrong</h1>
      <p className="text-muted">This page hit a snag. Your stickers are safe. Try again, or head back to your board.</p>
      {error.digest && <p className="text-xs text-muted">Reference: {error.digest}</p>}
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="flex min-h-[52px] items-center gap-2 rounded-2xl bg-coral px-6 font-bold text-bg">
          <RotateCcw size={18} aria-hidden="true" /> Try again
        </button>
        <Link href="/board" className="flex min-h-[52px] items-center rounded-2xl border-2 border-ink px-6 font-bold">
          Back to the board
        </Link>
      </div>
    </div>
  );
}
