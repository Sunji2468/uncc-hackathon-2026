"use client";
import { stickerMask } from "@/lib/sticker-cutout";

const cache = new Map<string, Promise<string | null>>();
export function cutoutPhoto(src: string): Promise<string | null> {
  const cached = cache.get(src);
  if (cached) return cached;
  const work = makeCutout(src).catch(() => null);
  if (cache.size >= 40) cache.delete(cache.keys().next().value!);
  cache.set(src, work);
  return work;
}

async function makeCutout(src: string): Promise<string | null> {
  // Only process the app's local raster thumbnails, never third-party URLs or SVGs.
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(src)) return null;
  const image = new Image();
  image.src = src;
  await image.decode();
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 400 / Math.max(image.width, image.height));
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const mask = stickerMask(pixels.data, canvas.width, canvas.height);
  if (!mask) return null;
  for (let p = 0; p < mask.length; p++) if (mask[p]) pixels.data[p * 4 + 3] = 0;
  ctx.putImageData(pixels, 0, 0);
  return canvas.toDataURL("image/png");
}
