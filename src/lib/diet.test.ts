import { describe, expect, it } from "vitest";
import { dietConflict, dietProblems } from "./diet";

const c = (name: string, diets: string[], allergies: string[] = [], category?: string) =>
  dietConflict({ name, category }, diets, allergies)?.rule ?? null;

describe("nut-free", () => {
  it.each(["Almonds", "Toasted cashews", "Peanut butter", "Pine nuts", "Walnut halves", "Satay sauce", "Mixed nuts"])(
    "flags %s",
    (n) => expect(c(n, ["nut-free"])).toBe("nut-free"),
  );
  it.each(["Nutmeg", "Butternut squash", "Coconut milk", "Water chestnuts", "Nutritional yeast", "Doughnut"])(
    "allows %s",
    (n) => expect(c(n, ["nut-free"])).toBeNull(),
  );
  it.each(["Basil pesto", "Pesto", "Romesco sauce", "Chicken korma paste"])("flags %s, usually made with nuts", (n) =>
    expect(c(n, ["nut-free"])).toBe("nut-free"),
  );
  it("allows pesto labelled nut-free", () => expect(c("Nut-free pesto", ["nut-free"])).toBeNull());
  it("flags pesto for a tree nut allergy", () => expect(c("Pesto", [], ["tree nuts"])).toBe("allergy: tree nuts"));
  it("flags the nuts price category even with an odd name", () => {
    expect(c("Crunchy topping", ["nut-free"], [], "nuts")).toBe("nut-free");
  });
});

describe("vegetarian", () => {
  it.each(["Chicken thighs", "Bacon", "Fish sauce", "Oyster sauce", "Anchovies", "Worcestershire sauce", "Shrimp"])("flags %s", (n) =>
    expect(c(n, ["vegetarian"])).toBe("vegetarian"),
  );
  it.each(["Tofu", "Eggs", "Mushrooms", "Vegetable stock"])("allows %s", (n) => expect(c(n, ["vegetarian"])).toBeNull());
  it("flags meat categories", () => expect(c("Mystery protein", ["vegetarian"], [], "pork")).toBe("vegetarian"));
});

describe("gluten-free", () => {
  it.each(["Spaghetti", "All-purpose flour", "Soy sauce", "Panko breadcrumbs", "Burger bun", "Udon noodles"])("flags %s", (n) =>
    expect(c(n, ["gluten-free"])).toBe("gluten-free"),
  );
  it.each(["Rice noodles", "Tamari", "Gluten-free pasta", "Corn tortillas", "Rice flour", "Potatoes"])("allows %s", (n) =>
    expect(c(n, ["gluten-free"])).toBeNull(),
  );
});

describe("dairy-free", () => {
  it.each(["Butter", "Parmesan", "Heavy cream", "Greek yogurt", "Whole milk", "Ghee"])("flags %s", (n) =>
    expect(c(n, ["dairy-free"])).toBe("dairy-free"),
  );
  it.each(["Oat milk", "Coconut milk", "Peanut butter", "Butter beans", "Olive oil", "Cocoa butter"])("allows %s", (n) =>
    expect(c(n, ["dairy-free"])).toBeNull(),
  );
});

describe("allergies", () => {
  it("expands common allergy groups", () => {
    expect(c("Garlic shrimp", [], ["shellfish"])).toBe("allergy: shellfish");
    expect(c("Tahini", [], ["Sesame"])).toBe("allergy: Sesame");
    expect(c("Mayonnaise", [], ["eggs"])).toBe("allergy: eggs");
    expect(c("Peanuts", [], ["peanuts"])).toBe("allergy: peanuts");
    expect(c("Edamame", [], ["soy"])).toBe("allergy: soy");
  });
  it("matches free-text allergies by word", () => {
    expect(c("Fresh strawberries", [], ["strawberries"])).toBe("allergy: strawberries");
    expect(c("Kiwi fruit", [], ["kiwi"])).toBe("allergy: kiwi");
    expect(c("Apple", [], ["kiwi"])).toBeNull();
  });
  it("does not treat nutmeg as a tree nut allergy", () => {
    expect(c("Nutmeg", [], ["tree nuts"])).toBeNull();
  });
});

describe("dietProblems", () => {
  it("lists one problem per conflict", () => {
    const p = dietProblems(
      [{ name: "Rice noodles" }, { name: "Peanuts" }, { name: "Eggs" }, { name: "Cashews", category: "nuts" }],
      ["nut-free"],
      [],
    );
    expect(p).toHaveLength(2);
    expect(p[0]).toContain("Peanuts");
  });
});
