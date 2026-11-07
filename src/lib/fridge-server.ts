import "server-only";
import { prisma } from "./db";
import { sortPosts, tallyReactions, type FridgePostView, type FridgeSort } from "./fridge";

const MAX_POSTS = 100;

const postInclude = {
  user: { select: { displayName: true } },
  reactions: { select: { kind: true, userId: true } },
  notes: { orderBy: { createdAt: "asc" as const }, take: 50, include: { user: { select: { displayName: true } } } },
};

type PostRow = Awaited<ReturnType<typeof loadRows>>[number];

function loadRows(where: { id?: string } = {}) {
  return prisma.fridgePost.findMany({ where, orderBy: { createdAt: "desc" }, take: MAX_POSTS, include: postInclude });
}

function toView(p: PostRow, viewerId: string): FridgePostView {
  return {
    id: p.id,
    title: p.title,
    thumbnail: p.thumbnail,
    author: p.userId === viewerId ? "you" : p.user.displayName,
    mine: p.userId === viewerId,
    menuPriceCents: p.menuPriceCents,
    homeCostCents: p.homeCostCents,
    keepCents: p.menuPriceCents - p.homeCostCents,
    ...tallyReactions(p.reactions, viewerId),
    notes: p.notes.map((n) => ({
      id: n.id,
      text: n.text,
      author: n.userId === viewerId ? "you" : n.user.displayName,
      mine: n.userId === viewerId,
      createdAt: n.createdAt.toISOString(),
    })),
    createdAt: p.createdAt.toISOString(),
  };
}

export async function listFridge(viewerId: string, sort: FridgeSort): Promise<FridgePostView[]> {
  return sortPosts((await loadRows()).map((p) => toView(p, viewerId)), sort);
}

export async function fridgePost(id: string, viewerId: string): Promise<FridgePostView | null> {
  const [row] = await loadRows({ id });
  return row ? toView(row, viewerId) : null;
}
