import { describe, expect, it } from "vitest";
import { parseSort, sortPosts, tallyReactions, toggleReaction, topHeists, type FridgePostView } from "./fridge";

const post = (id: string, keepCents: number, createdAt: string) => ({ id, keepCents, createdAt });

describe("tallyReactions", () => {
  it("counts each kind and flags the viewer's own", () => {
    const t = tallyReactions(
      [
        { kind: "FIRE", userId: "a" },
        { kind: "FIRE", userId: "b" },
        { kind: "YUM", userId: "a" },
        { kind: "BOGUS", userId: "a" },
      ],
      "a",
    );
    expect(t.counts).toEqual({ FIRE: 2, HEART: 0, YUM: 1 });
    expect(t.reacted).toEqual({ FIRE: true, HEART: false, YUM: true });
  });
});

describe("sortPosts", () => {
  const posts = [post("old-big", 2000, "2026-11-01T00:00:00Z"), post("new-small", 500, "2026-11-07T00:00:00Z"), post("mid", 2000, "2026-11-05T00:00:00Z")];
  it("sorts newest first", () => expect(sortPosts(posts, "new").map((p) => p.id)).toEqual(["new-small", "mid", "old-big"]));
  it("sorts by money kept, newest breaking ties", () =>
    expect(sortPosts(posts, "heist").map((p) => p.id)).toEqual(["mid", "old-big", "new-small"]));
  it("parses the sort param", () => {
    expect(parseSort("heist")).toBe("heist");
    expect(parseSort("drop table")).toBe("new");
  });
});

describe("topHeists", () => {
  it("ranks only the last 7 days and positive heists", () => {
    const now = new Date("2026-11-07T12:00:00Z");
    const posts = [post("a", 1800, "2026-11-06T00:00:00Z"), post("b", 5000, "2026-10-01T00:00:00Z"), post("c", -100, "2026-11-07T00:00:00Z"), post("d", 900, "2026-11-02T00:00:00Z")];
    expect(topHeists(posts, now).map((p) => p.id)).toEqual(["a", "d"]);
  });
});

describe("toggleReaction", () => {
  it("adds and removes the viewer's reaction", () => {
    const p = { counts: { FIRE: 2, HEART: 0, YUM: 0 }, reacted: { FIRE: false, HEART: false, YUM: false } } as FridgePostView;
    const on = toggleReaction(p, "FIRE");
    expect(on.counts.FIRE).toBe(3);
    expect(on.reacted.FIRE).toBe(true);
    expect(toggleReaction(on, "FIRE").counts.FIRE).toBe(2);
  });
});
