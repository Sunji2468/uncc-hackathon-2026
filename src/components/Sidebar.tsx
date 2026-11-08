"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { LogoMark } from "./Logo";
import { NAV_ITEMS, isActive } from "./nav";
import { SidebarAccount, type Account } from "./AccountControls";

export function Sidebar({ demo = false, account }: { demo?: boolean; account: Account | null }) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-[272px] shrink-0 flex-col gap-6 border-r-2 border-line bg-sidebar px-5 py-6 md:flex">
      <div className="sticky top-6 flex min-h-[calc(100dvh-48px)] flex-col gap-6">
        <Link href="/board" className="flex items-center gap-3">
          <LogoMark />
          <span className="font-display text-2xl font-extrabold tracking-[-0.5px]">TasteHeist</span>
        </Link>

        <Link
          href="/new"
          className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-coral text-base font-bold text-bg transition hover:brightness-105"
        >
          <Plus size={20} strokeWidth={2.4} aria-hidden="true" />
          New sticker
        </Link>

        <nav aria-label="Main" className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 items-center gap-3 rounded-[14px] px-3.5 text-base font-bold transition ${
                  active ? "bg-panel text-butter" : "text-muted hover:bg-panel/60 hover:text-ink"
                }`}
              >
                <Icon size={22} strokeWidth={2} aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          <SidebarAccount account={account} />
          {demo && (
            <Link href="/settings" className="self-start rounded-full bg-butter px-3 py-1 text-xs font-bold text-bg">
              Demo mode on
            </Link>
          )}
          <p className="text-[13px] leading-snug text-muted">Nutrition and costs are estimates.</p>
        </div>
      </div>
    </aside>
  );
}
