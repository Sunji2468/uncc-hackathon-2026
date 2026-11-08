"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useRef, useState } from "react";

const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/**
 * Loads the three.js hero only in the browser, after the brand fonts are ready
 * (they are painted into the sticker textures). Until then, and wherever WebGL
 * is unavailable, a static CSS sticker stack stands in.
 */
export function HeroCanvas() {
  const host = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);
  const [reduced, setReduced] = useState(true);
  const [motionOverride, setMotionOverride] = useState<boolean | null>(null);
  const motionEnabled = motionOverride ?? !reduced;
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const onReady = useCallback(() => setReady(true), []);
  const [canRender, setCanRender] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReduced(motion.matches);
    updateMotion();
    motion.addEventListener("change", updateMotion);
    let visible = true;
    const updateActive = () => setActive(visible && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; updateActive(); });
    if (host.current) observer.observe(host.current);
    document.addEventListener("visibilitychange", updateActive);
    return () => { observer.disconnect(); motion.removeEventListener("change", updateMotion); document.removeEventListener("visibilitychange", updateActive); };
  }, []);

  useEffect(() => {
    if (!webglAvailable()) { setUnavailable("WebGL 2 is unavailable. Enable graphics acceleration in your browser and relaunch."); return; }
    let cancelled = false;
    const css = getComputedStyle(document.documentElement);
    const display = css.getPropertyValue("--font-bricolage").trim();
    const body = css.getPropertyValue("--font-dm-sans").trim();
    const timeout = window.setTimeout(() => { if (!cancelled) setCanRender(true); }, 1800);
    Promise.all([
      document.fonts.load(`800 48px ${display}`),
      document.fonts.load(`700 24px ${body}`),
      document.fonts.load(`500 24px ${body}`),
    ])
      .catch(() => undefined)
      .finally(() => { window.clearTimeout(timeout); if (!cancelled) setCanRender(true); });
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, []);

  return (
    <div ref={host} className="absolute inset-0">
      <div aria-hidden="true" className="pointer-events-none absolute left-[12%] top-[20%] h-[60%] w-[75%] rounded-full bg-butter/[0.07] blur-3xl" />
      <div aria-hidden="true" className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-0" : "opacity-100"}`}>
        <StaticStickers />
      </div>
      {canRender && (
        <div aria-hidden="true" className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}>
          <SceneBoundary fallback={<StaticStickers />} onError={() => { setUnavailable("The 3D scene could not load. Reload the page to try again."); setReady(false); }}>
            <HeroScene onReady={onReady} reduced={!motionEnabled} active={active} />
          </SceneBoundary>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-4 text-[11px] font-bold uppercase tracking-[0.16em] text-muted md:bottom-8">
        <span>{unavailable ?? "One dish. Endless possibility."}</span>
        {ready && !unavailable && <button type="button" onClick={() => setMotionOverride(!motionEnabled)} className="min-h-11 shrink-0 rounded-full border border-line bg-bg/80 px-3 text-[10px] hover:text-butter" aria-label={motionEnabled ? "Pause motion" : "Enable animation"} aria-pressed={motionEnabled}>{motionEnabled ? "Pause motion" : "Enable animation"}</button>}
      </div>
    </div>
  );
}

class SceneBoundary extends Component<{ children: React.ReactNode; fallback: React.ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function StaticStickers() {
  return (
    <div className="absolute top-[14%] left-[5%] h-[70%] w-[90%]">
      <div className="absolute top-[8%] left-[20%] w-[65%] max-w-[260px] rotate-[-5deg] overflow-hidden rounded-[30px] border-[7px] border-white bg-face shadow-[0_24px_48px_rgba(0,0,0,0.5)]">
        <div className="h-[150px] bg-butter" />
        <div className="px-5 pt-4 pb-5 text-sticker-ink">
          <p className="font-display text-3xl font-extrabold">Cacio e Pepe</p>
          <p className="mt-1 font-bold text-sticker-muted">
            <span className="line-through">$25.00</span> <span className="ml-2 rounded-full bg-coral px-3 py-1 text-bg">$1.68</span>
          </p>
        </div>
      </div>
      <div className="absolute top-[52%] left-[4%] h-[190px] w-[160px] rotate-[8deg] rounded-[26px] border-[6px] border-white bg-[#FFB199] shadow-xl" />
      <div className="absolute top-[2%] right-[2%] h-[180px] w-[150px] rotate-[-10deg] rounded-[26px] border-[6px] border-white bg-bg shadow-xl" />
    </div>
  );
}
