import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Avatar, LogoutButton } from "@/components/AccountControls";
import { accountOf, getOrCreateUser } from "@/lib/user";
import { settingsFromUser } from "@/lib/settings";
import { SettingsForm } from "./SettingsForm";
import { config } from "@/lib/config";
import { isDemo } from "@/lib/demo";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getOrCreateUser();
  const account = accountOf(user);
  return (
    <>
      <PageHeader
        title="Goals and diet"
        subtitle="These shape every recipe, swap and suggestion. Changes save automatically."
      />

      <section
        id="account"
        aria-labelledby="account-h"
        className="mt-6 flex scroll-mt-6 flex-wrap items-center justify-between gap-4 rounded-[28px] border-2 border-line bg-panel px-6 py-5"
      >
        {account ? (
          <>
            <div className="flex min-w-0 items-center gap-4">
              <Avatar name={account.name} size={52} />
              <div className="min-w-0">
                <h2 id="account-h" className="truncate text-2xl tracking-[-0.5px]">
                  {account.name}
                </h2>
                <p className="truncate text-sm text-muted">
                  @{account.username} · {account.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted">Your board is saved to your account.</p>
              <LogoutButton className="border-2 border-line" />
            </div>
          </>
        ) : (
          <>
            <div>
              <h2 id="account-h" className="text-2xl tracking-[-0.5px]">
                You are using Bytehacks as a guest
              </h2>
              <p className="mt-1 text-sm text-muted">
                Your board is saved in this browser only. Create an account to keep it on any device; everything you have made comes with you.
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/signup?next=/settings" className="flex min-h-12 items-center rounded-2xl bg-butter px-5 font-bold text-bg">
                Sign up
              </Link>
              <Link href="/login?next=/settings" className="flex min-h-12 items-center rounded-2xl border-2 border-ink px-5 font-bold">
                Log in
              </Link>
            </div>
          </>
        )}
      </section>

      <SettingsForm initial={settingsFromUser(user)} demo={{ on: await isDemo(), forced: config.demoMode }} />
    </>
  );
}
