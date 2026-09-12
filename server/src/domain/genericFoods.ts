import type { FoodItem, NutritionPer100g } from './food.js';

type GenericDef = { name: string; per100: NutritionPer100g; defaultServingG?: number; novaGroup?: number };

const DEFS: GenericDef[] = [
  { name: 'White bread', per100: { calories: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7, sugars: 5, addedSugars: null, satFat: 0.8, sodium: 490 }, novaGroup: 4 },
  { name: 'Chicken breast, cooked', per100: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugars: 0, addedSugars: null, satFat: 1, sodium: 74 }, novaGroup: 1 },
  { name: 'White rice, cooked', per100: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugars: 0.1, addedSugars: null, satFat: 0.1, sodium: 1 }, novaGroup: 1 },
  { name: 'Brown rice, cooked', per100: { calories: 123, protein: 2.7, carbs: 26, fat: 1, fiber: 1.6, sugars: 0.4, addedSugars: null, satFat: 0.2, sodium: 4 }, novaGroup: 1 },
  { name: 'Egg, whole', per100: { calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, sugars: 1.1, addedSugars: null, satFat: 3.3, sodium: 124 }, defaultServingG: 50, novaGroup: 1 },
  { name: 'Banana', per100: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, sugars: 12, addedSugars: null, satFat: 0.1, sodium: 1 }, defaultServingG: 118, novaGroup: 1 },
  { name: 'Apple', per100: { calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, sugars: 10, addedSugars: null, satFat: 0, sodium: 1 }, defaultServingG: 182, novaGroup: 1 },
  { name: 'Greek yogurt, plain', per100: { calories: 59, protein: 10, carbs: 3.6, fat: 0.4, fiber: 0, sugars: 3.2, addedSugars: null, satFat: 0.1, sodium: 36 }, novaGroup: 1 },
  { name: 'Oats, dry', per100: { calories: 389, protein: 17, carbs: 66, fat: 7, fiber: 10, sugars: 1, addedSugars: null, satFat: 1.2, sodium: 2 }, defaultServingG: 40, novaGroup: 1 },
  { name: 'Broccoli, cooked', per100: { calories: 35, protein: 2.4, carbs: 7, fat: 0.4, fiber: 3.3, sugars: 1.4, addedSugars: null, satFat: 0.1, sodium: 41 }, novaGroup: 1 },
  { name: 'Salmon, cooked', per100: { calories: 206, protein: 22, carbs: 0, fat: 12, fiber: 0, sugars: 0, addedSugars: null, satFat: 2.3, sodium: 59 }, novaGroup: 1 },
  { name: 'Almonds', per100: { calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12, sugars: 4.4, addedSugars: null, satFat: 3.8, sodium: 1 }, defaultServingG: 28, novaGroup: 1 },
  { name: 'Milk, 2%', per100: { calories: 50, protein: 3.4, carbs: 5, fat: 2, fiber: 0, sugars: 5, addedSugars: null, satFat: 1.3, sodium: 44 }, defaultServingG: 244, novaGroup: 1 },
  { name: 'Peanut butter', per100: { calories: 588, protein: 25, carbs: 20, fat: 50, fiber: 6, sugars: 9, addedSugars: null, satFat: 10, sodium: 17 }, defaultServingG: 32, novaGroup: 3 },
  { name: 'Ground beef, 90% lean', per100: { calories: 250, protein: 26, carbs: 0, fat: 15, fiber: 0, sugars: 0, addedSugars: null, satFat: 6, sodium: 72 }, novaGroup: 1 },
  { name: 'Pasta, cooked', per100: { calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8, sugars: 0.6, addedSugars: null, satFat: 0.2, sodium: 1 }, novaGroup: 3 },
  { name: 'Cheddar cheese', per100: { calories: 403, protein: 25, carbs: 1.3, fat: 33, fiber: 0, sugars: 0.5, addedSugars: null, satFat: 21, sodium: 621 }, novaGroup: 3 },
  { name: 'Sweet potato, baked', per100: { calories: 86, protein: 1.6, carbs: 20, fat: 0.1, fiber: 2.8, sugars: 4.2, addedSugars: null, satFat: 0, sodium: 55 }, novaGroup: 1 },
  { name: 'Avocado', per100: { calories: 160, protein: 2, carbs: 9, fat: 15, fiber: 7, sugars: 0.7, addedSugars: null, satFat: 2.1, sodium: 7 }, defaultServingG: 150, novaGroup: 1 },
  { name: 'Tuna, canned in water', per100: { calories: 116, protein: 26, carbs: 0, fat: 1, fiber: 0, sugars: 0, addedSugars: null, satFat: 0.2, sodium: 247 }, novaGroup: 2 },
  { name: 'Spinach, raw', per100: { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, sugars: 0.4, addedSugars: null, satFat: 0.1, sodium: 79 }, novaGroup: 1 },
  { name: 'Potato, baked', per100: { calories: 93, protein: 2.5, carbs: 21, fat: 0.1, fiber: 2.2, sugars: 1.2, addedSugars: null, satFat: 0, sodium: 10 }, novaGroup: 1 },
  { name: 'Whole wheat bread', per100: { calories: 247, protein: 13, carbs: 41, fat: 3.4, fiber: 7, sugars: 5, addedSugars: null, satFat: 0.6, sodium: 400 }, novaGroup: 4 },
];

function defToFood(def: GenericDef, slug: string): FoodItem {
  const servingG = def.defaultServingG ?? 100;
  return {
    source: 'custom',
    name: def.name,
    brand: null,
    barcode: `generic:${slug}`,
    per100: def.per100,
    novaGroup: def.novaGroup ?? 1,
    micronutrientCount: 0,
    servingOptions: [
      { label: servingG === 100 ? '100 g' : `1 serving (${servingG} g)`, grams: servingG },
      { label: '100 g', grams: 100 },
    ],
    defaultServingG: servingG,
  };
}

const GENERIC_FOODS: FoodItem[] = DEFS.map((d) =>
  defToFood(d, d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')),
);

/** Match staple whole foods for a search query (spec: generic section). */
export function matchGenericFoods(query: string): FoodItem[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const words = q.split(/\s+/).filter(Boolean);

  return GENERIC_FOODS.filter((food) => {
    const name = food.name.toLowerCase();
    if (name.includes(q)) return true;
    // All query words appear in the name (e.g. "chicken breast" → chicken breast, cooked)
    return words.length > 0 && words.every((w) => name.includes(w));
  });
}

export function isGenericBarcode(barcode: string | null | undefined): boolean {
  return !!barcode && barcode.startsWith('generic:');
}
