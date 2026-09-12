import { addDaysISO, parseISO } from '../domain/dates.js';
import type {
  GenerateGroceryInput,
  GroceryListCategory,
  GroceryMealSlot,
  GroceryPlanPayload,
  MacroTotals,
  MealPlanDay,
  PantryExcludedItem,
  ScheduledMeal,
} from '../domain/grocery.js';
import {
  CATEGORY_META,
  estimateIngredientCost,
  INGREDIENT_CATALOG,
  MEAL_BUDGET_SWAPS,
  regionalPriceMultiplier,
} from '../domain/groceryCatalog.js';
import type { GroceryMealTemplate } from '../domain/grocery.js';
import { MEAL_BY_ID, mealsForSlot } from '../services/mealPool.js';
import type { Profile } from '../domain/types.js';
import { ingredientOwnedByPantry } from '../domain/pantryMatch.js';

const SLOTS: GroceryMealSlot[] = ['breakfast', 'lunch', 'dinner'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const MEAL_TIMES: Record<GroceryMealSlot, string> = {
  breakfast: '07:00',
  lunch: '12:30',
  dinner: '18:00',
};

const MAX_APPEARANCES_PER_SLOT = 2;
const MIN_UNIQUE_BY_SLOT: Record<GroceryMealSlot, number> = {
  breakfast: 2,
  lunch: 2,
  dinner: 3,
};
const VARIETY_BUDGET_OVERRUN = 1.05;

type SlotAppearanceCounts = Record<GroceryMealSlot, Map<string, number>>;

function emptyAppearanceCounts(): SlotAppearanceCounts {
  return { breakfast: new Map(), lunch: new Map(), dinner: new Map() };
}

/** Count new cooks per meal per slot (leftovers do not add appearances). */
function countAppearancesInPlan(plan: MealPlanDay[]): SlotAppearanceCounts {
  const counts = emptyAppearanceCounts();
  for (const day of plan) {
    for (const slot of SLOTS) {
      const meal = day.meals[slot];
      if (meal.isLeftover) continue;
      counts[slot].set(meal.mealId, (counts[slot].get(meal.mealId) ?? 0) + 1);
    }
  }
  return counts;
}

/** Meals cooked 2+ times across recent plans — deprioritize in selection. */
export function buildFatiguedMeals(recentPlans: MealPlanDay[][]): Set<string> {
  const totals = emptyAppearanceCounts();
  for (const plan of recentPlans) {
    const planCounts = countAppearancesInPlan(plan);
    for (const slot of SLOTS) {
      for (const [mealId, n] of planCounts[slot]) {
        totals[slot].set(mealId, (totals[slot].get(mealId) ?? 0) + n);
      }
    }
  }
  const fatigued = new Set<string>();
  for (const slot of SLOTS) {
    for (const [mealId, n] of totals[slot]) {
      if (n >= 2) fatigued.add(`${slot}:${mealId}`);
    }
  }
  return fatigued;
}

export function isFatigued(fatigued: Set<string>, slot: GroceryMealSlot, mealId: string): boolean {
  return fatigued.has(`${slot}:${mealId}`);
}

function uniqueMealsInSlot(plan: MealPlanDay[], slot: GroceryMealSlot): Set<string> {
  const ids = new Set<string>();
  for (const day of plan) {
    ids.add(day.meals[slot].mealId);
  }
  return ids;
}

function appearanceCount(counts: SlotAppearanceCounts, slot: GroceryMealSlot, mealId: string): number {
  return counts[slot].get(mealId) ?? 0;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round0(n: number): number {
  return Math.round(n);
}

export function mondayOfWeekContaining(iso: string): string {
  const d = parseISO(iso);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function mealToScheduled(
  templateId: string,
  isLeftover: boolean,
  scheduledSlot?: GroceryMealSlot,
): ScheduledMeal {
  const meal = MEAL_BY_ID.get(templateId)!;
  return {
    mealId: meal.id,
    name: meal.name,
    slot: scheduledSlot ?? meal.slot,
    costPerServing: meal.costPerServing,
    macros: { ...meal.macrosPerServing },
    isLeftover,
    thumbnailUrl: meal.thumbnailUrl,
  };
}

export function scoreMeal(
  meal: GroceryMealTemplate,
  goal: string,
  slotTarget: MacroTotals,
  remainingBudget: number,
): number {
  const macroFit =
    -Math.abs(meal.macrosPerServing.protein - slotTarget.protein) * 2 -
    Math.abs(meal.macrosPerServing.carbs - slotTarget.carbs) -
    Math.abs(meal.macrosPerServing.fat - slotTarget.fat) * 1.5 -
    Math.abs(meal.macrosPerServing.calories - slotTarget.calories) * 0.05;

  let goalBoost = 0;
  if (goal === 'build_muscle') goalBoost = meal.proteinScore * 3 + meal.macrosPerServing.protein * 0.5;
  else if (goal === 'lose_fat') goalBoost = -meal.macrosPerServing.calories * 0.02 + meal.proteinScore;
  else goalBoost = meal.proteinScore;

  const mealCost = meal.costPerServing;
  const budgetPenalty = mealCost > remainingBudget ? -50 : 0;

  return macroFit + goalBoost + budgetPenalty - mealCost * 0.2;
}

function rankCandidates(
  slot: GroceryMealSlot,
  profile: Profile,
  slotTarget: MacroTotals,
  budgetLeft: number,
  weeklyCounts: SlotAppearanceCounts,
  fatigued: Set<string>,
  uniqueUsed: Set<string>,
  dayIndex: number,
): GroceryMealTemplate[] {
  const minUnique = MIN_UNIQUE_BY_SLOT[slot];
  const daysLeft = 7 - dayIndex;
  const uniqueNeeded = Math.max(0, minUnique - uniqueUsed.size);

  const pool = mealsForSlot(slot).slice();

  const sortFn = (a: GroceryMealTemplate, b: GroceryMealTemplate) => {
    const aFat = isFatigued(fatigued, slot, a.id) ? 1 : 0;
    const bFat = isFatigued(fatigued, slot, b.id) ? 1 : 0;
    if (aFat !== bFat) return aFat - bFat;

    const aNew = uniqueUsed.has(a.id) ? 0 : 1;
    const bNew = uniqueUsed.has(b.id) ? 0 : 1;
    if (uniqueNeeded > 0 && uniqueNeeded >= daysLeft && aNew !== bNew) return bNew - aNew;
    if (uniqueNeeded > 0 && aNew !== bNew) return bNew - aNew;

    const aAppear = appearanceCount(weeklyCounts, slot, a.id);
    const bAppear = appearanceCount(weeklyCounts, slot, b.id);
    if (aAppear !== bAppear) return aAppear - bAppear;

    return scoreMeal(b, profile.goal, slotTarget, budgetLeft) - scoreMeal(a, profile.goal, slotTarget, budgetLeft);
  };

  const underLimit = pool
    .filter((m) => appearanceCount(weeklyCounts, slot, m.id) < MAX_APPEARANCES_PER_SLOT)
    .sort(sortFn);

  if (underLimit.length > 0) return underLimit;

  return pool.sort(sortFn);
}

export function slotTargets(daily: MacroTotals): Record<GroceryMealSlot, MacroTotals> {
  return {
    breakfast: {
      calories: round0(daily.calories * 0.25),
      protein: round1(daily.protein * 0.25),
      carbs: round1(daily.carbs * 0.25),
      fat: round1(daily.fat * 0.25),
    },
    lunch: {
      calories: round0(daily.calories * 0.35),
      protein: round1(daily.protein * 0.35),
      carbs: round1(daily.carbs * 0.35),
      fat: round1(daily.fat * 0.35),
    },
    dinner: {
      calories: round0(daily.calories * 0.4),
      protein: round1(daily.protein * 0.4),
      carbs: round1(daily.carbs * 0.4),
      fat: round1(daily.fat * 0.4),
    },
  };
}

export function daysCoveredByBatch(servingsProduced: number, householdSize: number): number {
  return Math.max(1, Math.floor(servingsProduced / Math.max(1, householdSize)));
}

export function estimateWeekCost(plan: MealPlanDay[], householdSize: number): number {
  let total = 0;
  for (const day of plan) {
    for (const slot of SLOTS) {
      const meal = day.meals[slot];
      if (!meal.isLeftover) {
        total += meal.costPerServing * householdSize;
      }
    }
  }
  return Math.round(total * 100) / 100;
}

export function avgDailyMacros(plan: MealPlanDay[], householdSize: number): MacroTotals {
  const totals = plan.reduce(
    (acc, day) => {
      for (const slot of SLOTS) {
        const m = day.meals[slot];
        acc.calories += m.macros.calories * householdSize;
        acc.protein += m.macros.protein * householdSize;
        acc.carbs += m.macros.carbs * householdSize;
        acc.fat += m.macros.fat * householdSize;
      }
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  return {
    calories: round0(totals.calories / 7),
    protein: round1(totals.protein / 7),
    carbs: round1(totals.carbs / 7),
    fat: round1(totals.fat / 7),
  };
}

function buildSchedule(
  input: GenerateGroceryInput,
  profile: Profile,
  weekStart: string,
  fatigued: Set<string> = new Set(),
): MealPlanDay[] {
  const targets: MacroTotals = {
    calories: profile.targets.calorieTarget,
    protein: profile.targets.macros.proteinG,
    carbs: profile.targets.macros.carbsG,
    fat: profile.targets.macros.fatG,
  };
  const perSlot = slotTargets(targets);
  const plan: MealPlanDay[] = [];
  let budgetLeft = input.budget;

  const weeklyCounts = emptyAppearanceCounts();
  const uniqueUsed: Record<GroceryMealSlot, Set<string>> = {
    breakfast: new Set(),
    lunch: new Set(),
    dinner: new Set(),
  };

  /** Active batch: mealId -> days remaining after today */
  const activeBatch = new Map<string, { mealId: string; slot: GroceryMealSlot; daysLeft: number }>();

  for (let di = 0; di < 7; di++) {
    const date = addDaysISO(weekStart, di);
    const dayPlan: MealPlanDay = {
      date,
      day: DAY_NAMES[di],
      meals: {} as MealPlanDay['meals'],
    };

    for (const slot of SLOTS) {
      const continuing = [...activeBatch.entries()].find(([, b]) => b.slot === slot && b.daysLeft > 0);

      if (continuing) {
        const [key, batch] = continuing;
        dayPlan.meals[slot] = mealToScheduled(batch.mealId, true, slot);
        batch.daysLeft -= 1;
        if (batch.daysLeft <= 0) activeBatch.delete(key);
        continue;
      }

      const candidates = rankCandidates(
        slot,
        profile,
        perSlot[slot],
        budgetLeft,
        weeklyCounts,
        fatigued,
        uniqueUsed[slot],
        di,
      );

      const picked = candidates[0] ?? mealsForSlot(slot)[0];
      const mealCost = picked.costPerServing * input.householdSize;
      budgetLeft -= mealCost;

      dayPlan.meals[slot] = mealToScheduled(picked.id, false, slot);
      weeklyCounts[slot].set(picked.id, appearanceCount(weeklyCounts, slot, picked.id) + 1);
      uniqueUsed[slot].add(picked.id);

      const cover = daysCoveredByBatch(picked.servingsProduced, input.householdSize);
      if (cover > 1) {
        activeBatch.set(`${slot}-${di}`, {
          mealId: picked.id,
          slot,
          daysLeft: cover - 1,
        });
      }
    }

    plan.push(dayPlan);
  }

  return plan;
}

/** True when this cook day has no leftover continuation (safe to swap in isolation). */
function isStandaloneCook(plan: MealPlanDay[], cookDi: number, slot: GroceryMealSlot): boolean {
  const meal = plan[cookDi].meals[slot];
  if (meal.isLeftover) return false;
  if (cookDi + 1 >= plan.length) return true;
  const next = plan[cookDi + 1].meals[slot];
  return !(next.isLeftover && next.mealId === meal.mealId);
}

function replaceStandaloneCook(
  plan: MealPlanDay[],
  cookDi: number,
  slot: GroceryMealSlot,
  newMealId: string,
): void {
  plan[cookDi].meals[slot] = mealToScheduled(newMealId, false, slot);
}

function enforceMinimumVariety(
  plan: MealPlanDay[],
  input: GenerateGroceryInput,
  profile: Profile,
  fatigued: Set<string>,
  maxBudget: number,
): MealPlanDay[] {
  let current = plan.map((day) => ({
    ...day,
    meals: { ...day.meals },
  }));

  for (const slot of SLOTS) {
    const minUnique = MIN_UNIQUE_BY_SLOT[slot];
    let guard = 0;

    while (uniqueMealsInSlot(current, slot).size < minUnique && guard < 20) {
      guard += 1;
      const used = uniqueMealsInSlot(current, slot);
      const candidates = rankCandidates(
        slot,
        profile,
        slotTargets({
          calories: profile.targets.calorieTarget,
          protein: profile.targets.macros.proteinG,
          carbs: profile.targets.macros.carbsG,
          fat: profile.targets.macros.fatG,
        })[slot],
        maxBudget,
        emptyAppearanceCounts(),
        fatigued,
        used,
        0,
      ).filter((m) => !used.has(m.id));

      if (candidates.length === 0) break;

      const cookDays: number[] = [];
      for (let di = 0; di < current.length; di++) {
        if (isStandaloneCook(current, di, slot)) cookDays.push(di);
      }
      if (cookDays.length === 0) break;

      const appearances = countAppearancesInPlan(current)[slot];
      cookDays.sort(
        (a, b) =>
          (appearances.get(current[b].meals[slot].mealId) ?? 0) -
          (appearances.get(current[a].meals[slot].mealId) ?? 0),
      );

      let swapped = false;
      for (const cookDi of cookDays) {
        for (const candidate of candidates) {
          const trial = current.map((day) => ({
            ...day,
            meals: { ...day.meals },
          }));
          replaceStandaloneCook(trial, cookDi, slot, candidate.id);
          if (estimateWeekCost(trial, input.householdSize) > maxBudget) continue;
          if (uniqueMealsInSlot(trial, slot).size <= used.size) continue;
          current = trial;
          swapped = true;
          break;
        }
        if (swapped) break;
      }
      if (!swapped) break;
    }
  }

  return current;
}

function trimToBudget(
  plan: MealPlanDay[],
  input: GenerateGroceryInput,
  profile: Profile,
  weekStart: string,
  fatigued: Set<string>,
): MealPlanDay[] {
  let current = plan;
  let guard = 0;
  while (estimateWeekCost(current, input.householdSize) > input.budget && guard < 40) {
    guard += 1;
    let swapped = false;
    for (let di = 6; di >= 0 && !swapped; di--) {
      for (const slot of SLOTS) {
        const scheduled = current[di].meals[slot];
        if (scheduled.isLeftover) continue;
        const swapId = MEAL_BUDGET_SWAPS[scheduled.mealId];
        if (!swapId) continue;
        const swapMeal = MEAL_BY_ID.get(swapId);
        if (!swapMeal || swapMeal.slot !== slot) continue;
        if (swapMeal.costPerServing >= scheduled.costPerServing) continue;

        current[di].meals[slot] = mealToScheduled(swapId, false, slot);
        swapped = true;
        break;
      }
    }
    if (!swapped) break;
  }

  if (estimateWeekCost(current, input.householdSize) <= input.budget) {
    return current;
  }

  return buildSchedule({ ...input, budget: input.budget * 0.85 }, profile, weekStart, fatigued);
}

function formatQuantity(key: string, amount: number, unit: string): string {
  if (unit === 'each') return `${Math.ceil(amount)}`;
  if (unit === 'dozen') return `${round1(amount)} dozen`;
  if (unit === 'can') return `${round1(amount)} cans`;
  if (unit === 'lb') return `${round1(amount)} lb`;
  if (unit === 'loaf') return `${round1(amount)} loaves`;
  if (unit === 'pack') return `${round1(amount)} packs`;
  if (unit === 'bag') return `${round1(amount)} bags`;
  if (unit === 'jar' || unit === 'bottle' || unit === 'container' || unit === 'carton') {
    return `${round1(amount)} ${unit}${amount > 1 ? 's' : ''}`;
  }
  return `${round1(amount)} ${unit}`;
}

export function buildGroceryList(
  plan: MealPlanDay[],
  multiplier: number,
  pantry: string[] = [],
): { categories: GroceryListCategory[]; totalCost: number; alreadyHave: PantryExcludedItem[] } {
  const totals = new Map<string, { amount: number; unit: string }>();

  for (const day of plan) {
    for (const slot of SLOTS) {
      const scheduled = day.meals[slot];
      if (scheduled.isLeftover) continue;
      const template = MEAL_BY_ID.get(scheduled.mealId);
      if (!template) continue;
      for (const ing of template.ingredients) {
        const prev = totals.get(ing.key) ?? { amount: 0, unit: ing.unit };
        prev.amount += ing.batchAmount;
        totals.set(ing.key, prev);
      }
    }
  }

  const alreadyHave: PantryExcludedItem[] = [];
  const buyItems: {
    key: string;
    name: string;
    quantity: string;
    estimatedPrice: number;
    category: GroceryListCategory['category'];
  }[] = [];

  for (const [key, { amount, unit }] of totals.entries()) {
    const catalog = INGREDIENT_CATALOG[key];
    const name = catalog?.displayName ?? key;
    if (ingredientOwnedByPantry(key, pantry)) {
      alreadyHave.push({ key, name });
      continue;
    }
    buyItems.push({
      key,
      name,
      quantity: formatQuantity(key, amount, unit),
      estimatedPrice: estimateIngredientCost(key, amount, multiplier),
      category: catalog?.category ?? 'grains',
    });
  }

  alreadyHave.sort((a, b) => a.name.localeCompare(b.name));

  let totalCost = 0;
  const grouped: GroceryListCategory[] = (['protein', 'produce', 'dairy', 'grains'] as const).map(
    (category) => {
      const catItems = buyItems
        .filter((i) => i.category === category)
        .sort((a, b) => a.name.localeCompare(b.name));
      totalCost += catItems.reduce((s, i) => s + i.estimatedPrice, 0);
      return {
        category,
        label: CATEGORY_META[category].label,
        icon: CATEGORY_META[category].icon,
        items: catItems,
      };
    },
  );

  return {
    categories: grouped,
    totalCost: Math.round(totalCost * 100) / 100,
    alreadyHave,
  };
}

export function generateGroceryPlan(
  input: GenerateGroceryInput,
  profile: Profile,
  today: string,
  recentPlans: MealPlanDay[][] = [],
): GroceryPlanPayload {
  const weekStart = mondayOfWeekContaining(today);
  const multiplier = regionalPriceMultiplier(input.location);
  const fatigued = buildFatiguedMeals(recentPlans);
  const varietyBudgetCap = input.budget * VARIETY_BUDGET_OVERRUN;

  let mealPlan = buildSchedule(input, profile, weekStart, fatigued);
  mealPlan = trimToBudget(mealPlan, input, profile, weekStart, fatigued);
  mealPlan = enforceMinimumVariety(mealPlan, input, profile, fatigued, varietyBudgetCap);

  const pantry = profile.pantry ?? [];
  const { categories, totalCost, alreadyHave } = buildGroceryList(mealPlan, multiplier, pantry);

  const targets: MacroTotals = {
    calories: profile.targets.calorieTarget,
    protein: profile.targets.macros.proteinG,
    carbs: profile.targets.macros.carbsG,
    fat: profile.targets.macros.fatG,
  };

  return {
    weekStart,
    mealPlan,
    groceryList: categories,
    totalCost,
    avgDailyMacros: avgDailyMacros(mealPlan, input.householdSize),
    targets,
    alreadyHave,
  };
}

export function flattenDaysForUpcoming(mealPlan: MealPlanDay[]) {
  return mealPlan.map((day) => ({
    date: day.date,
    meals: SLOTS.map((slot) => ({
      slot,
      name: day.meals[slot].name,
      scheduledTime: MEAL_TIMES[slot],
    })),
  }));
}
