import "server-only";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { AiError } from "./errors";

export function utcDay(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Atomically counts one AI call against the user's daily cap. Throws a
 * rate_limited AiError (HTTP 429) when the cap is reached.
 */
export async function consumeAiCall(userId: string): Promise<void> {
  const today = utcDay();
  const limit = config.aiDailyLimit;

  const sameDay = await prisma.user.updateMany({
    where: { id: userId, aiCallsDay: today, aiCallsToday: { lt: limit } },
    data: { aiCallsToday: { increment: 1 } },
  });
  if (sameDay.count === 1) return;

  const newDay = await prisma.user.updateMany({
    where: { id: userId, aiCallsDay: { not: today } },
    data: { aiCallsDay: today, aiCallsToday: 1 },
  });
  if (newDay.count === 1) return;

  throw new AiError("rate_limited");
}
