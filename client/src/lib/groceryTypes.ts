export type GroceryMealSlot = 'breakfast' | 'lunch' | 'dinner';

export type GroceryCategory = 'protein' | 'produce' | 'dairy' | 'grains';

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
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

export interface GroceryPlannedMeal {
  slot: GroceryMealSlot;
  name: string;
  scheduledTime: string;
}

export interface GroceryPlanDay {
  date: string;
  meals: GroceryPlannedMeal[];
}

export interface PantryExcludedItem {
  key: string;
  name: string;
}

export interface GroceryPlanRecord {
  id: number;
  budget: number;
  householdSize: number;
  location: string;
  weekStart: string;
  mealPlan: MealPlanDay[];
  groceryList: GroceryListCategory[];
  totalCost: number;
  avgDailyMacros: MacroTotals;
  targets: MacroTotals;
  alreadyHave: PantryExcludedItem[];
  createdAt: string;
  days: GroceryPlanDay[];
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

export interface GroceryMealDetailResponse {
  mealId: string;
  name: string;
  thumbnailUrl: string | null;
  ingredients: { displayName: string; quantity: string }[];
  instructions: string[];
}

export interface UpcomingMealDetail {
  mealId: string;
  slot: GroceryMealSlot;
  date: string;
  name: string;
  macros: MacroTotals;
  ingredients: { displayName: string; quantity: string }[];
}

export type UpcomingIconKind = GroceryMealSlot | 'workout';

export interface UpcomingItem {
  id: string;
  kind: 'meal' | 'workout';
  iconKind: UpcomingIconKind;
  name: string;
  timeLabel: string;
  sortTime: string;
  mealDetail?: UpcomingMealDetail;
}
