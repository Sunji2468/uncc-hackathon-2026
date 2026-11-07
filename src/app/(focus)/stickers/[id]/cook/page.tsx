import { notFound } from "next/navigation";
import { getOrCreateUser } from "@/lib/user";
import { settingsFromUser } from "@/lib/settings";
import { loadStickerView } from "@/lib/stickers";
import { CookMode } from "./CookMode";

export const dynamic = "force-dynamic";

export default async function CookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateUser();
  const view = await loadStickerView(id, user.id);
  if (!view) notFound();
  return <CookMode view={view} units={settingsFromUser(user).units} />;
}
