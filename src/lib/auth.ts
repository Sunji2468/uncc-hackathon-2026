import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { User } from "@prisma/client";
import { prisma } from "./db";
import { USER_COOKIE, USER_COOKIE_MAX_AGE, newUserId } from "./user-id";

export const SESSION_COOKIE = "th_session";
const SESSION_DAYS = 30;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/** The signed-in user for this request, or null. Expired sessions are cleaned up lazily. */
export async function getSessionUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length < 20) return null;
  const session = await prisma.session.findUnique({ where: { id: hashToken(token) }, include: { user: true } });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return session.user;
}

/** Starts a session (Route Handlers only, since it sets cookies). */
export async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  await prisma.session.create({
    data: { id: hashToken(token), userId, expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000) },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { ...cookieBase, maxAge: SESSION_DAYS * 86_400 });
  // The guest cookie must never point at an account: give this browser a fresh guest id
  // for whenever it logs out or the session expires.
  jar.set(USER_COOKIE, newUserId(), { ...cookieBase, maxAge: USER_COOKIE_MAX_AGE });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { id: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
  jar.set(USER_COOKIE, newUserId(), { ...cookieBase, maxAge: USER_COOKIE_MAX_AGE });
}

/**
 * Moves everything a guest made in this browser into an account, then removes
 * the guest. Reactions the account already gave are dropped, not duplicated.
 */
export async function mergeGuestInto(guestId: string, accountId: string): Promise<{ stickers: number }> {
  if (guestId === accountId) return { stickers: 0 };
  return prisma.$transaction(async (tx) => {
    const guest = await tx.user.findUnique({ where: { id: guestId }, select: { passwordHash: true } });
    if (!guest || guest.passwordHash) return { stickers: 0 }; // only real guests merge
    const stickers = await tx.sticker.updateMany({ where: { userId: guestId }, data: { userId: accountId } });
    await tx.mealLog.updateMany({ where: { userId: guestId }, data: { userId: accountId } });
    await tx.fridgePost.updateMany({ where: { userId: guestId }, data: { userId: accountId } });
    await tx.note.updateMany({ where: { userId: guestId }, data: { userId: accountId } });
    const mine = await tx.reaction.findMany({ where: { userId: accountId }, select: { postId: true, kind: true } });
    if (mine.length) {
      await tx.reaction.deleteMany({
        where: { userId: guestId, OR: mine.map((r) => ({ postId: r.postId, kind: r.kind })) },
      });
    }
    await tx.reaction.updateMany({ where: { userId: guestId }, data: { userId: accountId } });
    await tx.user.delete({ where: { id: guestId } });
    return { stickers: stickers.count };
  });
}

/** In-memory brute-force guard: N attempts per key per window (per server instance). */
const attempts = new Map<string, number[]>();
export function tooManyAttempts(key: string, max = 10, windowMs = 15 * 60_000): boolean {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  attempts.set(key, recent);
  if (attempts.size > 5000) attempts.clear();
  return recent.length > max;
}
