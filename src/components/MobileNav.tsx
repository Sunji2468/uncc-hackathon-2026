"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, SlidersHorizontal } from "lucide-react";
import { LogoMark } from "./Logo";
import { Avatar, type Account } from "./AccountControls";
import { NAV_ITEMS, isActive } from "./nav";

/** Phone layout: a slim top bar plus a bottom tab bar with a center camera button. */
export function MobileTopBar({ account }: { account: Account | null }) {
  const pathname = usePathname();
  const onSettings = isActive(pathname, "/settings");
  return (
    <header className="flex items-center justify-between px-4 pt-4 md:hidden">
      <Link href="/board" className="flex items-center gap-2.5">
        <LogoMark size={36} />
        <span className="font-display text-xl font-extrabold tracking-[-0.5px]">Bytehacks</span>
      </Link>
      <div className="flex items-center gap-2">
      {account ? (
        <Link href="/settings#account" aria-label={`Account: ${account.name}`} className="rounded-full">
          <Avatar name={account.name} size={44} />
        </Link>
      ) : (
        <Link href="/login" className="flex min-h-11 items-center rounded-full bg-butter px-4 text-sm font-bold text-bg">
          Log in
        </Link>
      )}
      <Link
        href="/settings"
        aria-label="Goals and diet settings"
        aria-current={onSettings ? "page" : undefined}
        className={`flex size-12 items-center justify-center rounded-full border-2 border-line bg-panel ${
          onSettings ? "text-butter" : "text-ink"
        }`}
      >
        <SlidersHorizontal size={22} aria-hidden="true" />
      </Link>
      </div>
    </header>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  const [board, mystery, macros, fridge] = NAV_ITEMS;
  const left = [board, mystery];
  const right = [macros, fridge];

  const tab = (item: (typeof NAV_ITEMS)[number]) => {
    const active = isActive(pathname, item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-[52px] min-w-[60px] flex-col items-center justify-center gap-1 text-xs font-bold ${
          active ? "text-butter" : "text-muted"
        }`}
      >
        <Icon size={22} aria-hidden="true" />
        {item.short}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 flex h-[84px] items-center justify-between border-t-2 border-line bg-panel px-3 pb-[max(10px,env(safe-area-inset-bottom))] md:hidden"
    >
      {left.map(tab)}
      <Link
        href="/new"
        aria-label="New sticker: snap a photo"
        className="-mt-8 flex size-16 items-center justify-center rounded-full border-4 border-bg bg-coral text-bg"
      >
        <Camera size={28} strokeWidth={2.2} aria-hidden="true" />
      </Link>
      {right.map(tab)}
    </nav>
  );
}
