import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, handler, parseBody } from "@/lib/api";
import { accountOf, getOrCreateUser } from "@/lib/user";
import { getSessionUser, mergeGuestInto, startSession, tooManyAttempts } from "@/lib/auth";
import { dummyHash, verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/auth-schemas";

const WRONG = "That username or password is not right.";

export const POST = handler(async (request: Request) => {
  const parsed = await parseBody(request, loginSchema);
  if (!parsed.ok) return parsed.response;
  const { identifier, password } = parsed.data;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (tooManyAttempts(`login:${identifier}`) || tooManyAttempts(`login-ip:${ip}`, 100)) {
    return apiError(429, "rate_limited", "Too many attempts. Wait a few minutes and try again.");
  }

  const user = await prisma.user.findFirst({
    where: identifier.includes("@") ? { email: identifier } : { username: identifier },
  });
  // Always run a hash comparison so response time does not reveal which accounts exist.
  const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()));
  if (!user?.passwordHash || !ok) return apiError(401, "bad_credentials", WRONG);

  // Bring along anything made as a guest in this browser before logging in.
  const current = (await getSessionUser()) ?? (await getOrCreateUser());
  const merged = current.id !== user.id ? await mergeGuestInto(current.id, user.id) : { stickers: 0 };

  await startSession(user.id);
  return NextResponse.json({ user: accountOf(user), merged });
});
