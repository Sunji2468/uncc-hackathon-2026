import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Without APP_SECRET, tokens only survive until the server restarts (fine in dev).
const SECRET = process.env.APP_SECRET || randomBytes(32).toString("hex");

function hmac(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("base64url");
}

/** Signs a JSON payload with an expiry. Not encrypted: never put secrets in it. */
export function signPayload(payload: object, ttlSeconds: number): string {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + ttlSeconds * 1000 })).toString("base64url");
  return `${body}.${hmac(body)}`;
}

/** Returns the payload if the signature is valid and unexpired, else null. */
export function verifyPayload<T>(token: string): T | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(hmac(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString()) as T & { exp: number };
    return typeof data.exp === "number" && data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}
