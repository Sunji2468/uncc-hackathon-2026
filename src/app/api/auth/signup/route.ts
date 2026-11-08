import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { apiError, handler, parseBody } from "@/lib/api";
import { getOrCreateUser, accountOf } from "@/lib/user";
import { getSessionUser, startSession, tooManyAttempts } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { signupSchema } from "@/lib/auth-schemas";
import { config } from "@/lib/config";

/**
 * Creates an account by claiming this browser's guest user, so everything made
 * so far (stickers, meals, Fridge posts) stays.
 */
export const POST = handler(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (tooManyAttempts(`signup:${ip}`, config.signupsPerHour, 60 * 60_000)) {
    return apiError(429, "rate_limited", "Too many sign-ups from here. Please try again later.");
  }
  const parsed = await parseBody(request, signupSchema);
  if (!parsed.ok) return parsed.response;
  const { name, username, email, password } = parsed.data;

  if (await getSessionUser()) return apiError(409, "signed_in", "You are already signed in. Log out first.");

  const taken = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
    select: { username: true, email: true },
  });
  if (taken) {
    return taken.username === username
      ? apiError(409, "username_taken", "That username is taken. Try another.")
      : apiError(409, "email_taken", "An account with that email already exists. Log in instead.");
  }

  const guest = await getOrCreateUser();
  try {
    const user = await prisma.user.update({
      where: { id: guest.id },
      data: { username, email, displayName: name, passwordHash: await hashPassword(password) },
    });
    await startSession(user.id);
    return NextResponse.json({ user: accountOf(user) }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return apiError(409, "taken", "That username or email was just taken. Try another.");
    }
    throw err;
  }
});
