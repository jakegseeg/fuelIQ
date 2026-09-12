import { db } from './index.js';
import { computeFuelScore } from '../domain/fuelscore.js';
import {
  totalsForQuantity,
  type FoodItem,
  type LogEntry,
  type MealSlot,
  type NutritionPer100g,
} from '../domain/food.js';

export interface LogEntryInput {
  date: string;
  meal: MealSlot;
  source: FoodItem['source'];
  name: string;
  brand: string | null;
  barcode: string | null;
  servingLabel: string;
  quantityG: number;
  per100: NutritionPer100g;
  novaGroup: number | null;
  micronutrientCount: number;
}

interface LogRow {
  id: number;
  log_date: string;
  meal: string;
  source: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  serving_label: string;
  quantity_g: number;
  cal_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
  fiber_100g: number | null;
  sugars_100g: number | null;
  added_sugars_100g: number | null;
  sat_fat_100g: number | null;
  sodium_100g: number | null;
  nova_group: number | null;
  micronutrient_count: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  created_at: string;
}

function per100FromRow(row: LogRow): NutritionPer100g {
  return {
    calories: row.cal_100g,
    protein: row.protein_100g,
    carbs: row.carbs_100g,
    fat: row.fat_100g,
    fiber: row.fiber_100g,
    sugars: row.sugars_100g,
    addedSugars: row.added_sugars_100g,
    satFat: row.sat_fat_100g,
    sodium: row.sodium_100g,
  };
}

function rowToEntry(row: LogRow): LogEntry {
  const per100 = per100FromRow(row);
  return {
    id: row.id,
    date: row.log_date,
    meal: row.meal as MealSlot,
    source: row.source as FoodItem['source'],
    name: row.name,
    brand: row.brand,
    barcode: row.barcode,
    servingLabel: row.serving_label,
    quantityG: row.quantity_g,
    per100,
    novaGroup: row.nova_group,
    micronutrientCount: row.micronutrient_count,
    fuelScore: computeFuelScore({
      per100,
      novaGroup: row.nova_group,
      micronutrientCount: row.micronutrient_count,
    }),
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    createdAt: row.created_at,
  };
}

export function addEntry(userId: string, input: LogEntryInput): LogEntry {
  const totals = totalsForQuantity(input.per100, input.quantityG);
  const fuel = computeFuelScore({
    per100: input.per100,
    novaGroup: input.novaGroup,
    micronutrientCount: input.micronutrientCount,
  });

  db.run(
    `INSERT INTO food_log_entries (
      user_id, log_date, meal, source, name, brand, barcode, serving_label, quantity_g,
      cal_100g, protein_100g, carbs_100g, fat_100g, fiber_100g, sugars_100g,
      added_sugars_100g, sat_fat_100g, sodium_100g, nova_group, micronutrient_count,
      calories, protein, carbs, fat, fuel_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId, input.date, input.meal, input.source, input.name, input.brand,
      input.barcode, input.servingLabel, input.quantityG,
      input.per100.calories, input.per100.protein, input.per100.carbs, input.per100.fat,
      input.per100.fiber ?? null, input.per100.sugars ?? null,
      input.per100.addedSugars ?? null, input.per100.satFat ?? null,
      input.per100.sodium ?? null, input.novaGroup, input.micronutrientCount,
      totals.calories, totals.protein, totals.carbs, totals.fat, fuel.score,
    ]
  );

  const row = db.get<LogRow>(
    `SELECT * FROM food_log_entries WHERE user_id = ? AND log_date = ? AND name = ? ORDER BY created_at DESC LIMIT 1`,
    [userId, input.date, input.name]
  );
  return rowToEntry(row!);
}

export function getEntry(userId: string, id: number): LogEntry | null {
  const row = db.get<LogRow>(
    'SELECT * FROM food_log_entries WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return row ? rowToEntry(row) : null;
}

export function listEntriesForDate(userId: string, date: string): LogEntry[] {
  const rows = db.all<LogRow>(
    'SELECT * FROM food_log_entries WHERE user_id = ? AND log_date = ? ORDER BY created_at ASC',
    [userId, date]
  );
  return rows.map(rowToEntry);
}

export function deleteEntry(userId: string, id: number): boolean {
  const before = db.get<{ count: number }>(
    'SELECT COUNT(*) as count FROM food_log_entries WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  if (!before || before.count === 0) return false;
  db.run('DELETE FROM food_log_entries WHERE id = ? AND user_id = ?', [id, userId]);
  return true;
}

export function updateEntryQuantity(
  userId: string,
  id: number,
  quantityG: number,
  servingLabel?: string,
): LogEntry | null {
  const existing = getEntry(userId, id);
  if (!existing) return null;
  const totals = totalsForQuantity(existing.per100, quantityG);
  db.run(
    `UPDATE food_log_entries
       SET quantity_g = ?, serving_label = COALESCE(?, serving_label),
           calories = ?, protein = ?, carbs = ?, fat = ?
     WHERE id = ? AND user_id = ?`,
    [quantityG, servingLabel ?? null, totals.calories, totals.protein, totals.carbs, totals.fat, id, userId]
  );
  return getEntry(userId, id);
}

function entryToFood(row: LogRow): FoodItem {
  const per100 = per100FromRow(row);
  return {
    source: row.source as FoodItem['source'],
    name: row.name,
    brand: row.brand,
    barcode: row.barcode,
    per100,
    novaGroup: row.nova_group,
    micronutrientCount: row.micronutrient_count,
    servingOptions: [
      { label: row.serving_label, grams: row.quantity_g },
      { label: '100 g', grams: 100 },
    ],
    defaultServingG: row.quantity_g || 100,
  };
}

export function recentFoods(userId: string, limit = 20): FoodItem[] {
  const rows = db.all<LogRow>(
    `SELECT *, MAX(created_at) AS latest FROM food_log_entries
     WHERE user_id = ?
     GROUP BY name, brand
     ORDER BY latest DESC
     LIMIT ?`,
    [userId, limit]
  );
  return rows.map(entryToFood);
}

export function frequentFoods(userId: string, limit = 10): FoodItem[] {
  const rows = db.all<LogRow>(
    `SELECT *, COUNT(*) AS log_count FROM food_log_entries
     WHERE user_id = ?
     GROUP BY name, brand
     ORDER BY log_count DESC, MAX(created_at) DESC
     LIMIT ?`,
    [userId, limit]
  );
  return rows.map(entryToFood);
}