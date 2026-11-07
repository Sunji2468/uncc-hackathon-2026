export interface Heist {
  restaurantTotalCents: number;
  homeTotalCents: number;
  keepCents: number;
}

/**
 * Restaurant vs home for the given servings. Mystery and Twist stickers have
 * no menu price, so there is no heist to compute: returns null.
 */
export function heistMath(menuPriceCents: number | null, homeTotalCents: number, servings: number): Heist | null {
  if (menuPriceCents == null) return null;
  const restaurantTotalCents = menuPriceCents * servings;
  return { restaurantTotalCents, homeTotalCents, keepCents: restaurantTotalCents - homeTotalCents };
}
