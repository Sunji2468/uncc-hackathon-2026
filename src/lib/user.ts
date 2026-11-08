import "server-only";
import { createHash } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import type { User } from "@prisma/client";
import { prisma } from "./db";
import { getSessionUser } from "./auth";
import { USER_COOKIE, USER_COOKIE_MAX_AGE, isValidUserId, newUserId } from "./user-id";

/**
 * The user for this request:
 * 1. a signed-in account (th_session cookie), else
 * 2. the anonymous guest for this browser (th_uid cookie), created on first use.
 *
 * The middleware guarantees th_uid exists (it only mints the id; it never touches
 * the database). Sign-up, log-in and log-out rotate th_uid, so it never points at
 * an account; the guard below is a second line of defence.
 */
export const getOrCreateUser = cache(resolveUser);

/** Create-if-missing that tolerates two requests creating the same row at once. */
async function ensureUser(id: string): Promise<User> {
  try {
    return await prisma.user.upsert({ where: { id }, update: {}, create: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await prisma.user.findUnique({ where: { id } });
      if (existing) return existing;
    }
    throw err;
  }
}

async function resolveUser(): Promise<User> {
  const account = await getSessionUser();
  if (account) return account;

  const jar = await cookies();
  let id = jar.get(USER_COOKIE)?.value;
  if (!id || !isValidUserId(id)) {
    id = newUserId();
    try {
      jar.set(USER_COOKIE, id, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: USER_COOKIE_MAX_AGE,
        path: "/",
      });
    } catch {
      // Server Components cannot set cookies; the middleware covers that case.
    }
  }

  const user = await ensureUser(id);
  if (!user.passwordHash) return user;

  // A guest cookie that points at an account must not grant access to it.
  // Use a stable derived guest id so repeated renders do not create new rows.
  const guestId = `u_${createHash("sha256").update(`guest:${id}`).digest("hex").slice(0, 36)}`;
  return ensureUser(guestId);
}

/** Public account details for the UI, or null for guests. */
export function accountOf(user: User): { name: string; username: string; email: string } | null {
  return user.username && user.passwordHash
    ? { name: user.displayName, username: user.username, email: user.email ?? "" }
    : null;
}
