import type { PriceCategory } from "./prices";
import type { AiIngredient, MysteryRecipe, SmartTwist, SuggestSwaps } from "./ai/schemas";
import { dietConflict } from "./diet";
import { isPantryStaple, tokens } from "./mystery";

/**
 * Offline stand-ins for every AI call, used in demo mode so the whole app runs
 * with no API keys. They go through the same validation, USDA lookup and
 * rescaling as live answers.
 */

interface Diets {
  diets: readonly string[];
  allergies: readonly string[];
}

const ok = (names: { name: string; category?: string }[], d: Diets) => names.every((n) => !dietConflict(n, d.diets, d.allergies));

const ing = (
  name: string,
  grams: number,
  category: PriceCategory,
  usda: string,
  kcal: number,
  protein: number,
): AiIngredient => ({
  name,
  grams_per_serving: grams,
  category,
  usda_query: usda,
  kcal_per_100g_estimate: kcal,
  protein_per_100g_estimate: protein,
});

const PANTRY = (): (AiIngredient & { from_list: string })[] => [
  { ...ing("Vegetable oil", 10, "butter_oil", "oil canola", 884, 0), from_list: "pantry" },
  { ...ing("Salt", 2, "spice", "salt table", 0, 0), from_list: "pantry" },
  { ...ing("Black pepper", 1, "spice", "spices pepper black", 251, 10), from_list: "pantry" },
];

/** Rough category, grams and per-100 g guesses for a listed item, by keyword. */
const GUESSES: [RegExp, PriceCategory, number, number, number][] = [
  [/\begg/, "eggs", 100, 143, 12.6],
  [/\b(rice|quinoa|oat|couscous|barley)/, "rice_grain", 150, 130, 2.7],
  [/\b(pasta|spaghetti|noodle|macaroni|penne)/, "pasta", 90, 371, 13],
  [/\b(bread|tortilla|bun|pita)/, "bread", 60, 265, 9],
  [/\bchicken|turkey/, "chicken", 130, 120, 22],
  [/\bbeef|steak/, "beef", 120, 250, 26],
  [/\bpork|bacon|ham|sausage/, "pork", 110, 240, 20],
  [/\b(fish|salmon|tuna|cod)/, "fish", 120, 180, 20],
  [/\b(shrimp|prawn|crab|scallop)/, "seafood", 120, 85, 20],
  [/\b(cheese|feta|mozzarella|parmesan)/, "cheese", 30, 380, 25],
  [/\b(milk|yogurt|cream)/, "dairy_milk", 100, 60, 3.5],
  [/\b(bean|lentil|chickpea|tofu)/, "legume", 100, 120, 8],
  [/\b(apple|banana|lemon|lime|orange|berry|mango|melon)/, "fruit", 60, 50, 0.8],
];

function guess(item: string): { category: PriceCategory; grams: number; kcal: number; protein: number } {
  const s = item.toLowerCase();
  for (const [re, category, grams, kcal, protein] of GUESSES) if (re.test(s)) return { category, grams, kcal, protein };
  return { category: "vegetable", grams: 80, kcal: 30, protein: 1.5 };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function demoMysteryRecipe(listed: string[], timeLimitMin: number, d: Diets): MysteryRecipe {
  const usable = listed.filter((l) => !isPantryStaple(l) && ok([{ name: l, category: guess(l).category }], d)).slice(0, 6);
  const has = (w: string) => usable.find((l) => tokens(l).includes(w));
  const egg = has("egg"), rice = has("rice"), tomato = has("tomato"), scallion = has("scallion");

  // The sample counter from the design: a proper tomato-egg fried rice.
  if (egg && rice && tomato && timeLimitMin <= 30) {
    return {
      title: "Tomato-egg fried rice",
      confidence: 0.85,
      assumptions: "Assumed day-old cooked rice and two eggs per serving.",
      total_minutes: 15,
      ingredients: [
        { ...ing("Eggs", 100, "eggs", "egg whole raw fresh", 143, 12.6), from_list: egg },
        { ...ing("Cooked rice", 180, "rice_grain", "rice white long-grain regular enriched cooked", 130, 2.7), from_list: rice },
        { ...ing("Tomatoes", 120, "vegetable", "tomatoes red ripe raw", 18, 0.9), from_list: tomato },
        ...(scallion ? [{ ...ing("Scallions", 15, "vegetable", "onions spring or scallions raw", 32, 1.8), from_list: scallion }] : []),
        ...PANTRY(),
      ],
      steps: [
        "Scramble the eggs soft in hot oil and push them aside.",
        "Fry the rice and chopped tomato until the grains crackle.",
        "Fold the eggs back in and season with salt and pepper.",
        ...(scallion ? ["Finish with sliced scallions and serve."] : ["Serve hot."]),
      ],
    };
  }

  const items = usable.length ? usable : listed.slice(0, 1);
  const style = timeLimitMin >= 60 ? "Tray Roast" : timeLimitMin >= 30 ? "One-Pan Skillet" : "Quick Stir-Fry";
  const minutes = timeLimitMin >= 60 ? 45 : timeLimitMin >= 30 ? 25 : 15;
  const names = items.map(cap);
  const steps =
    timeLimitMin >= 60
      ? [
          "Heat the oven to 220 C (425 F).",
          "Cut everything into even bite-size pieces.",
          "Toss with the oil, salt and pepper on a tray.",
          `Roast for 30 minutes, turning once, until the ${names[0].toLowerCase()} is cooked and golden.`,
          "Rest for 5 minutes and serve.",
        ]
      : [
          "Cut everything into small, even pieces.",
          "Heat the oil in a large skillet over high heat.",
          `Cook the ${names[0].toLowerCase()} first until done, then add the rest.`,
          "Toss for 3 to 4 minutes and season with salt and pepper.",
          "Serve at once.",
        ];
  return {
    title: `${names.slice(0, 2).join(" and ")} ${style}`.slice(0, 40),
    confidence: 0.6,
    assumptions: "Demo recipe built offline from your ingredients.",
    total_minutes: minutes,
    ingredients: [
      ...items.map((l) => {
        const g = guess(l);
        return { ...ing(cap(l), g.grams, g.category, `${l} raw`, g.kcal, g.protein), from_list: l };
      }),
      ...PANTRY(),
    ],
    steps,
  };
}

const TWISTS: SmartTwist[] = [
  {
    title: "Salmon with crispy potatoes",
    confidence: 0.8,
    assumptions: "Assumed a skin-on salmon fillet and baby potatoes.",
    total_minutes: 30,
    ingredients: [
      ing("Salmon fillet", 130, "fish", "fish salmon atlantic farmed raw", 208, 20),
      ing("Baby potatoes", 200, "vegetable", "potatoes white flesh and skin raw", 69, 1.7),
      ing("Green beans", 90, "vegetable", "beans snap green raw", 31, 1.8),
      ing("Olive oil", 10, "butter_oil", "oil olive salad or cooking", 884, 0),
      ing("Lemon", 30, "fruit", "lemons raw without peel", 29, 1.1),
    ],
    steps: [
      "Halve the potatoes and pan-fry in half the oil for 15 minutes.",
      "Push aside, add the salmon skin-side down and cook 4 minutes.",
      "Flip the salmon and add the green beans for 3 minutes.",
      "Finish with lemon juice and serve.",
    ],
  },
  {
    title: "Chicken rice bowl with broccoli",
    confidence: 0.8,
    assumptions: "Assumed skinless chicken breast and plain white rice.",
    total_minutes: 25,
    ingredients: [
      ing("Chicken breast", 150, "chicken", "chicken broilers or fryers breast meat only raw", 120, 22.5),
      ing("White rice", 75, "rice_grain", "rice white long-grain regular raw enriched", 365, 7.1),
      ing("Broccoli", 120, "vegetable", "broccoli raw", 34, 2.8),
      ing("Olive oil", 10, "butter_oil", "oil olive salad or cooking", 884, 0),
    ],
    steps: [
      "Cook the rice in salted water.",
      "Slice the chicken and sear in the oil for 6 minutes.",
      "Steam the broccoli for 4 minutes.",
      "Pile into a bowl and season to taste.",
    ],
  },
  {
    title: "Chickpea and spinach rice bowl",
    confidence: 0.75,
    assumptions: "Assumed canned chickpeas, drained.",
    total_minutes: 20,
    ingredients: [
      ing("Chickpeas", 160, "legume", "chickpeas mature seeds canned drained", 139, 7),
      ing("White rice", 70, "rice_grain", "rice white long-grain regular raw enriched", 365, 7.1),
      ing("Spinach", 80, "vegetable", "spinach raw", 23, 2.9),
      ing("Tomatoes", 100, "vegetable", "tomatoes red ripe raw", 18, 0.9),
      ing("Olive oil", 10, "butter_oil", "oil olive salad or cooking", 884, 0),
    ],
    steps: [
      "Cook the rice in salted water.",
      "Warm the chickpeas and chopped tomatoes in the oil for 5 minutes.",
      "Stir in the spinach until it wilts.",
      "Spoon over the rice and serve.",
    ],
  },
];

export function demoTwist(avoid: string[], d: Diets): SmartTwist {
  const fits = TWISTS.filter((t) => ok(t.ingredients, d));
  const pool = fits.length ? fits : TWISTS.slice(-1);
  return structuredClone(pool.find((t) => !avoid.includes(t.title)) ?? pool[0]);
}

type Swap = SuggestSwaps["swaps"][number];
const sw = (name: string, category: PriceCategory, usda: string, kcal: number, protein: number): Swap => ({
  name,
  category,
  usda_query: usda,
  kcal_per_100g_estimate: kcal,
  protein_per_100g_estimate: protein,
});

const SWAPS: Partial<Record<PriceCategory, Swap[]>> = {
  cheese: [
    sw("Parmesan", "cheese", "cheese parmesan hard", 392, 36),
    sw("Part-skim mozzarella", "cheese", "cheese mozzarella part skim milk", 254, 24),
    sw("Nutritional yeast", "other", "nutritional yeast flakes", 325, 50),
  ],
  butter_oil: [
    sw("Olive oil", "butter_oil", "oil olive salad or cooking", 884, 0),
    sw("Greek yogurt", "dairy_milk", "yogurt greek plain nonfat", 59, 10),
    sw("Avocado", "fruit", "avocados raw all commercial varieties", 160, 2),
  ],
  pasta: [
    sw("Whole wheat spaghetti", "pasta", "spaghetti whole-wheat dry", 348, 15),
    sw("Rice noodles", "rice_grain", "rice noodles dry", 364, 6),
    sw("Zucchini noodles", "vegetable", "squash summer zucchini raw", 17, 1.2),
  ],
  beef: [
    sw("Lean ground turkey", "chicken", "turkey ground 93% lean raw", 150, 19),
    sw("Lean ground beef 93/7", "beef", "beef ground 93% lean meat 7% fat raw", 152, 21),
    sw("Lentils", "legume", "lentils raw", 352, 25),
  ],
  chicken: [
    sw("Chicken thighs", "chicken", "chicken broilers or fryers thigh meat only raw", 121, 19.7),
    sw("Firm tofu", "legume", "tofu raw firm prepared with calcium sulfate", 144, 17),
    sw("Shrimp", "seafood", "crustaceans shrimp raw", 85, 20),
  ],
  rice_grain: [
    sw("Brown rice", "rice_grain", "rice brown long-grain raw", 367, 7.5),
    sw("Quinoa", "rice_grain", "quinoa uncooked", 368, 14),
    sw("Cauliflower rice", "vegetable", "cauliflower raw", 25, 1.9),
  ],
};
const GENERIC_SWAPS: Swap[] = [
  sw("Spinach", "vegetable", "spinach raw", 23, 2.9),
  sw("Bell pepper", "vegetable", "peppers sweet red raw", 31, 1),
  sw("Chickpeas", "legume", "chickpeas mature seeds canned drained", 139, 7),
  sw("Mushrooms", "vegetable", "mushrooms white raw", 22, 3.1),
];

export function demoSwaps(current: { name: string; category: string }, d: Diets): Swap[] {
  const cands = [...(SWAPS[current.category as PriceCategory] ?? []), ...GENERIC_SWAPS];
  const seen = new Set([current.name.toLowerCase()]);
  const out: Swap[] = [];
  for (const c of cands) {
    if (out.length === 3) break;
    if (seen.has(c.name.toLowerCase()) || !ok([c], d)) continue;
    seen.add(c.name.toLowerCase());
    out.push(c);
  }
  return out;
}
