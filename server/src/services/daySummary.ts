import { getProfile } from '../db/profileRepo.js';
import { listEntriesForDate } from '../db/logRepo.js';
import { getWaterDay } from '../db/waterRepo.js';
import { caloriesBurnedForDate } from '../db/workoutRepo.js';
import { MEAL_SLOTS, type LogEntry, type MacroTotals, type MealSlot } from '../domain/food.js';
import { kgToLbs } from '../domain/calculations.js';

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
  /** Calories burned from logged workouts on this date (spec 3.5). */
  caloriesBurned: number;
  /** Net calories = consumed − burned. */
  netCalories: number;
  water: { totalOz: number; goalOz: number; entries: { id: number; oz: number }[] };
}

const ZERO: MacroTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

function addTotals(a: MacroTotals, b: MacroTotals): MacroTotals {
  return {
    calories: Math.round(a.calories + b.calories),
    protein: Math.round((a.protein + b.protein) * 10) / 10,
    carbs: Math.round((a.carbs + b.carbs) * 10) / 10,
    fat: Math.round((a.fat + b.fat) * 10) / 10,
  };
}

function entryTotals(e: LogEntry): MacroTotals {
  return { calories: e.calories, protein: e.protein, carbs: e.carbs, fat: e.fat };
}

export function buildDaySummary(userId: string, date: string): DaySummary {
  const entries = listEntriesForDate(userId, date);
  const profile = getProfile(userId);

  const meals: MealGroup[] = MEAL_SLOTS.map((meal) => {
    const mealEntries = entries.filter((e) => e.meal === meal);
    const subtotal = mealEntries.reduce((acc, e) => addTotals(acc, entryTotals(e)), { ...ZERO });
    return { meal, entries: mealEntries, subtotal };
  });

  const totals = entries.reduce((acc, e) => addTotals(acc, entryTotals(e)), { ...ZERO });

  const target: MacroTotals | null = profile
    ? {
        calories: profile.targets.calorieTarget,
        protein: profile.targets.macros.proteinG,
        carbs: profile.targets.macros.carbsG,
        fat: profile.targets.macros.fatG,
      }
    : null;

  // Workouts increase the calories available for the day (net calories).
  const caloriesBurned = caloriesBurnedForDate(userId, date);
  const netCalories = Math.round(totals.calories - caloriesBurned);

  const remaining: MacroTotals | null = target
    ? {
        // Calories burned add back to the daily allowance.
        calories: Math.round(target.calories - totals.calories + caloriesBurned),
        protein: Math.round((target.protein - totals.protein) * 10) / 10,
        carbs: Math.round((target.carbs - totals.carbs) * 10) / 10,
        fat: Math.round((target.fat - totals.fat) * 10) / 10,
      }
    : null;

  const water = getWaterDay(userId, date);
  // Hydration goal: bodyweight (lbs) × 0.5 = oz target.
  const goalOz = profile ? Math.round(kgToLbs(profile.weightKg) * 0.5) : 64;

  return {
    date,
    meals,
    totals,
    target,
    remaining,
    goal: profile?.goal ?? null,
    caloriesBurned,
    netCalories,
    water: {
      totalOz: water.totalOz,
      goalOz,
      entries: water.entries.map((e) => ({ id: e.id, oz: e.oz })),
    },
  };
}
