import { z } from "zod";

export const MAX_BODY_BYTES = 4 * 1024 * 1024;

/** Strips an optional data URL prefix. */
export function stripDataUrl(s: string): string {
  const comma = s.indexOf(",");
  return s.startsWith("data:") && comma > 0 ? s.slice(comma + 1) : s;
}

/** Checks the base64 payload really starts with JPEG or PNG magic bytes. */
export function sniffMediaType(base64: string): "image/jpeg" | "image/png" | null {
  if (base64.startsWith("/9j/")) return "image/jpeg";
  if (base64.startsWith("iVBORw0KGgo")) return "image/png";
  return null;
}

export const mediaTypeSchema = z.enum(["image/jpeg", "image/png"]);

export const imageSchema = z
  .string()
  .min(100, "image is empty")
  .max(MAX_BODY_BYTES, "image is too large")
  .transform(stripDataUrl)
  .refine((s) => /^[A-Za-z0-9+/]+=*$/.test(s), "image must be base64");

/** Thumbnail: a small JPEG or PNG data URL (about 40 KB). */
export const thumbnailSchema = z
  .string()
  .max(120_000, "thumbnail is too large")
  .regex(/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/]+=*$/, "thumbnail must be a JPEG or PNG data URL");

export function bodyTooLarge(request: Request): boolean {
  const len = Number(request.headers.get("content-length") ?? "0");
  return len > MAX_BODY_BYTES;
}
