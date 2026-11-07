export const REACTIONS = ["FIRE", "HEART", "YUM"] as const;
export type Reaction = (typeof REACTIONS)[number];
export const NOTE_MAX = 140;

export interface FridgeNote {
  id: string;
  text: string;
  author: string;
  mine: boolean;
  createdAt: string;
}

export interface FridgePostView {
  id: string;
  title: string;
  thumbnail: string;
  author: string;
  mine: boolean;
  menuPriceCents: number;
  homeCostCents: number;
  keepCents: number;
  counts: Record<Reaction, number>;
  reacted: Record<Reaction, boolean>;
  notes: FridgeNote[];
  createdAt: string;
}

export type FridgeSort = "new" | "heist";

export function parseSort(v: string | null | undefined): FridgeSort {
  return v === "heist" ? "heist" : "new";
}

/** Tallies reaction rows into counts plus "did this user react" flags. */
export function tallyReactions(rows: { kind: string; userId: string }[], userId: string) {
  const counts = { FIRE: 0, HEART: 0, YUM: 0 } as Record<Reaction, number>;
  const reacted = { FIRE: false, HEART: false, YUM: false } as Record<Reaction, boolean>;
  for (const r of rows) {
    if (!(REACTIONS as readonly string[]).includes(r.kind)) continue;
    const k = r.kind as Reaction;
    counts[k] += 1;
    if (r.userId === userId) reacted[k] = true;
  }
  return { counts, reacted };
}

/** "Heist" sort: money kept per plate, biggest first; newest breaks ties. */
export function sortPosts<T extends { keepCents: number; createdAt: string }>(posts: T[], sort: FridgeSort): T[] {
  const byNew = (a: T, b: T) => b.createdAt.localeCompare(a.createdAt);
  return [...posts].sort(sort === "heist" ? (a, b) => b.keepCents - a.keepCents || byNew(a, b) : byNew);
}

/** Top heists posted within the last `days` days. */
export function topHeists<T extends { keepCents: number; createdAt: string }>(posts: T[], now: Date, days = 7, n = 3): T[] {
  const since = now.getTime() - days * 24 * 60 * 60 * 1000;
  return sortPosts(posts.filter((p) => new Date(p.createdAt).getTime() >= since && p.keepCents > 0), "heist").slice(0, n);
}

/** Applies a reaction toggle locally, mirroring the server. */
export function toggleReaction(p: FridgePostView, kind: Reaction): FridgePostView {
  const on = !p.reacted[kind];
  return {
    ...p,
    reacted: { ...p.reacted, [kind]: on },
    counts: { ...p.counts, [kind]: Math.max(0, p.counts[kind] + (on ? 1 : -1)) },
  };
}
