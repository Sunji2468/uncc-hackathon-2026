import { PageHeader } from "@/components/PageHeader";
import { getOrCreateUser } from "@/lib/user";
import { settingsFromUser } from "@/lib/settings";
import { SettingsForm } from "./SettingsForm";
import { config } from "@/lib/config";
import { isDemo } from "@/lib/demo";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getOrCreateUser();
  return (
    <>
      <PageHeader
        title="Goals and diet"
        subtitle="These shape every recipe, swap and suggestion. Changes save automatically."
      />
      <SettingsForm initial={settingsFromUser(user)} demo={{ on: await isDemo(), forced: config.demoMode }} />
    </>
  );
}
