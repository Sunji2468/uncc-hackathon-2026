import { notFound } from "next/navigation";
import { getOrCreateUser } from "@/lib/user";
import { settingsFromUser } from "@/lib/settings";
import { loadStickerView } from "@/lib/stickers";
import { StickerDetail } from "./StickerDetail";

export const dynamic = "force-dynamic";

export default async function StickerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateUser();
  const view = await loadStickerView(id, user.id);
  if (!view) notFound();
  const settings = settingsFromUser(user);
  return <StickerDetail initial={view} units={settings.units} diets={settings.diets} allergies={settings.allergies} />;
}
