import { getOrCreateUser } from "@/lib/user";
import { listStickerSummaries } from "@/lib/stickers";
import { settingsFromUser } from "@/lib/settings";
import { MacroBudget } from "./MacroBudget";

export const dynamic = "force-dynamic";

export default async function MacrosPage() {
  const user = await getOrCreateUser();
  const stickers = await listStickerSummaries(user.id);
  return <MacroBudget stickers={stickers} goals={settingsFromUser(user)} />;
}
