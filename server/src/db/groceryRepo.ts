import { db } from './index.js';
import type { GroceryPlanPayload, GroceryPlanRecord, MealPlanDay } from '../domain/grocery.js';
import { flattenDaysForUpcoming } from '../services/groceryPlanner.js';

interface GroceryPlanRow {
  id: number;
  user_id: string;
  budget: number;
  household_size: number;
  location: string;
  week_start: string;
  meal_plan_json: string;
  grocery_list_json: string;
  meta_json: string | null;
  total_cost: number;
  created_at: string;
}

function rowToRecord(row: GroceryPlanRow): GroceryPlanRecord {
  const mealPlan = JSON.parse(row.meal_plan_json);
  const groceryList = JSON.parse(row.grocery_list_json);
  let avgDailyMacros = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  let targets = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  let alreadyHave: GroceryPlanRecord['alreadyHave'] = [];
  if (row.meta_json) {
    try {
      const meta = JSON.parse(row.meta_json) as {
        avgDailyMacros: GroceryPlanRecord['avgDailyMacros'];
        targets: GroceryPlanRecord['targets'];
        alreadyHave?: GroceryPlanRecord['alreadyHave'];
      };
      avgDailyMacros = meta.avgDailyMacros;
      targets = meta.targets;
      alreadyHave = meta.alreadyHave ?? [];
    } catch {
      /* ignore */
    }
  }

  return {
    id: row.id,
    budget: row.budget,
    householdSize: row.household_size,
    location: row.location,
    weekStart: row.week_start,
    mealPlan,
    groceryList,
    totalCost: row.total_cost,
    avgDailyMacros,
    targets,
    alreadyHave,
    createdAt: row.created_at,
    days: flattenDaysForUpcoming(mealPlan),
  };
}

export function getActiveGroceryPlan(userId: string): GroceryPlanRecord | null {
  const row = db.get<GroceryPlanRow>(
    `SELECT * FROM grocery_plans
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 1`,
    [userId],
  );
  return row ? rowToRecord(row) : null;
}

/** Last N saved meal plans (most recent first), for cross-week variety. */
export function getRecentGroceryMealPlans(userId: string, limit: number): MealPlanDay[][] {
  const rows = db.all<{ meal_plan_json: string }>(
    `SELECT meal_plan_json FROM grocery_plans
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?`,
    [userId, limit],
  );
  return rows.map((row) => JSON.parse(row.meal_plan_json) as MealPlanDay[]);
}

/** Prior saved plans excluding the current active plan (for swap variety). */
export function getPriorGroceryMealPlans(userId: string, limit: number): MealPlanDay[][] {
  const rows = db.all<{ meal_plan_json: string }>(
    `SELECT meal_plan_json FROM grocery_plans
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET 1`,
    [userId, limit],
  );
  return rows.map((row) => JSON.parse(row.meal_plan_json) as MealPlanDay[]);
}

export function updateActiveGroceryPlan(
  userId: string,
  payload: GroceryPlanPayload,
): GroceryPlanRecord | null {
  const row = db.get<{ id: number }>(
    `SELECT id FROM grocery_plans WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );
  if (!row) return null;

  db.run(
    `UPDATE grocery_plans
       SET meal_plan_json = ?, grocery_list_json = ?, total_cost = ?, meta_json = ?
     WHERE id = ?`,
    [
      JSON.stringify(payload.mealPlan),
      JSON.stringify(payload.groceryList),
      payload.totalCost,
      JSON.stringify({
        avgDailyMacros: payload.avgDailyMacros,
        targets: payload.targets,
        alreadyHave: payload.alreadyHave,
      }),
      row.id,
    ],
  );

  return getActiveGroceryPlan(userId);
}

export function saveGroceryPlan(
  userId: string,
  input: { budget: number; householdSize: number; location: string },
  payload: GroceryPlanPayload,
): GroceryPlanRecord {
  db.run(
    `INSERT INTO grocery_plans
      (user_id, budget, household_size, location, week_start, meal_plan_json, grocery_list_json, meta_json, total_cost)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      input.budget,
      input.householdSize,
      input.location,
      payload.weekStart,
      JSON.stringify(payload.mealPlan),
      JSON.stringify(payload.groceryList),
      JSON.stringify({ avgDailyMacros: payload.avgDailyMacros, targets: payload.targets, alreadyHave: payload.alreadyHave }),
      payload.totalCost,
    ],
  );

  const saved = getActiveGroceryPlan(userId);
  if (!saved) throw new Error('Failed to save grocery plan');
  return saved;
}

export function deleteGroceryPlan(userId: string): void {
  const latest = db.get<{ id: number }>(
    `SELECT id FROM grocery_plans WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );
  if (latest) {
    db.run('DELETE FROM grocery_plans WHERE id = ?', [latest.id]);
  }
}
