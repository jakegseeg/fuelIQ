/**
 * Food domain types shared across search, scoring, logging and suggestions.
 *
 * Nutrition is normalized to "per 100 g" so any serving size can be derived,
 * matching how Open Food Facts exposes its data.
 */

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snacks';
export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

export type FoodSource = 'off' | 'custom' | 'recipe';

/** Macronutrients + scoring inputs, all expressed per 100 g of the food. */
export interface NutritionPer100g {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugars: number | null;
  addedSugars: number | null;
  satFat: number | null;
  sodium: number | null; // mg
}

export interface ServingOption {
  label: string; // e.g. "1 serving (30 g)", "100 g"
  grams: number;
}

/** A food the user can log — from OFF search, a custom entry, or a recipe. */
export interface FoodItem {
  source: FoodSource;
  name: string;
  brand: string | null;
  barcode: string | null;
  per100: NutritionPer100g;
  novaGroup: number | null; // 1-4 (Open Food Facts NOVA classification)
  /** Count of vitamins/minerals present at >= 10% DV per 100 g. */
  micronutrientCount: number;
  servingOptions: ServingOption[];
  /** Default grams to log (first serving option, or 100 g). */
  defaultServingG: number;
}

export type FuelRating = 'excellent' | 'good' | 'fair' | 'poor';

export interface FuelScoreComponent {
  key: string;
  label: string;
  /** 0-10 sub-score, or null when the underlying data is unavailable. */
  score: number | null;
  detail: string;
}

export interface FuelScore {
  score: number; // 1-10 (rounded to 1 decimal)
  rating: FuelRating;
  components: FuelScoreComponent[];
}

/** A logged food entry (nutrition already scaled to the consumed quantity). */
export interface LogEntry {
  id: number;
  date: string; // YYYY-MM-DD
  meal: MealSlot;
  source: FoodSource;
  name: string;
  brand: string | null;
  barcode: string | null;
  servingLabel: string;
  quantityG: number;
  per100: NutritionPer100g;
  novaGroup: number | null;
  micronutrientCount: number;
  fuelScore: FuelScore;
  // Consumed totals (per100 scaled to quantityG)
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: string;
}

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Scale per-100g nutrition to a consumed quantity in grams. */
export function totalsForQuantity(per100: NutritionPer100g, grams: number): MacroTotals {
  const f = grams / 100;
  return {
    calories: round(per100.calories * f),
    protein: round(per100.protein * f, 1),
    carbs: round(per100.carbs * f, 1),
    fat: round(per100.fat * f, 1),
  };
}

export function round(n: number, decimals = 0): number {
  const p = 10 ** decimals;
  return Math.round(n * p) / p;
}
