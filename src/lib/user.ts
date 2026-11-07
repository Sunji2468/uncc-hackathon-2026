import "server-only";
import { cookies } from "next/headers";
import type { User } from "@prisma/client";
import { prisma } from "./db";
import { USER_COOKIE, isValidUserId, newUserId } from "./user-id";

/**
 * Returns the anonymous user for this request, creating the row on first use.
 *
 * The middleware guarantees a `th_uid` cookie is present on every request
 * (it only mints the id; it never touches the database). If it is somehow
 * missing, we mint one here and try to set it, which works in Route Handlers
 * and Server Actions.
 */
export async function getOrCreateUser(): Promise<User> {
  const jar = await cookies();
  let id = jar.get(USER_COOKIE)?.value;

  if (!id || !isValidUserId(id)) {
    id = newUserId();
    try {
      jar.set(USER_COOKIE, id, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
    } catch {
      // Server Components cannot set cookies; the middleware covers that case.
    }
  }

  return prisma.user.upsert({ where: { id }, update: {}, create: { id } });
}
