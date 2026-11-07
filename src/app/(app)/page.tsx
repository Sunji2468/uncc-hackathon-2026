import { getOrCreateUser } from "@/lib/user";
import { listStickerSummaries } from "@/lib/stickers";
import { parseFilter } from "@/lib/sticker-summary";
import { Board } from "./Board";

export const dynamic = "force-dynamic";

export default async function BoardPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter } = await searchParams;
  const user = await getOrCreateUser();
  const stickers = await listStickerSummaries(user.id);
  return <Board initial={stickers} initialFilter={parseFilter(filter)} />;
}
