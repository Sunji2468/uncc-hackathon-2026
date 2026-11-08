import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { accountOf, getOrCreateUser } from "@/lib/user";

export const GET = handler(async () => {
  const user = await getOrCreateUser();
  return NextResponse.json({ user: accountOf(user) });
});
