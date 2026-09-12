// Mirrors server/src/domain/food.ts + service response shapes.

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snacks';
export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snacks'];
export const MEAL_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};

export type FoodSource = 'off' | 'custom' | 'recipe';

export interface NutritionPer100g {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugars: number | null;
  addedSugars: number | null;
  satFat: number | null;
  sodium: number | null;
}

export interface ServingOption {
  label: string;
  grams: number;
}

export interface FoodItem {
  source: FoodSource;
  name: string;
  brand: string | null;
  barcode: string | null;
  per100: NutritionPer100g;
  novaGroup: number | null;
  micronutrientCount: number;
  servingOptions: ServingOption[];
  defaultServingG: number;
}

export type FuelRating = 'excellent' | 'good' | 'fair' | 'poor';

export interface FuelScoreComponent {
  key: string;
  label: string;
  score: number | null;
  detail: string;
}

export interface FuelScore {
  score: number;
  rating: FuelRating;
  components: FuelScoreComponent[];
}

export type ScoredFood = FoodItem & { fuelScore: FuelScore };

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface LogEntry {
  id: number;
  date: string;
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
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: string;
}

export interface MealGroup {
  meal: MealSlot;
  entries: LogEntry[];
  subtotal: MacroTotals;
}

export interface DaySummary {
  date: string;
  meals: MealGroup[];
  totals: MacroTotals;
  target: MacroTotals | null;
  remaining: MacroTotals | null;
  goal: string | null;
  caloriesBurned: number;
  netCalories: number;
  water: { totalOz: number; goalOz: number; entries: { id: number; oz: number }[] };
}

/** Lightweight day totals from GET /api/log/summary */
export type TrackerMealSlot = 'breakfast' | 'lunch' | 'dinner';

export interface TrackerMealSummary {
  meal: TrackerMealSlot;
  logged: boolean;
  calories: number;
}

export interface LogSummary {
  date: string;
  totals: MacroTotals;
  target: MacroTotals | null;
  remaining: MacroTotals | null;
  caloriesBurned: number;
  netCalories: number;
  water: DaySummary['water'];
  meals: TrackerMealSummary[];
}

export interface Suggestion {
  food: FoodItem;
  suggestedServingG: number;
  reason: string;
  fuelScore: FuelScore;
  estimated: MacroTotals;
}

export interface SuggestionResponse {
  source: 'claude' | 'local';
  suggestions: Suggestion[];
}

export interface TemplateItem {
  food: FoodItem;
  quantityG: number;
  meal?: MealSlot;
}

export interface MealTemplate {
  id: number;
  name: string;
  items: TemplateItem[];
  totals: MacroTotals;
  createdAt: string;
}

export interface RecipeIngredient {
  food: FoodItem;
  quantityG: number;
}

export interface Recipe {
  id: number;
  name: string;
  servings: number;
  ingredients: RecipeIngredient[];
  perServing: MacroTotals;
  createdAt: string;
}

export const RATING_STYLES: Record<
  FuelRating,
  { label: string; badge: string; text: string; ring: string; dot: string }
> = {
  excellent: {
    label: 'Excellent',
    badge: 'bg-emerald-100 text-emerald-800',
    text: 'text-emerald-700',
    ring: 'ring-emerald-200',
    dot: 'bg-emerald-500',
  },
  good: {
    label: 'Good',
    badge: 'bg-yellow-100 text-yellow-800',
    text: 'text-yellow-700',
    ring: 'ring-yellow-200',
    dot: 'bg-yellow-400',
  },
  fair: {
    label: 'Fair',
    badge: 'bg-orange-100 text-orange-800',
    text: 'text-orange-700',
    ring: 'ring-orange-200',
    dot: 'bg-orange-400',
  },
  poor: {
    label: 'Poor',
    badge: 'bg-red-100 text-red-700',
    text: 'text-red-700',
    ring: 'ring-red-200',
    dot: 'bg-red-500',
  },
};

/** Rebuild a loggable FoodItem from a stored log entry (for re-logging / templates). */
export function entryToFood(entry: LogEntry): FoodItem {
  return {
    source: entry.source,
    name: entry.name,
    brand: entry.brand,
    barcode: entry.barcode,
    per100: entry.per100,
    novaGroup: entry.novaGroup,
    micronutrientCount: entry.micronutrientCount,
    servingOptions: [
      { label: entry.servingLabel, grams: entry.quantityG },
      { label: '100 g', grams: 100 },
    ],
    defaultServingG: entry.quantityG || 100,
  };
}

/** Scale per-100g nutrition to a quantity in grams. */
export function totalsForQuantity(per100: NutritionPer100g, grams: number): MacroTotals {
  const f = grams / 100;
  return {
    calories: Math.round(per100.calories * f),
    protein: Math.round(per100.protein * f * 10) / 10,
    carbs: Math.round(per100.carbs * f * 10) / 10,
    fat: Math.round(per100.fat * f * 10) / 10,
  };
}
