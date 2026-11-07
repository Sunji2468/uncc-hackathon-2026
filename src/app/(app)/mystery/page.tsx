import { PageHeader } from "@/components/PageHeader";
import { getOrCreateUser } from "@/lib/user";
import { settingsFromUser } from "@/lib/settings";
import { MysteryBox } from "./MysteryBox";

export const dynamic = "force-dynamic";

export default async function MysteryPage() {
  const user = await getOrCreateUser();
  return (
    <>
      <PageHeader
        title="Mystery Box"
        subtitle="Photograph your counter, set the clock, and open the box. The recipe uses only what you have, plus oil, salt, pepper and water."
      />
      <MysteryBox settings={settingsFromUser(user)} />
    </>
  );
}
