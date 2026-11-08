import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateUser } from "@/lib/user";
import { safeNext } from "@/lib/auth-schemas";
import { AuthForm } from "../AuthForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create your account · Bytehacks" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getSessionUser()) redirect(next);
  const guest = await getOrCreateUser();
  const hasGuestData = (await prisma.sticker.count({ where: { userId: guest.id } })) > 0;
  return <AuthForm mode="signup" next={next} hasGuestData={hasGuestData} />;
}
