import Link from "next/link";
import { LogoMark } from "@/components/Logo";

/** Split screen: the form on the left, a sticker collage from the app on the right. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <main className="flex min-w-0 flex-1 flex-col px-5 py-6 md:px-12 md:py-8">
        <Link href="/" className="flex items-center gap-3 self-start">
          <LogoMark />
          <span className="font-display text-2xl font-extrabold tracking-[-0.5px]">TasteHeist</span>
        </Link>
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-10">{children}</div>
        <p className="text-center text-[13px] text-muted">Nutrition and costs are estimates.</p>
      </main>

      <aside aria-hidden="true" className="dotted-board relative hidden flex-1 overflow-hidden border-l-2 border-line lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_40%,rgba(255,213,74,0.12),transparent_60%)]" />
        <div className="absolute top-[14%] left-[16%] w-[250px] rotate-[-6deg] overflow-hidden rounded-[28px] border-[6px] border-white bg-face text-sticker-ink shadow-[0_20px_40px_rgba(0,0,0,0.45)]">
          <div className="flex h-[140px] items-center justify-center bg-butter">
            <Plate food="#E9A93A" />
          </div>
          <div className="px-4 pt-3 pb-4">
            <p className="font-display text-2xl font-extrabold">Cacio e Pepe</p>
            <p className="mt-1 text-sm text-sticker-muted">
              <span className="line-through">$25.00</span> menu · $1.68 home
            </p>
            <p className="mt-2 inline-block rounded-full bg-chip px-2.5 py-1 text-[13px] font-bold">770 kcal · 31 g protein</p>
          </div>
        </div>
        <div className="absolute top-[38%] right-[12%] w-[220px] rotate-[5deg] rounded-[26px] border-[6px] border-white bg-bg p-5 text-ink shadow-[0_20px_40px_rgba(0,0,0,0.45)]">
          <span className="flex size-16 items-center justify-center rounded-full bg-butter font-display text-2xl font-extrabold text-bg shadow-[0_0_0_7px_rgba(255,213,74,0.25),0_0_32px_rgba(255,213,74,0.5)]">
            15
          </span>
          <p className="mt-3 font-display text-xl font-extrabold">Tomato-egg fried rice</p>
          <p className="mt-1 text-sm text-muted">Made from what was on the counter</p>
        </div>
        <div className="absolute bottom-[14%] left-[24%] w-[260px] rotate-[-2deg] rounded-[26px] border-[6px] border-white bg-face p-4 text-sticker-ink shadow-[0_20px_40px_rgba(0,0,0,0.45)]">
          <p className="text-sm font-bold">Community Fridge</p>
          <p className="mt-2 -rotate-1 rounded-md bg-[#FFE98A] px-3 py-2 text-sm shadow">Double the pickles. by Maya</p>
          <div className="mt-3 flex gap-2 text-sm font-bold">
            <span className="rounded-full bg-[#FFB199] px-3 py-1">Fire 12</span>
            <span className="rounded-full bg-[#FFC7D2] px-3 py-1">Heart 4</span>
            <span className="rounded-full bg-[#FFE98A] px-3 py-1">Yum 7</span>
          </div>
        </div>
        <p className="absolute right-10 bottom-8 max-w-[260px] text-right font-display text-3xl leading-tight font-extrabold text-ink">
          Love it? <span className="text-butter">Make it.</span>
        </p>
      </aside>
    </div>
  );
}

function Plate({ food }: { food: string }) {
  return (
    <svg width="110" height="110" viewBox="0 0 200 200">
      <circle cx="100" cy="100" r="92" fill="#fff" stroke="#E7DFCF" strokeWidth="4" />
      <circle cx="100" cy="100" r="66" fill="#FFF6E0" />
      <path d="M58 100 C58 66 142 66 142 100 C142 130 66 132 66 102 C66 82 134 82 134 100" fill="none" stroke={food} strokeWidth="9" strokeLinecap="round" />
    </svg>
  );
}
