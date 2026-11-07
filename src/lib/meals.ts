import "server-only";
import { prisma } from "./db";

export async function mealsForDay(userId: string, day: string) {
  const meals = await prisma.mealLog.findMany({
    where: { userId, day },
    orderBy: { createdAt: "asc" },
    select: { id: true, stickerId: true, name: true, kcal: true, proteinG: true, day: true, createdAt: true },
  });
  const totals = meals.reduce((t, m) => ({ kcal: t.kcal + m.kcal, proteinG: t.proteinG + m.proteinG }), { kcal: 0, proteinG: 0 });
  return { meals, totals };
}
