import type { GroceryMealSlot, GroceryMealTemplate, MacroTotals, MealIngredient } from './grocery.js';
import {
  estimateIngredientCost,
  INGREDIENT_CATALOG,
  normalizeIngredientKey,
} from './groceryCatalog.js';

export interface MealDbDetail {
  idMeal: string;
  strMeal: string;
  strCategory: string | null;
  strInstructions: string | null;
  strMealThumb: string | null;
  [key: string]: string | null | undefined;
}

const MEALDB_CATEGORIES = ['Breakfast', 'Chicken', 'Beef', 'Pasta', 'Vegetarian', 'Seafood'] as const;

export const MEALDB_CATEGORY_ENDPOINTS = MEALDB_CATEGORIES.map(
  (c) => `https://www.themealdb.com/api/json/v1/1/filter.php?c=${c}`,
);

export const MEALDB_LOOKUP_URL = (id: string) =>
  `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`;

const DEFAULT_SERVINGS = 4;

function parseFraction(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 1;
  if (trimmed.includes('/')) {
    const [a, b] = trimmed.split('/').map(Number);
    if (Number.isFinite(a) && Number.isFinite(b) && b !== 0) return a / b;
  }
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function parseMeasure(measure: string): { amount: number; unit: string } {
  const m = (measure || '').trim().toLowerCase();
  if (!m) return { amount: 1, unit: 'unit' };

  const compact = m.match(/^([\d./]+)\s*(g|kg|ml|l|oz|lb|lbs|cups?|tbsp|tsp|cans?|slices?|cloves?|pinch|handful|bunch|pack|large|medium|small)?$/);
  if (compact) {
    return {
      amount: parseFraction(compact[1]),
      unit: compact[2]?.trim() || 'unit',
    };
  }

  const spaced = m.match(/^([\d./]+)\s+(.+)$/);
  if (spaced) {
    return {
      amount: parseFraction(spaced[1]),
      unit: spaced[2].trim() || 'unit',
    };
  }

  return { amount: 1, unit: m };
}

function normalizedBatchAmount(key: string, amount: number, unit: string): number {
  const entry = INGREDIENT_CATALOG[key];
  const u = unit.toLowerCase();

  if (entry) {
    if ((u === 'g' || u.startsWith('g')) && entry.unit === 'lb') {
      return Math.min(Math.max(amount / 454, 0.1), 2);
    }
    if (u === 'kg' && entry.unit === 'lb') {
      return Math.min(amount * 2.204, 2);
    }
    if (u === 'oz' && entry.unit === 'lb') {
      return Math.min(amount / 16, 2);
    }
    return Math.min(Math.max(amount, 0.05), 2);
  }

  // Unknown ingredients: $1.50 per ingredient line in the recipe batch.
  return 1;
}

function extractIngredients(meal: MealDbDetail): { name: string; measure: string }[] {
  const items: { name: string; measure: string }[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`]?.trim();
    if (!name) continue;
    items.push({ name, measure: meal[`strMeasure${i}`]?.trim() ?? '' });
  }
  return items;
}

function estimateServings(ingredients: { name: string; measure: string }[]): number {
  let maxServings = DEFAULT_SERVINGS;
  for (const ing of ingredients) {
    const { amount, unit } = parseMeasure(ing.measure);
    const key = normalizeIngredientKey(ing.name);
    if (key === 'chicken breast' && unit.toLowerCase().includes('lb') && amount >= 1) {
      maxServings = Math.max(maxServings, Math.round(amount * 2));
    }
    if (key === 'ground beef' && unit.toLowerCase().includes('lb') && amount >= 1) {
      maxServings = Math.max(maxServings, Math.round(amount * 2));
    }
    if (key === 'pasta' && amount >= 8 && /oz|g|gram/i.test(unit)) {
      maxServings = Math.max(maxServings, 6);
    }
  }
  return Math.min(Math.max(maxServings, 2), 8);
}

function inferMacroProfile(
  category: string,
  ingredientNames: string[],
): { profile: keyof typeof MACRO_PROFILES; macros: MacroTotals } {
  const text = `${category} ${ingredientNames.join(' ')}`.toLowerCase();

  if (/breakfast/.test(category.toLowerCase()) || /\bbreakfast\b/.test(text)) {
    return { profile: 'breakfast', macros: macrosFromProfile('breakfast') };
  }
  if (/chicken|poultry/.test(text)) {
    return { profile: 'chicken', macros: macrosFromProfile('chicken') };
  }
  if (/beef|steak|mince/.test(text)) {
    return { profile: 'beef', macros: macrosFromProfile('beef') };
  }
  if (/seafood|fish|salmon|shrimp|prawn|tuna|cod/.test(text)) {
    return { profile: 'seafood', macros: macrosFromProfile('seafood') };
  }
  if (/vegetarian|pasta|veggie|lentil|bean/.test(text)) {
    return { profile: 'vegetarian', macros: macrosFromProfile('vegetarian') };
  }
  return { profile: 'default', macros: macrosFromProfile('default') };
}

const MACRO_PROFILES = {
  chicken: { protein: 35, carbs: 30, fat: 12 },
  beef: { protein: 30, carbs: 25, fat: 18 },
  seafood: { protein: 32, carbs: 20, fat: 8 },
  vegetarian: { protein: 15, carbs: 45, fat: 10 },
  breakfast: { protein: 18, carbs: 35, fat: 12 },
  default: { protein: 25, carbs: 30, fat: 12 },
} as const;

function macrosFromProfile(profile: keyof typeof MACRO_PROFILES): MacroTotals {
  const m = MACRO_PROFILES[profile];
  return {
    protein: m.protein,
    carbs: m.carbs,
    fat: m.fat,
    calories: Math.round(m.protein * 4 + m.carbs * 4 + m.fat * 9),
  };
}

function assignSlots(category: string, ingredientCount: number): {
  slot: GroceryMealSlot;
  eligibleSlots: GroceryMealSlot[];
} {
  if (category.toLowerCase() === 'breakfast') {
    return { slot: 'breakfast', eligibleSlots: ['breakfast'] };
  }
  if (ingredientCount > 8) {
    return { slot: 'dinner', eligibleSlots: ['dinner'] };
  }
  return { slot: 'lunch', eligibleSlots: ['lunch', 'dinner'] };
}

function toMealIngredients(items: { name: string; measure: string }[]): MealIngredient[] {
  return items.slice(0, 7).map((item) => {
    const key = normalizeIngredientKey(item.name);
    const { amount, unit } = parseMeasure(item.measure);
    const catalog = INGREDIENT_CATALOG[key];
    const batchAmount = normalizedBatchAmount(key, amount, unit);
    return {
      key,
      displayName: catalog?.displayName ?? item.name,
      batchAmount,
      unit: catalog?.unit ?? unit,
      servingQuantity: item.measure.trim() || 'as needed',
    };
  });
}

function estimateBatchCost(ingredients: MealIngredient[]): number {
  return ingredients.reduce((sum, ing) => sum + estimateIngredientCost(ing.key, ing.batchAmount), 0);
}

export function parseMealDbRecipe(meal: MealDbDetail): GroceryMealTemplate | null {
  const rawIngredients = extractIngredients(meal);
  if (rawIngredients.length === 0) return null;

  const ingredientCount = rawIngredients.length;
  const ingredients = toMealIngredients(rawIngredients);
  const servingsProduced = estimateServings(rawIngredients);
  const batchCost = estimateBatchCost(ingredients);
  const costPerServing = Math.round((batchCost / servingsProduced) * 100) / 100;

  const category = meal.strCategory ?? 'Miscellaneous';
  const { slot, eligibleSlots } = assignSlots(category, ingredientCount);
  const { macros } = inferMacroProfile(
    category,
    rawIngredients.map((i) => i.name),
  );

  const instructions = (meal.strInstructions ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    id: `themealdb-${meal.idMeal}`,
    name: meal.strMeal,
    slot,
    eligibleSlots,
    ingredients,
    costPerServing: Math.max(costPerServing, 0.5),
    macrosPerServing: macros,
    servingsProduced,
    proteinScore: macros.protein,
    instructions: instructions.length > 0 ? instructions : ['Follow the recipe instructions.'],
    thumbnailUrl: meal.strMealThumb ?? undefined,
  };
}
