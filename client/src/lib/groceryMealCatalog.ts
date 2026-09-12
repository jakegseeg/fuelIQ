import { api } from './api';
import type { DaySummary, FoodItem, MealSlot } from './foodTypes';
import type {
  GroceryMealSlot,
  GroceryPlanRecord,
  MacroTotals,
  ScheduledMeal,
  UpcomingMealDetail,
} from './groceryTypes';

export interface GroceryMealDetail {
  ingredients: { displayName: string; quantity: string }[];
  instructions: string[];
  thumbnailUrl?: string;
}

const detailCache = new Map<string, GroceryMealDetail>();

/** Meal details keyed by id (hardcoded fallback when API unavailable). */
const MEAL_DETAILS: Record<string, GroceryMealDetail> = {
  'scrambled-eggs-toast': {
    ingredients: [
      { displayName: 'Eggs', quantity: '2 eggs' },
      { displayName: 'Bread', quantity: '1 slice' },
      { displayName: 'Butter', quantity: '1 tsp' },
      { displayName: 'Salt', quantity: 'pinch' },
    ],
    instructions: [
      'Beat 2 eggs with a pinch of salt in a small bowl.',
      'Toast bread until golden on both sides.',
      'Melt butter in a nonstick pan over medium heat.',
      'Pour in eggs and stir gently until softly set, about 2 minutes.',
      'Butter the toast and serve with the scrambled eggs.',
    ],
  },
  'oatmeal-banana': {
    ingredients: [
      { displayName: 'Oats', quantity: '½ cup dry' },
      { displayName: 'Banana', quantity: '1 medium' },
      { displayName: 'Honey', quantity: '1 tbsp' },
      { displayName: 'Milk', quantity: '½ cup' },
    ],
    instructions: [
      'Bring milk and ½ cup water to a gentle simmer in a small pot.',
      'Stir in oats and cook over medium heat for 5 minutes, stirring often.',
      'Slice the banana while the oatmeal thickens.',
      'Remove from heat and stir in honey.',
      'Top with banana slices and serve warm.',
    ],
  },
  'greek-yogurt-parfait': {
    ingredients: [
      { displayName: 'Greek yogurt', quantity: '1 cup' },
      { displayName: 'Granola', quantity: '¼ cup' },
      { displayName: 'Berries', quantity: '½ cup' },
    ],
    instructions: [
      'Add half the Greek yogurt to a bowl or jar.',
      'Sprinkle half the granola and berries on top.',
      'Add the remaining yogurt in a second layer.',
      'Finish with the rest of the granola and berries.',
      'Serve immediately or chill up to 30 minutes.',
    ],
  },
  'egg-cheese-burrito': {
    ingredients: [
      { displayName: 'Eggs', quantity: '2 eggs' },
      { displayName: 'Tortilla', quantity: '1 large' },
      { displayName: 'Cheese', quantity: '¼ cup shredded' },
      { displayName: 'Salsa', quantity: '2 tbsp' },
    ],
    instructions: [
      'Scramble 2 eggs in a lightly oiled pan over medium heat.',
      'Warm the tortilla in a dry pan for 30 seconds per side.',
      'Place scrambled eggs in the center of the tortilla.',
      'Top with cheese and salsa.',
      'Fold the sides in and roll into a burrito.',
      'Optional: toast seam-side down for 1 minute to seal.',
    ],
  },
  'peanut-butter-toast': {
    ingredients: [
      { displayName: 'Bread', quantity: '2 slices' },
      { displayName: 'Peanut butter', quantity: '2 tbsp' },
      { displayName: 'Banana', quantity: '½ banana' },
    ],
    instructions: [
      'Toast bread until golden and crisp.',
      'Spread peanut butter evenly on both slices.',
      'Slice banana into thin rounds.',
      'Arrange banana on one slice and close the sandwich, or serve open-faced.',
      'Eat immediately while the toast is still warm.',
    ],
  },
  'chicken-rice-bowl': {
    ingredients: [
      { displayName: 'Chicken breast', quantity: '5 oz' },
      { displayName: 'Rice', quantity: '½ cup cooked' },
      { displayName: 'Olive oil', quantity: '1 tsp' },
      { displayName: 'Garlic', quantity: '2 cloves' },
      { displayName: 'Salt', quantity: 'pinch' },
    ],
    instructions: [
      'Cook rice according to package directions and keep warm.',
      'Season chicken with salt and mince the garlic.',
      'Heat olive oil in a skillet over medium-high heat.',
      'Cook chicken 6–7 minutes per side until done, then rest 3 minutes.',
      'Slice chicken and serve over rice with garlic sprinkled on top.',
    ],
  },
  'turkey-sandwich': {
    ingredients: [
      { displayName: 'Bread', quantity: '2 slices' },
      { displayName: 'Turkey deli meat', quantity: '4 oz' },
      { displayName: 'Cheese', quantity: '1 slice' },
      { displayName: 'Mayo', quantity: '1 tbsp' },
      { displayName: 'Lettuce', quantity: '2 leaves' },
    ],
    instructions: [
      'Lay out two slices of bread on a clean surface.',
      'Spread mayo evenly on both slices.',
      'Layer turkey and cheese on one slice.',
      'Add lettuce leaves and close the sandwich.',
      'Cut in half and serve.',
    ],
  },
  'tuna-wrap': {
    ingredients: [
      { displayName: 'Tuna', quantity: '1 can' },
      { displayName: 'Tortilla', quantity: '1 large' },
      { displayName: 'Mayo', quantity: '1 tbsp' },
      { displayName: 'Celery', quantity: '2 stalks diced' },
      { displayName: 'Lettuce', quantity: '1 leaf' },
    ],
    instructions: [
      'Drain tuna and flake into a bowl.',
      'Mix in mayo and diced celery until combined.',
      'Warm the tortilla briefly in a dry pan.',
      'Spread tuna salad down the center and top with lettuce.',
      'Fold sides in and roll tightly into a wrap.',
      'Slice in half and serve.',
    ],
  },
  'black-bean-quesadilla': {
    ingredients: [
      { displayName: 'Tortilla', quantity: '2 large' },
      { displayName: 'Black beans', quantity: '½ can' },
      { displayName: 'Cheese', quantity: '⅓ cup shredded' },
      { displayName: 'Salsa', quantity: '2 tbsp' },
    ],
    instructions: [
      'Drain and rinse black beans, then mash lightly with a fork.',
      'Place one tortilla in a dry skillet over medium heat.',
      'Spread beans and cheese on the tortilla, then top with the second.',
      'Cook 2–3 minutes per side until golden and cheese melts.',
      'Cut into wedges and serve with salsa on the side.',
    ],
  },
  'lentil-soup': {
    ingredients: [
      { displayName: 'Lentils', quantity: '⅓ cup dry' },
      { displayName: 'Carrots', quantity: '1 medium diced' },
      { displayName: 'Celery', quantity: '1 stalk diced' },
      { displayName: 'Onion', quantity: '¼ onion diced' },
      { displayName: 'Garlic', quantity: '2 cloves' },
      { displayName: 'Broth', quantity: '1½ cups' },
    ],
    instructions: [
      'Dice carrot, celery, onion, and mince garlic.',
      'Sauté vegetables in a pot with a little oil for 5 minutes.',
      'Add lentils and broth, then bring to a boil.',
      'Reduce heat and simmer 25–30 minutes until lentils are tender.',
      'Season with salt and pepper to taste before serving.',
    ],
  },
  'spaghetti-meat-sauce': {
    ingredients: [
      { displayName: 'Pasta', quantity: '2 oz dry' },
      { displayName: 'Ground beef', quantity: '4 oz' },
      { displayName: 'Tomato sauce', quantity: '½ cup' },
      { displayName: 'Garlic', quantity: '2 cloves' },
      { displayName: 'Onion', quantity: '¼ onion diced' },
    ],
    instructions: [
      'Boil pasta in salted water according to package directions.',
      'Dice onion and mince garlic while the pasta cooks.',
      'Brown ground beef with onion and garlic in a large pan.',
      'Drain excess fat and stir in tomato sauce.',
      'Simmer sauce 10 minutes, then toss with drained pasta.',
      'Serve hot with optional grated cheese.',
    ],
  },
  'baked-chicken-thighs': {
    ingredients: [
      { displayName: 'Chicken thighs', quantity: '1 thigh' },
      { displayName: 'Broccoli', quantity: '1 cup florets' },
      { displayName: 'Olive oil', quantity: '1 tbsp' },
      { displayName: 'Garlic', quantity: '2 cloves' },
      { displayName: 'Salt', quantity: 'pinch' },
    ],
    instructions: [
      'Preheat oven to 425°F and line a sheet pan.',
      'Toss broccoli with half the olive oil, minced garlic, and salt.',
      'Season chicken thighs with salt and remaining oil.',
      'Arrange chicken and broccoli on the pan without overcrowding.',
      'Roast 25–30 minutes until chicken reaches 165°F internally.',
      'Rest chicken 5 minutes before serving.',
    ],
  },
  'beef-rice-stir-fry': {
    ingredients: [
      { displayName: 'Ground beef', quantity: '4 oz' },
      { displayName: 'Rice', quantity: '½ cup cooked' },
      { displayName: 'Soy sauce', quantity: '1 tbsp' },
      { displayName: 'Garlic', quantity: '2 cloves' },
      { displayName: 'Onion', quantity: '¼ onion sliced' },
    ],
    instructions: [
      'Cook rice and keep warm.',
      'Heat a large skillet or wok over high heat.',
      'Brown ground beef, breaking it up as it cooks.',
      'Add sliced onion and minced garlic; stir-fry 2 minutes.',
      'Stir in soy sauce and cooked rice until heated through.',
      'Serve immediately.',
    ],
  },
  'black-bean-tacos': {
    ingredients: [
      { displayName: 'Tortilla', quantity: '2 small' },
      { displayName: 'Black beans', quantity: '½ can' },
      { displayName: 'Cheese', quantity: '¼ cup shredded' },
      { displayName: 'Salsa', quantity: '2 tbsp' },
      { displayName: 'Lettuce', quantity: '½ cup shredded' },
    ],
    instructions: [
      'Drain and rinse black beans, then warm in a small pan.',
      'Heat tortillas in a dry skillet until pliable.',
      'Fill each tortilla with beans, cheese, and lettuce.',
      'Top with salsa and fold or roll to serve.',
      'Serve immediately while warm.',
    ],
  },
  'chicken-soup': {
    ingredients: [
      { displayName: 'Chicken breast', quantity: '4 oz' },
      { displayName: 'Broth', quantity: '1½ cups' },
      { displayName: 'Carrots', quantity: '1 medium sliced' },
      { displayName: 'Celery', quantity: '1 stalk sliced' },
      { displayName: 'Onion', quantity: '¼ onion diced' },
      { displayName: 'Garlic', quantity: '2 cloves' },
      { displayName: 'Noodles', quantity: '½ cup dry' },
    ],
    instructions: [
      'Dice carrot, celery, onion, and mince garlic.',
      'Simmer chicken in broth with vegetables for 15 minutes.',
      'Remove chicken, shred, and return to the pot.',
      'Add noodles and cook until tender, about 8 minutes.',
      'Season with salt and pepper and serve hot.',
    ],
  },
  'baked-salmon-rice': {
    ingredients: [
      { displayName: 'Salmon', quantity: '5 oz fillet' },
      { displayName: 'Rice', quantity: '½ cup cooked' },
      { displayName: 'Lemon', quantity: '2 wedges' },
      { displayName: 'Garlic', quantity: '2 cloves' },
      { displayName: 'Olive oil', quantity: '1 tsp' },
    ],
    instructions: [
      'Cook rice according to package directions.',
      'Preheat oven to 400°F and line a baking sheet.',
      'Place salmon on the sheet, drizzle with oil, and mince garlic on top.',
      'Bake 12–15 minutes until salmon flakes easily.',
      'Serve salmon over rice with lemon wedges squeezed on top.',
    ],
  },
  'ground-turkey-sweet-potato': {
    ingredients: [
      { displayName: 'Ground turkey', quantity: '5 oz' },
      { displayName: 'Sweet potato', quantity: '1 medium' },
      { displayName: 'Olive oil', quantity: '1 tsp' },
      { displayName: 'Garlic', quantity: '2 cloves' },
      { displayName: 'Onion', quantity: '¼ onion diced' },
    ],
    instructions: [
      'Pierce sweet potato and microwave or bake until tender, about 8–12 minutes.',
      'Heat oil in a skillet over medium-high heat.',
      'Cook ground turkey with diced onion and garlic until browned.',
      'Season with salt and pepper to taste.',
      'Split sweet potato and top with turkey mixture.',
      'Serve immediately.',
    ],
  },
};

export function getGroceryMealDetail(mealId: string): GroceryMealDetail | null {
  return detailCache.get(mealId) ?? MEAL_DETAILS[mealId] ?? null;
}

/** Fetch meal details from the server (TheMealDB + fallback pool) with client cache. */
export async function fetchGroceryMealDetail(mealId: string): Promise<GroceryMealDetail | null> {
  const cached = detailCache.get(mealId) ?? MEAL_DETAILS[mealId];
  if (cached) return cached;

  try {
    const meal = await api.getGroceryMealDetail(mealId);
    const detail: GroceryMealDetail = {
      ingredients: meal.ingredients,
      instructions: meal.instructions,
      thumbnailUrl: meal.thumbnailUrl ?? undefined,
    };
    detailCache.set(mealId, detail);
    return detail;
  } catch {
    return MEAL_DETAILS[mealId] ?? null;
  }
}

export function getMealIngredients(
  mealId: string,
): { displayName: string; quantity: string }[] {
  return getGroceryMealDetail(mealId)?.ingredients ?? MEAL_DETAILS[mealId]?.ingredients ?? [];
}

/** Scheduled grocery meal for a specific calendar day and slot, if any. */
export function getScheduledMealForDate(
  plan: GroceryPlanRecord | null,
  date: string,
  slot: GroceryMealSlot,
): ScheduledMeal | null {
  if (!plan?.mealPlan?.length) return null;
  const day = plan.mealPlan.find((d) => d.date === date);
  return day?.meals[slot] ?? null;
}

export function formatIngredientSummary(ingredients: { displayName: string }[]): string {
  if (ingredients.length === 0) return '';
  const names = ingredients.slice(0, 4).map((i) => i.displayName);
  return names.join(', ') + (ingredients.length > 4 ? '…' : '');
}

export interface SuggestedGroceryMeal {
  name: string;
  mealId: string;
  macros: MacroTotals;
  ingredientSummary: string;
  householdSize: number;
}

/** Build quick-select suggestion for the food log modal. */
export function buildSuggestedMeal(
  plan: GroceryPlanRecord | null,
  date: string,
  slot: GroceryMealSlot,
): SuggestedGroceryMeal | null {
  const scheduled = getScheduledMealForDate(plan, date, slot);
  if (!scheduled) return null;
  const detail = getGroceryMealDetail(scheduled.mealId);
  return {
    name: scheduled.name,
    mealId: scheduled.mealId,
    macros: scheduled.macros,
    ingredientSummary: formatIngredientSummary(detail?.ingredients ?? []),
    householdSize: plan?.householdSize ?? 1,
  };
}

/** Per-serving macros adjusted for household (each person logs one portion). */
export function macrosForLogging(macros: MacroTotals, _householdSize: number): MacroTotals {
  return macros;
}

function mealFood(name: string, macros: MacroTotals): FoodItem {
  return {
    source: 'custom',
    name,
    brand: null,
    barcode: null,
    per100: {
      calories: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      fiber: null,
      sugars: null,
      addedSugars: null,
      satFat: null,
      sodium: null,
    },
    novaGroup: 2,
    micronutrientCount: 0,
    servingOptions: [{ label: '1 serving', grams: 100 }],
    defaultServingG: 100,
  };
}

/** Log a planned meal as a single food-log entry with full macro values. */
export async function logMealNutrition(
  date: string,
  slot: GroceryMealSlot,
  name: string,
  macros: MacroTotals,
  householdSize = 1,
): Promise<DaySummary> {
  const adjusted = macrosForLogging(macros, householdSize);
  const { day } = await api.addEntry(
    date,
    slot as MealSlot,
    mealFood(name, adjusted),
    100,
    '1 serving',
  );
  return day;
}

/** Log a planned meal (used by Upcoming strip and grocery page). */
export async function logPlannedMeal(detail: UpcomingMealDetail): Promise<DaySummary> {
  return logMealNutrition(detail.date, detail.slot, detail.name, detail.macros);
}
