"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

export interface Account {
  name: string;
  username: string;
  email: string;
}

export function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } finally {
          router.push("/");
          router.refresh();
        }
      }}
      className={`flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-muted hover:bg-panel hover:text-ink disabled:opacity-60 ${className}`}
    >
      <LogOut size={16} aria-hidden="true" /> {busy ? "Logging out..." : "Log out"}
    </button>
  );
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="flex flex-none items-center justify-center rounded-full border-2 border-white bg-butter font-display text-lg font-extrabold text-bg"
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

/** Sidebar footer: who is signed in, or a nudge to save the board. */
export function SidebarAccount({ account }: { account: Account | null }) {
  if (account) {
    return (
      <div className="rounded-2xl border-2 border-line bg-panel p-3">
        <div className="flex items-center gap-3">
          <Avatar name={account.name} />
          <div className="min-w-0">
            <p className="truncate font-bold">{account.name}</p>
            <p className="truncate text-xs text-muted">@{account.username}</p>
          </div>
        </div>
        <LogoutButton className="mt-2 w-full" />
      </div>
    );
  }
  return (
    <div className="rounded-2xl border-2 border-line bg-panel p-4">
      <p className="font-bold">Save your board</p>
      <p className="mt-1 text-[13px] leading-snug text-muted">Create an account so your stickers follow you to any device.</p>
      <div className="mt-3 flex gap-2">
        <Link href="/signup" className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-butter text-sm font-bold text-bg">
          Sign up
        </Link>
        <Link href="/login" className="flex min-h-11 flex-1 items-center justify-center rounded-xl border-2 border-ink text-sm font-bold">
          Log in
        </Link>
      </div>
    </div>
  );
}
