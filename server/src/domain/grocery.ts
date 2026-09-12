/** Grocery plan domain types. */

export type GroceryMealSlot = 'breakfast' | 'lunch' | 'dinner';

export type GroceryCategory = 'protein' | 'produce' | 'dairy' | 'grains';

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealIngredient {
  key: string;
  displayName: string;
  /** Amount consumed for one full batch (servingsProduced). */
  batchAmount: number;
  unit: string;
  /** Human-readable amount for one serving (e.g. "6 oz", "½ cup dry"). */
  servingQuantity: string;
}

export interface GroceryMealTemplate {
  id: string;
  name: string;
  slot: GroceryMealSlot;
  /** Meal slots this recipe may be scheduled in (defaults to [slot]). */
  eligibleSlots: GroceryMealSlot[];
  ingredients: MealIngredient[];
  costPerServing: number;
  macrosPerServing: MacroTotals;
  servingsProduced: number;
  proteinScore: number;
  instructions: string[];
  thumbnailUrl?: string;
}

export interface ScheduledMeal {
  mealId: string;
  name: string;
  slot: GroceryMealSlot;
  costPerServing: number;
  macros: MacroTotals;
  isLeftover: boolean;
  thumbnailUrl?: string;
}

export interface MealPlanDay {
  date: string;
  day: string;
  meals: Record<GroceryMealSlot, ScheduledMeal>;
}

export interface GroceryListItem {
  key: string;
  name: string;
  quantity: string;
  estimatedPrice: number;
  category: GroceryCategory;
}

export interface GroceryListCategory {
  category: GroceryCategory;
  label: string;
  icon: string;
  items: GroceryListItem[];
}

export interface PantryExcludedItem {
  key: string;
  name: string;
}

export interface GroceryPlanPayload {
  weekStart: string;
  mealPlan: MealPlanDay[];
  groceryList: GroceryListCategory[];
  totalCost: number;
  avgDailyMacros: MacroTotals;
  targets: MacroTotals;
  alreadyHave: PantryExcludedItem[];
}

export interface GroceryPlanRecord extends GroceryPlanPayload {
  id: number;
  budget: number;
  householdSize: number;
  location: string;
  createdAt: string;
  days: {
    date: string;
    meals: { slot: GroceryMealSlot; name: string; scheduledTime: string }[];
  }[];
}

export interface GenerateGroceryInput {
  budget: number;
  householdSize: number;
  location: string;
}

export interface MealSwapAlternative {
  mealId: string;
  name: string;
  costPerServing: number;
  macros: MacroTotals;
  description: string;
}

export interface IngredientCatalogEntry {
  displayName: string;
  category: GroceryCategory;
  price: number;
  unit: string;
}
