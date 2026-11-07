import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { handler } from "@/lib/api";

/** "Clear my board": removes this user's stickers, meals and posts. Settings are kept. */
export const DELETE = handler(async () => {
  const user = await getOrCreateUser();
  const [stickers, meals, posts] = await prisma.$transaction([
    prisma.fridgePost.deleteMany({ where: { userId: user.id } }),
    prisma.mealLog.deleteMany({ where: { userId: user.id } }),
    prisma.sticker.deleteMany({ where: { userId: user.id } }),
  ]).then(([p, m, s]) => [s.count, m.count, p.count]);
  return NextResponse.json({ deleted: { stickers, meals, posts } });
});
