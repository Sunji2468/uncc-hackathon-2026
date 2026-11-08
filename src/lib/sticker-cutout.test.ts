import { describe, expect, it } from "vitest";
import { stickerMask } from "./sticker-cutout";
function photo() {
  const pixels = new Uint8ClampedArray(20 * 20 * 4).fill(255);
  for (let y = 5; y < 16; y++) for (let x = 5; x < 16; x++) {
    const p = (y * 20 + x) * 4;
    pixels[p] = 160; pixels[p + 1] = 60; pixels[p + 2] = 30;
  }
  return pixels;
}
describe("conservative sticker cutout", () => {
  it("removes only the connected background, preserving a matching interior detail", () => {
    const pixels = photo();
    pixels.set([255,255,255,255], (10 * 20 + 10) * 4);
    const mask = stickerMask(pixels, 20, 20)!;
    expect(mask).not.toBeNull();
    expect(mask[0]).toBe(1);
    expect(mask[10 * 20 + 10]).toBe(0);
    expect(mask[6 * 20 + 6]).toBe(0);
  });
  it("falls back for inconsistent background colors", () => {
    const pixels = photo(); pixels.set([0,0,0,255], 0);
    expect(stickerMask(pixels, 20, 20)).toBeNull();
  });
  it("does not erase a low-contrast or empty image", () => {
    expect(stickerMask(new Uint8ClampedArray(1600).fill(255), 20, 20)).toBeNull();
  });
});
