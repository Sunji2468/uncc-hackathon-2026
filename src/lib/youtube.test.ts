import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { findRecipeVideos } from "./youtube";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("YouTube recipe recommendations", () => {
  it("does not call YouTube without a configured key", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(findRecipeVideos("Roast chicken")).rejects.toMatchObject({ code: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requests real embeddable videos and caches the response", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [
      { id: { videoId: "abcdefghijk" }, snippet: { title: "Roast chicken", channelTitle: "Kitchen" } },
    ] })));
    vi.stubGlobal("fetch", fetchMock);
    expect(await findRecipeVideos("Chicken & potatoes")).toEqual([{ id: "abcdefghijk", title: "Roast chicken", channel: "Kitchen" }]);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("q")).toBe("Chicken & potatoes recipe cooking tutorial");
    expect(url.searchParams.get("videoEmbeddable")).toBe("true");
    expect(url.searchParams.get("type")).toBe("video");
    expect(fetchMock.mock.calls[0][1].next.revalidate).toBe(86400);
  });

  it.each([403, 429, 500])("handles provider status %i without leaking details", async (status) => {
    vi.stubEnv("YOUTUBE_API_KEY", "secret-test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("secret-test-key", { status })));
    await expect(findRecipeVideos("Roast")).rejects.toMatchObject({ code: "unavailable" });
  });

  it("returns an empty list for no matches", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"items":[]}')));
    expect(await findRecipeVideos("Roast")).toEqual([]);
  });

  it("rejects invalid video IDs instead of constructing unsafe embeds", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [
      { id: { videoId: "../bad?value=x" }, snippet: { title: "Bad", channelTitle: "Bad" } },
    ] }))));
    await expect(findRecipeVideos("Roast")).rejects.toMatchObject({ code: "unavailable" });
  });
});
