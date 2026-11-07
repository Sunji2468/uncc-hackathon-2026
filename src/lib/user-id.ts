export const USER_COOKIE = "th_uid";
export const USER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const ID_PATTERN = /^u_[A-Za-z0-9_-]{16,64}$/;

/** Works in both the edge runtime and Node (uses Web Crypto). */
export function newUserId(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return `u_${s}`;
}

export function isValidUserId(id: string): boolean {
  return ID_PATTERN.test(id);
}
