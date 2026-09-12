import type {
  GroceryMealSlot,
  GroceryPlanRecord,
  GroceryPlanPayload,
  MacroTotals,
  MealPlanDay,
  MealSwapAlternative,
} from '../domain/grocery.js';
import { regionalPriceMultiplier } from '../domain/groceryCatalog.js';
import { MEAL_BY_ID, mealsForSlot } from '../services/mealPool.js';
import type { Profile } from '../domain/types.js';
import {
  avgDailyMacros,
  buildFatiguedMeals,
  buildGroceryList,
  daysCoveredByBatch,
  isFatigued,
  mealToScheduled,
  scoreMeal,
  slotTargets,
} from './groceryPlanner.js';

const SLOTS: GroceryMealSlot[] = ['breakfast', 'lunch', 'dinner'];

function cloneMealPlan(plan: MealPlanDay[]): MealPlanDay[] {
  return plan.map((day) => ({
    ...day,
    meals: { ...day.meals },
  }));
}

function mealIdsUsedElsewhere(
  plan: MealPlanDay[],
  date: string,
  slot: GroceryMealSlot,
): Set<string> {
  const ids = new Set<string>();
  for (const day of plan) {
    for (const s of SLOTS) {
      if (day.date === date && s === slot) continue;
      ids.add(day.meals[s].mealId);
    }
  }
  return ids;
}

function cookCostExcludingSwap(
  plan: MealPlanDay[],
  householdSize: number,
  date: string,
  slot: GroceryMealSlot,
): number {
  let total = 0;
  for (const day of plan) {
    for (const s of SLOTS) {
      const meal = day.meals[s];
      if (meal.isLeftover) continue;
      if (day.date === date && s === slot) continue;
      total += meal.costPerServing * householdSize;
    }
  }
  return Math.round(total * 100) / 100;
}

export function getSwapAlternatives(
  record: GroceryPlanRecord,
  priorPlans: MealPlanDay[][],
  profile: Profile,
  date: string,
  slot: GroceryMealSlot,
): MealSwapAlternative[] {
  const day = record.mealPlan.find((d) => d.date === date);
  if (!day) return [];

  const currentMealId = day.meals[slot].mealId;
  const usedElsewhere = mealIdsUsedElsewhere(record.mealPlan, date, slot);
  const fatigued = buildFatiguedMeals(priorPlans);
  const remainingBudget =
    record.budget - cookCostExcludingSwap(record.mealPlan, record.householdSize, date, slot);

  const targets: MacroTotals = {
    calories: profile.targets.calorieTarget,
    protein: profile.targets.macros.proteinG,
    carbs: profile.targets.macros.carbsG,
    fat: profile.targets.macros.fatG,
  };
  const slotTarget = slotTargets(targets)[slot];

  return mealsForSlot(slot)
    .filter((m) => {
      if (m.id === currentMealId) return false;
      if (usedElsewhere.has(m.id)) return false;
      if (isFatigued(fatigued, slot, m.id)) return false;
      return m.costPerServing * record.householdSize <= remainingBudget + 0.001;
    })
    .sort(
      (a, b) =>
        scoreMeal(b, profile.goal, slotTarget, remainingBudget) -
        scoreMeal(a, profile.goal, slotTarget, remainingBudget),
    )
    .slice(0, 3)
    .map((m) => ({
      mealId: m.id,
      name: m.name,
      costPerServing: m.costPerServing,
      macros: { ...m.macrosPerServing },
      description: m.instructions[0] ?? '',
    }));
}

export function applyMealSwap(
  mealPlan: MealPlanDay[],
  date: string,
  slot: GroceryMealSlot,
  newMealId: string,
  householdSize: number,
): MealPlanDay[] {
  const plan = cloneMealPlan(mealPlan);
  const di = plan.findIndex((d) => d.date === date);
  if (di < 0) throw new Error('Day not found in meal plan');

  const template = MEAL_BY_ID.get(newMealId);
  if (!template || !template.eligibleSlots.includes(slot)) throw new Error('Invalid meal for this slot');

  const cover = daysCoveredByBatch(template.servingsProduced, householdSize);
  plan[di].meals[slot] = mealToScheduled(newMealId, false, slot);
  for (let j = 1; j < cover && di + j < plan.length; j++) {
    plan[di + j].meals[slot] = mealToScheduled(newMealId, true, slot);
  }

  return plan;
}

export function rebuildPlanAfterSwap(
  record: GroceryPlanRecord,
  profile: Profile,
  date: string,
  slot: GroceryMealSlot,
  newMealId: string,
): GroceryPlanPayload {
  const mealPlan = applyMealSwap(
    record.mealPlan,
    date,
    slot,
    newMealId,
    record.householdSize,
  );
  const multiplier = regionalPriceMultiplier(record.location);
  const pantry = profile.pantry ?? [];
  const { categories, totalCost, alreadyHave } = buildGroceryList(mealPlan, multiplier, pantry);

  return {
    weekStart: record.weekStart,
    mealPlan,
    groceryList: categories,
    totalCost,
    avgDailyMacros: avgDailyMacros(mealPlan, record.householdSize),
    targets: record.targets,
    alreadyHave,
  };
}

export function swapWithinBudget(record: GroceryPlanRecord, payload: GroceryPlanPayload): boolean {
  return payload.totalCost <= record.budget + 0.001;
}
