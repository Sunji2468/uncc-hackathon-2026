import type { Diet } from "@/types";

/**
 * A server-side safety net behind the prompts: flags ingredients that conflict
 * with a diet or allergy. Deliberately keyword-based and conservative.
 */

const TREE_NUTS = [
  "almond", "cashew", "walnut", "pecan", "pistachio", "hazelnut", "filbert", "macadamia",
  "brazil nut", "pine nut", "pignoli", "praline", "marzipan", "gianduja", "nutella", "nut butter",
  "mixed nuts", "nuts",
];
const PEANUTS = ["peanut", "groundnut", "satay"];
// Prepared foods that are usually made with nuts, unless labelled nut-free.
const HIDDEN_NUTS = ["pesto", "romesco", "frangipane", "baklava", "dukkah", "nougat", "gianduja", "muhammara", "korma"];
const NUT_FREE_LABEL = /\b(nut[- ]free|without nuts)\b/;
// Words containing "nut" that are not nuts.
const NUT_FALSE_FRIENDS = /\b(nutmeg|butternut|coconut|water chestnut|doughnut|donut|nutritional yeast|chestnut mushroom)\b/g;

const MEAT_FISH = [
  "beef", "steak", "veal", "pork", "bacon", "ham", "prosciutto", "pancetta", "guanciale", "lard",
  "chorizo", "sausage", "pepperoni", "salami", "hot dog", "chicken", "turkey", "duck", "lamb", "mutton",
  "goat meat", "venison", "gelatin", "fish", "salmon", "tuna", "cod", "tilapia", "anchovy", "anchovies",
  "sardine", "mackerel", "trout", "halibut", "shrimp", "prawn", "crab", "lobster", "clam", "mussel",
  "oyster", "scallop", "squid", "calamari", "octopus", "worcestershire", "bonito", "dashi",
];
const MEAT_CATEGORIES = new Set(["beef", "pork", "chicken", "fish", "seafood"]);

const GLUTEN = [
  "wheat", "flour", "bread", "breadcrumb", "panko", "pasta", "spaghetti", "linguine", "fettuccine",
  "penne", "rigatoni", "macaroni", "lasagna", "orzo", "couscous", "bulgur", "farro", "barley", "rye",
  "spelt", "semolina", "seitan", "noodle", "udon", "ramen", "soy sauce", "beer", "malt", "tortilla",
  "pita", "naan", "bun", "roll", "bagel", "croissant", "cracker", "crouton",
];
const GLUTEN_SAFE = /\b(gluten[- ]free|rice noodle|rice vermicelli|rice paper|rice flour|corn tortilla|corn flour|cornflour|almond flour|coconut flour|chickpea flour|tapioca flour|buckwheat|tamari|glass noodle|cellophane noodle|soba \(100% buckwheat\))(?:e?s)?\b/;

const DAIRY = [
  "milk", "cheese", "butter", "cream", "yogurt", "yoghurt", "ghee", "whey", "casein", "parmesan",
  "pecorino", "mozzarella", "ricotta", "feta", "cheddar", "mascarpone", "paneer", "kefir", "custard",
  "creme fraiche", "crème fraîche",
];
const DAIRY_SAFE =
  /\b(oat milk|almond milk|soy milk|soya milk|rice milk|coconut milk|coconut cream|cashew milk|dairy[- ]free|vegan|plant[- ]based|peanut butter|nut butter|almond butter|cashew butter|cocoa butter|shea butter|butternut|butter beans?|butter lettuce|cream of tartar)(?:e?s)?\b/;

const ALLERGY_ALIASES: Record<string, string[]> = {
  peanut: PEANUTS,
  "tree nut": [...TREE_NUTS, ...HIDDEN_NUTS],
  nut: [...TREE_NUTS, ...PEANUTS, ...HIDDEN_NUTS],
  shellfish: ["shrimp", "prawn", "crab", "lobster", "clam", "mussel", "oyster", "scallop", "crawfish", "crayfish", "langoustine"],
  fish: ["fish", "salmon", "tuna", "cod", "tilapia", "anchovy", "anchovies", "sardine", "mackerel", "trout", "halibut", "bonito", "worcestershire"],
  egg: ["egg", "mayonnaise", "mayo", "aioli", "meringue"],
  milk: DAIRY,
  dairy: DAIRY,
  lactose: DAIRY,
  soy: ["soy", "soya", "tofu", "edamame", "tempeh", "miso", "tamari"],
  sesame: ["sesame", "tahini", "benne"],
  wheat: GLUTEN,
  gluten: GLUTEN,
};

function norm(s: string): string {
  return ` ${s.toLowerCase().replace(/[^a-zà-ÿ0-9\s-]/g, " ").replace(/\s+/g, " ").trim()} `;
}

function hasWord(text: string, word: string): boolean {
  // word boundary match, tolerant of simple plurals ("almonds", "anchovies")
  const w = word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const forms = w.endsWith("y") ? `(?:${w}|${w.slice(0, -1)}ies)` : `${w}(?:s|es)?`;
  return new RegExp(`(^|[^a-z])${forms}([^a-z]|$)`).test(text);
}

function singular(term: string): string {
  const t = term.trim().toLowerCase();
  if (t.endsWith("ies")) return `${t.slice(0, -3)}y`;
  if (t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
  return t;
}

export interface Conflict {
  rule: string;
  reason: string;
}

export function dietConflict(
  ingredient: { name: string; category?: string },
  diets: readonly Diet[] | readonly string[],
  allergies: readonly string[],
): Conflict | null {
  const text = norm(ingredient.name);
  const category = ingredient.category ?? "";
  const nutText = text.replace(NUT_FALSE_FRIENDS, " ");

  for (const diet of diets) {
    if (
      diet === "nut-free" &&
      (category === "nuts" ||
        [...TREE_NUTS, ...PEANUTS].some((w) => hasWord(nutText, w)) ||
        (!NUT_FREE_LABEL.test(text) && HIDDEN_NUTS.some((w) => hasWord(text, w))))
    ) {
      return { rule: "nut-free", reason: `${ingredient.name} contains nuts` };
    }
    if (diet === "vegetarian" && (MEAT_CATEGORIES.has(category) || MEAT_FISH.some((w) => hasWord(text, w)) || /\b(fish|oyster) sauce\b/.test(text))) {
      return { rule: "vegetarian", reason: `${ingredient.name} is not vegetarian` };
    }
    if (diet === "gluten-free" && !GLUTEN_SAFE.test(text) && (category === "pasta" || category === "bread" || GLUTEN.some((w) => hasWord(text, w)))) {
      return { rule: "gluten-free", reason: `${ingredient.name} contains gluten` };
    }
    if (diet === "dairy-free" && !DAIRY_SAFE.test(text) && (category === "cheese" || category === "dairy_milk" || DAIRY.some((w) => hasWord(text, w)))) {
      return { rule: "dairy-free", reason: `${ingredient.name} contains dairy` };
    }
  }

  for (const raw of allergies) {
    const term = singular(raw);
    if (!term) continue;
    const words = ALLERGY_ALIASES[term] ?? ALLERGY_ALIASES[term.replace(/s$/, "")] ?? [term];
    const target = term.includes("nut") ? nutText : text;
    if (words.some((w) => hasWord(target, w)) || hasWord(target, term)) {
      return { rule: `allergy: ${raw}`, reason: `${ingredient.name} conflicts with the ${raw} allergy` };
    }
  }
  return null;
}

/** Problems for the AI retry message, one per conflicting ingredient. */
export function dietProblems(
  ingredients: { name: string; category?: string }[],
  diets: readonly string[],
  allergies: readonly string[],
): string[] {
  return ingredients.flatMap((i) => {
    const c = dietConflict(i, diets, allergies);
    return c ? [`${c.reason} (user is ${c.rule}); remove or substitute it`] : [];
  });
}
