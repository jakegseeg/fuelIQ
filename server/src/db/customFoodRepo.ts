import { db } from './index.js';
import type { FoodItem, NutritionPer100g } from '../domain/food.js';

interface Row {
  id: number;
  name: string;
  brand: string | null;
  per100_json: string;
  nova_group: number | null;
  micronutrient_count: number;
}

function rowToFood(row: Row): FoodItem {
  const per100 = JSON.parse(row.per100_json) as NutritionPer100g;
  return {
    source: 'custom',
    name: row.name,
    brand: row.brand,
    barcode: `custom-${row.id}`,
    per100,
    novaGroup: row.nova_group,
    micronutrientCount: row.micronutrient_count,
    servingOptions: [
      { label: '1 serving (100 g)', grams: 100 },
      { label: '1 oz (28 g)', grams: 28.35 },
    ],
    defaultServingG: 100,
  };
}

export function saveCustomFood(
  userId: string,
  food: {
    name: string;
    brand: string | null;
    per100: NutritionPer100g;
    novaGroup: number | null;
    micronutrientCount: number;
  },
): FoodItem {
  db.run(
    'INSERT INTO custom_foods (user_id, name, brand, per100_json, nova_group, micronutrient_count) VALUES (?, ?, ?, ?, ?, ?)',
    [
      userId,
      food.name,
      food.brand,
      JSON.stringify(food.per100),
      food.novaGroup,
      food.micronutrientCount,
    ],
  );
  const row = db.get<Row>(
    'SELECT * FROM custom_foods WHERE user_id = ? ORDER BY id DESC LIMIT 1',
    [userId],
  );
  return rowToFood(row!);
}

export function getCustomFood(userId: string, id: number): FoodItem | null {
  const row = db.get<Row>('SELECT * FROM custom_foods WHERE id = ? AND user_id = ?', [id, userId]);
  return row ? rowToFood(row) : null;
}

export function searchCustomFoods(userId: string, query: string, limit = 5): FoodItem[] {
  const rows = db.all<Row>(
    'SELECT * FROM custom_foods WHERE user_id = ? AND name LIKE ? ORDER BY created_at DESC LIMIT ?',
    [userId, `%${query}%`, limit],
  );
  return rows.map(rowToFood);
}
