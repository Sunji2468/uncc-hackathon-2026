import { PageHeader } from "@/components/PageHeader";
import { getOrCreateUser } from "@/lib/user";
import { settingsFromUser } from "@/lib/settings";
import { NewSticker } from "./NewSticker";

export const dynamic = "force-dynamic";

export default async function NewStickerPage() {
  const user = await getOrCreateUser();
  return (
    <>
      <PageHeader
        title="New sticker"
        subtitle="Add a photo of a restaurant dish. It becomes a sticker on your board."
      />
      <NewSticker initialSettings={settingsFromUser(user)} />
    </>
  );
}
