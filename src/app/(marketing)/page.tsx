import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Box, Camera, ChefHat, Database, Flame, Heart, Repeat, ScanLine, Sparkles, Utensils } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { HeroCanvas } from "@/components/landing/HeroCanvas";
import { accountOf, getOrCreateUser } from "@/lib/user";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "TasteHeist · Love it? Make it.",
  description: "Snap any dish you loved. TasteHeist turns it into a recipe you can cook, with real nutrition and what it costs at home.",
};

export default async function Landing() {
  const account = accountOf(await getOrCreateUser());

  return (
    <div className="overflow-x-clip">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-bg/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-4 py-3 md:px-8">
          <Link href="/" className="flex items-center gap-3">
            <LogoMark size={38} />
            <span className="font-display text-2xl font-extrabold tracking-[-0.5px]">TasteHeist</span>
          </Link>
          <nav aria-label="Landing" className="hidden items-center gap-1 md:flex">
            <a href="#how" className="rounded-full px-4 py-2.5 font-bold text-muted hover:text-ink">How it works</a>
            <a href="#features" className="rounded-full px-4 py-2.5 font-bold text-muted hover:text-ink">Features</a>
            <a href="#trust" className="rounded-full px-4 py-2.5 font-bold text-muted hover:text-ink">Why trust it</a>
          </nav>
          <div className="flex items-center gap-2">
            {account ? (
              <Link href="/board" className="flex min-h-11 items-center gap-2 rounded-full bg-butter px-5 font-bold text-bg">
                Open your board <ArrowRight size={18} aria-hidden="true" />
              </Link>
            ) : (
              <>
                <Link href="/login" className="hidden min-h-11 items-center rounded-full px-4 font-bold hover:bg-panel sm:flex">
                  Log in
                </Link>
                <Link href="/signup" className="flex min-h-11 items-center rounded-full bg-butter px-5 font-bold text-bg">
                  Sign up free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate flex min-h-[860px] flex-col justify-center pt-24 pb-12 md:min-h-[100svh] md:pt-32 md:pb-20">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_50%_22%,#1F3A30_0%,#12201B_42%)] md:bg-[radial-gradient(ellipse_at_70%_45%,#1F3A30_0%,#12201B_60%)]" />
        {/* On phones the scene takes the top of the screen and the copy sits below it */}
        <div className="relative order-2 h-[430px] w-full sm:h-[520px] md:absolute md:right-0 md:top-[12%] md:h-[80%] md:w-[52%]">
          <HeroCanvas />
        </div>


        <div className="mx-auto w-full max-w-[1240px] px-4 md:px-8">
          <div className="relative z-10 max-w-[620px] md:w-[49%]">
            <p className="inline-flex items-center gap-2 rounded-full border-2 border-line bg-panel/80 px-3.5 py-1.5 text-sm font-bold text-butter backdrop-blur">
              <Sparkles size={16} aria-hidden="true" /> YOUR FAVORITE DISH. REINVENTED.
            </p>
            <h1 className="mt-5 text-[clamp(64px,8.5vw,120px)] leading-[0.92] tracking-[-0.045em]">
              Love it?
              <br />
              <span className="text-butter">Make it.</span>
            </h1>
            <p className="mt-6 max-w-[520px] text-lg leading-relaxed text-ink/90 md:text-xl">
              Restaurant magic. Your kitchen. Turn a dish you love into a recipe, discover its macros, and keep the difference.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={account ? "/new" : "/signup"}
                className="flex min-h-14 items-center gap-2 rounded-2xl bg-coral px-7 text-lg font-bold text-bg shadow-[0_10px_30px_rgba(255,90,54,0.35)] transition hover:-translate-y-0.5"
              >
                <Camera size={20} aria-hidden="true" /> {account ? "Snap a dish" : "Start free"}
              </Link>
              <Link href="/board" className="flex min-h-14 items-center gap-2 rounded-2xl border-2 border-ink/80 px-6 text-lg font-bold backdrop-blur hover:bg-ink/10">
                {account ? "Open your board" : "Try it as a guest"}
              </Link>
            </div>
            <dl className="mt-9 grid max-w-[560px] grid-cols-3 gap-3">
              <Stat value="$25 → $1.68" label="a restaurant plate, made at home" />
              <Stat value="USDA" label="nutrition from real food data" />
              <Stat value="15 min" label="recipes from what you already have" />
            </dl>
          </div>
        </div>
      </section>

      <div className="border-y border-line bg-panel/50 px-4 py-5">
        <div className="mx-auto flex max-w-[1176px] flex-wrap items-center justify-between gap-4 text-xs font-bold uppercase tracking-[0.18em] text-muted">
          <span className="text-butter">Good taste. Better possibilities.</span>
          <span>Snap a craving</span><span aria-hidden="true" className="text-coral">✳</span>
          <span>Steal the recipe</span><span aria-hidden="true" className="text-coral">✳</span>
          <span>Make it yours</span>
        </div>
      </div>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 px-4 py-24 md:px-8">
        <div className="mx-auto max-w-[1240px]">
          <SectionHead eyebrow="How it works" title="Three steps from craving to cooking" />
          <ol className="mt-12 grid gap-7 md:grid-cols-3">
            {[
              { n: 1, icon: Camera, title: "Snap", text: "Photograph a dish at a restaurant, or the ingredients on your counter.", tilt: "-rotate-2", color: "bg-butter" },
              { n: 2, icon: Repeat, title: "Flip", text: "Your photo becomes a sticker. Flip it for the recipe, calories, protein and home cost.", tilt: "rotate-1", color: "bg-[#FFB199]" },
              { n: 3, icon: ChefHat, title: "Cook", text: "Shopping list, swaps for what you are missing, and step-by-step cook mode with timers.", tilt: "-rotate-1", color: "bg-[#9FE3C4]" },
            ].map((s) => (
              <li key={s.n} className={`${s.tilt} overflow-hidden rounded-[30px] border-[6px] border-white bg-face text-sticker-ink shadow-[0_18px_36px_rgba(0,0,0,0.4)] transition hover:rotate-0`}>
                <div className={`flex h-32 items-center justify-between px-6 ${s.color}`}>
                  <s.icon size={48} strokeWidth={1.8} aria-hidden="true" />
                  <span className="font-display text-7xl font-extrabold opacity-25">{s.n}</span>
                </div>
                <div className="px-6 pt-5 pb-6">
                  <h3 className="text-3xl tracking-[-0.8px]">{s.title}</h3>
                  <p className="mt-2 text-base leading-relaxed text-sticker-muted">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Features bento */}
      <section id="features" className="dotted-board scroll-mt-20 border-y-2 border-line px-4 py-24 md:px-8">
        <div className="mx-auto max-w-[1240px]">
          <SectionHead eyebrow="Features" title="Everything after the photo" />
          <div className="mt-12 grid gap-5 md:grid-cols-6">
            <Feature className="md:col-span-4" icon={Box} title="Mystery Box" text="Photograph your counter, set the clock, open the box. The recipe uses only what you have, plus oil, salt, pepper and water.">
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {["Eggs", "Cooked rice", "Scallions", "Tomatoes"].map((c) => (
                  <span key={c} className="rounded-full bg-ink px-3.5 py-2 text-sm font-bold text-bg">{c}</span>
                ))}
                <span className="ml-auto flex gap-1.5">
                  {["15 min", "1 hr", "2 hr+"].map((t, i) => (
                    <span key={t} className={`rounded-full border-2 px-3 py-1.5 text-sm font-bold ${i === 0 ? "border-coral bg-coral text-bg" : "border-line"}`}>{t}</span>
                  ))}
                </span>
              </div>
            </Feature>
            <Feature className="md:col-span-2" icon={Utensils} title="Fits your day" text="Set calorie and protein goals. We size dinner to exactly what is left.">
              <MiniBar label="Calories" pct={74} color="bg-coral" value="1,470 / 2,000" />
              <MiniBar label="Protein" pct={72} color="bg-butter" value="86 / 120 g" />
            </Feature>
            <Feature className="md:col-span-2" icon={Repeat} title="Smart swaps" text="Out of something? Three swaps, with what each one changes.">
              <div className="mt-4 rounded-2xl border-2 border-line p-3">
                <p className="font-bold">Nutritional yeast</p>
                <p className="text-sm text-muted">$0.49 cheaper, 13 kcal less</p>
              </div>
            </Feature>
            <Feature className="md:col-span-2" icon={ChefHat} title="Cook mode" text="One big step at a time, with a timer that reads the recipe.">
              <div className="mt-4 flex items-center gap-4">
                <span className="flex size-20 items-center justify-center rounded-full border-[6px] border-butter font-display text-xl font-extrabold">02:00</span>
                <span className="text-sm text-muted">Toast the pepper in the oil for 1 minute.</span>
              </div>
            </Feature>
            <Feature className="md:col-span-2" icon={Heart} title="Community Fridge" text="Share what you made. Friends react with stickers and leave tips.">
              <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold text-sticker-ink">
                <span className="flex items-center gap-1 rounded-full bg-[#FFB199] px-3 py-1.5"><Flame size={14} aria-hidden="true" /> 12</span>
                <span className="flex items-center gap-1 rounded-full bg-[#FFC7D2] px-3 py-1.5"><Heart size={14} aria-hidden="true" /> 4</span>
                <span className="-rotate-1 rounded-md bg-[#FFE98A] px-3 py-1.5 font-normal">Double the pickles.</span>
              </div>
            </Feature>
          </div>
        </div>
      </section>

      {/* How the numbers work */}
      <section id="trust" className="scroll-mt-20 px-4 py-24 md:px-8">
        <div className="mx-auto max-w-[1240px]">
          <SectionHead eyebrow="Why trust it" title="AI names it. Real data counts it." />
          <p className="mt-4 max-w-[680px] text-lg text-muted">
            AI is great at recognizing food and bad at math. So the AI only identifies the dish and its portions. The numbers come from real sources, and every one is shown as an estimate with a range.
          </p>
          <ol className="mt-12 grid gap-4 md:grid-cols-4">
            {[
              { icon: Camera, title: "Your photo", text: "A dish, or your counter" },
              { icon: ScanLine, title: "AI identifies", text: "\"Cacio e Pepe, 120 g dry pasta, 40 g pecorino...\"" },
              { icon: Database, title: "USDA counts", text: "Calories and protein from FoodData Central" },
              { icon: Sparkles, title: "Your sticker", text: "Recipe, macros and home cost, checked" },
            ].map((s, i) => (
              <li key={s.title} className="relative rounded-[24px] border-2 border-line bg-panel p-6">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-bg text-butter">
                  <s.icon size={24} aria-hidden="true" />
                </span>
                <p className="mt-4 text-sm font-bold text-muted">Step {i + 1}</p>
                <h3 className="mt-1 text-2xl tracking-[-0.5px]">{s.title}</h3>
                <p className="mt-1 text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
          <dl className="mt-12 grid gap-4 sm:grid-cols-3">
            <Proof value="0 of 20" label="nut-free test runs that returned nuts" />
            <Proof value="Under 10%" label="off your calorie target for dinner suggestions" />
            <Proof value="WCAG AA" label="accessibility on every screen" />
          </dl>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 pb-24 md:px-8">
        <div className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[40px] bg-butter px-6 py-16 text-center text-bg md:px-16 md:py-20">
          <div className="pointer-events-none absolute -top-10 -left-8 size-40 rotate-12 rounded-[30px] border-[6px] border-white bg-[#FFB199] opacity-90" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-6 -bottom-10 size-44 -rotate-12 rounded-[30px] border-[6px] border-white bg-[#9FE3C4] opacity-90" aria-hidden="true" />
          <h2 className="relative text-[clamp(40px,6vw,76px)] leading-[0.98] tracking-[-0.04em]">
            Your next favorite meal
            <br />
            is one photo away.
          </h2>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link href={account ? "/new" : "/signup"} className="flex min-h-14 items-center gap-2 rounded-2xl bg-bg px-8 text-lg font-bold text-butter">
              {account ? "Snap a dish" : "Create your free account"} <ArrowRight size={20} aria-hidden="true" />
            </Link>
            <Link href="/board" className="flex min-h-14 items-center rounded-2xl border-2 border-bg px-7 text-lg font-bold">
              {account ? "Open your board" : "Look around first"}
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t-2 border-line px-4 py-10 md:px-8">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 text-sm text-muted">
          <span className="flex items-center gap-2">
            <LogoMark size={28} /> <span className="font-display font-extrabold text-ink">TasteHeist</span> · UNCC Hackathon 2026
          </span>
          <span>Nutrition and costs are estimates. Nutrition data: USDA FoodData Central.</span>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border-2 border-line bg-bg/70 p-3 backdrop-blur">
      <dt className="sr-only">{label}</dt>
      <dd className="font-display text-lg leading-tight font-extrabold text-ink sm:text-xl md:text-2xl">{value}</dd>
      <dd className="mt-1 text-xs leading-snug text-muted md:text-[13px]">{label}</dd>
    </div>
  );
}

function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-sm font-bold tracking-wide text-butter uppercase">{eyebrow}</p>
      <h2 className="mt-2 max-w-[760px] text-[clamp(36px,5vw,60px)] leading-[1.02] tracking-[-0.035em]">{title}</h2>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  text,
  className = "",
  children,
}: {
  icon: typeof Box;
  title: string;
  text: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`rounded-[28px] border-2 border-line bg-bg/90 p-6 backdrop-blur ${className}`}>
      <span className="flex size-12 items-center justify-center rounded-2xl bg-panel text-butter">
        <Icon size={24} aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-2xl tracking-[-0.5px]">{title}</h3>
      <p className="mt-1.5 text-muted">{text}</p>
      {children}
    </div>
  );
}

function MiniBar({ label, pct, color, value }: { label: string; pct: number; color: string; value: string }) {
  return (
    <div className="mt-4">
      <div className="flex justify-between text-sm font-bold">
        <span>{label}</span>
        <span className="text-muted">{value}</span>
      </div>
      <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-line">
        <div className={`h-3 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Proof({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[24px] bg-panel p-6">
      <dt className="sr-only">{label}</dt>
      <dd className="font-display text-4xl font-extrabold text-butter">{value}</dd>
      <dd className="mt-1 text-muted">{label}</dd>
    </div>
  );
}
