import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiError, handler, parseBody } from "@/lib/api";
import { getOrCreateUser } from "@/lib/user";
import { REACTIONS } from "@/lib/fridge";
import { fridgePost } from "@/lib/fridge-server";

type Ctx = { params: Promise<{ id: string }> };
const bodySchema = z.object({ kind: z.enum(REACTIONS) });

/** Toggles this user's reaction of one kind on a post. */
export const POST = handler(async (request: Request, { params }: Ctx) => {
  const { id } = await params;
  const parsed = await parseBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;
  const user = await getOrCreateUser();
  const exists = await prisma.fridgePost.count({ where: { id } });
  if (!exists) return apiError(404, "not_found", "That post does not exist.");

  const key = { postId: id, userId: user.id, kind: parsed.data.kind };
  const removed = await prisma.reaction.deleteMany({ where: key });
  if (removed.count === 0) {
    // Unique (postId, userId, kind) makes double-clicks safe.
    await prisma.reaction.upsert({ where: { postId_userId_kind: key }, update: {}, create: key });
  }
  return NextResponse.json({ post: await fridgePost(id, user.id) });
});
