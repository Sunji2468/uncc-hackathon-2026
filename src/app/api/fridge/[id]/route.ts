import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, handler } from "@/lib/api";
import { getOrCreateUser } from "@/lib/user";

type Ctx = { params: Promise<{ id: string }> };

/** Take down your own post. */
export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const user = await getOrCreateUser();
  const { count } = await prisma.fridgePost.deleteMany({ where: { id, userId: user.id } });
  return count === 0 ? apiError(404, "not_found", "That post does not exist.") : NextResponse.json({ deleted: true });
});
