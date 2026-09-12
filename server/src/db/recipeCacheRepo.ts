import type { GroceryMealTemplate } from '../domain/grocery.js';
import { db } from './index.js';

interface CacheRow {
  pool_json: string;
  updated_at: string;
}

export function loadRecipeCache(): { meals: GroceryMealTemplate[]; updatedAt: string } | null {
  const row = db.get<CacheRow>('SELECT pool_json, updated_at FROM recipe_cache WHERE id = 1');
  if (!row) return null;
  try {
    const meals = JSON.parse(row.pool_json) as GroceryMealTemplate[];
    if (!Array.isArray(meals)) return null;
    return { meals, updatedAt: row.updated_at };
  } catch {
    return null;
  }
}

export function saveRecipeCache(meals: GroceryMealTemplate[]): void {
  db.run(
    `INSERT OR REPLACE INTO recipe_cache (id, pool_json, updated_at) VALUES (1, ?, datetime('now'))`,
    [JSON.stringify(meals)],
  );
}
