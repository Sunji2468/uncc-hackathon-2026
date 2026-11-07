import { getOrCreateUser } from "@/lib/user";
import { parseSort } from "@/lib/fridge";
import { listFridge } from "@/lib/fridge-server";
import { Fridge } from "./Fridge";

export const dynamic = "force-dynamic";

export default async function FridgePage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const { sort } = await searchParams;
  const user = await getOrCreateUser();
  const s = parseSort(sort);
  return <Fridge initial={await listFridge(user.id, s)} initialSort={s} myName={user.displayName} />;
}
