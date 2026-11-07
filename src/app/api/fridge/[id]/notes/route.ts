import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiError, handler, parseBody } from "@/lib/api";
import { getOrCreateUser } from "@/lib/user";
import { NOTE_MAX } from "@/lib/fridge";
import { fridgePost } from "@/lib/fridge-server";

type Ctx = { params: Promise<{ id: string }> };
const bodySchema = z.object({ text: z.string().trim().min(1, "Write something first.").max(NOTE_MAX) });

export const POST = handler(async (request: Request, { params }: Ctx) => {
  const { id } = await params;
  const parsed = await parseBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;
  const user = await getOrCreateUser();
  const exists = await prisma.fridgePost.count({ where: { id } });
  if (!exists) return apiError(404, "not_found", "That post does not exist.");
  await prisma.note.create({ data: { postId: id, userId: user.id, text: parsed.data.text } });
  return NextResponse.json({ post: await fridgePost(id, user.id) }, { status: 201 });
});
