import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { handler, parseBody } from "@/lib/api";
import { normalizeSettings, settingsFromUser, settingsSchema } from "@/lib/settings";

export const GET = handler(async () => {
  const user = await getOrCreateUser();
  return NextResponse.json(settingsFromUser(user));
});

export const PUT = handler(async (request: Request) => {
  const user = await getOrCreateUser();
  const parsed = await parseBody(request, settingsSchema);
  if (!parsed.ok) return parsed.response;

  const data = normalizeSettings(parsed.data);
  const updated = await prisma.user.update({ where: { id: user.id }, data });
  return NextResponse.json(settingsFromUser(updated));
});
