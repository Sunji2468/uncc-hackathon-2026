import "server-only";
import { cookies } from "next/headers";
import { config } from "./config";

export const DEMO_COOKIE = "th_demo";

/** Demo mode: DEMO_MODE=true for the whole server, or the per-browser toggle in Settings. */
export async function isDemo(): Promise<boolean> {
  if (config.demoMode) return true;
  return (await cookies()).get(DEMO_COOKIE)?.value === "1";
}

export const demoDelay = (ms = 1200) => new Promise((r) => setTimeout(r, ms));
