"use client";

export interface PreparedImage {
  /** Base64 JPEG without the data URL prefix, at most 1280 px on the long edge. */
  image: string;
  mediaType: "image/jpeg";
  /** 400 px wide JPEG data URL, about 40 KB. */
  thumbnail: string;
}

const MAX_EDGE = 1280;
const THUMB_WIDTH = 400;
const THUMB_MAX_CHARS = 55_000; // about 40 KB of JPEG

export class ImageDecodeError extends Error {}

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number }> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { source: bmp, width: bmp.width, height: bmp.height };
  } catch {
    // Older Safari: fall back to an <img> element.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return { source: img, width: img.naturalWidth, height: img.naturalHeight };
    } catch {
      throw new ImageDecodeError("We could not open that file. Please use a JPG or PNG photo.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function render(source: CanvasImageSource, width: number, height: number, quality: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageDecodeError("Your browser could not process that photo.");
  ctx.fillStyle = "#ffffff"; // flatten PNG transparency before JPEG
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

/** Resizes a photo for the AI call and makes a small thumbnail for the sticker. */
export async function prepareImage(file: Blob): Promise<PreparedImage> {
  const { source, width, height } = await decode(file);

  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const full = render(source, width * scale, height * scale, 0.8);

  const tScale = Math.min(1, THUMB_WIDTH / width);
  let quality = 0.75;
  let thumbnail = render(source, width * tScale, height * tScale, quality);
  while (thumbnail.length > THUMB_MAX_CHARS && quality > 0.35) {
    quality -= 0.1;
    thumbnail = render(source, width * tScale, height * tScale, quality);
  }

  if ("close" in source && typeof source.close === "function") source.close();
  return { image: full.slice(full.indexOf(",") + 1), mediaType: "image/jpeg", thumbnail };
}
