import { db } from './index.js';
import {
  totalsForQuantity,
  type FoodItem,
  type MacroTotals,
  type MealSlot,
} from '../domain/food.js';

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

function sumTotals(items: { food: FoodItem; quantityG: number }[]): MacroTotals {
  return items.reduce<MacroTotals>(
    (acc, { food, quantityG }) => {
      const t = totalsForQuantity(food.per100, quantityG);
      return {
        calories: Math.round(acc.calories + t.calories),
        protein: Math.round((acc.protein + t.protein) * 10) / 10,
        carbs: Math.round((acc.carbs + t.carbs) * 10) / 10,
        fat: Math.round((acc.fat + t.fat) * 10) / 10,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

// --- Meal templates -------------------------------------------------------

export function createTemplate(userId: string, name: string, items: TemplateItem[]): MealTemplate {
  db.run('INSERT INTO meal_templates (user_id, name, items_json) VALUES (?, ?, ?)', [
    userId,
    name,
    JSON.stringify(items),
  ]);
  const row = db.get<{ id: number }>(
    'SELECT id FROM meal_templates WHERE user_id = ? ORDER BY id DESC LIMIT 1',
    [userId],
  );
  return getTemplate(userId, row!.id)!;
}

interface TemplateRow {
  id: number;
  name: string;
  items_json: string;
  created_at: string;
}

function rowToTemplate(row: TemplateRow): MealTemplate {
  const items = JSON.parse(row.items_json) as TemplateItem[];
  return {
    id: row.id,
    name: row.name,
    items,
    totals: sumTotals(items),
    createdAt: row.created_at,
  };
}

export function getTemplate(userId: string, id: number): MealTemplate | null {
  const row = db.get<TemplateRow>('SELECT * FROM meal_templates WHERE id = ? AND user_id = ?', [
    id,
    userId,
  ]);
  return row ? rowToTemplate(row) : null;
}

export function listTemplates(userId: string): MealTemplate[] {
  const rows = db.all<TemplateRow>(
    'SELECT * FROM meal_templates WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
  );
  return rows.map(rowToTemplate);
}

export function deleteTemplate(userId: string, id: number): boolean {
  const exists = db.get<{ n: number }>(
    'SELECT 1 as n FROM meal_templates WHERE id = ? AND user_id = ?',
    [id, userId],
  );
  if (!exists) return false;
  db.run('DELETE FROM meal_templates WHERE id = ? AND user_id = ?', [id, userId]);
  return true;
}

// --- Recipes --------------------------------------------------------------

export function createRecipe(
  userId: string,
  name: string,
  servings: number,
  ingredients: RecipeIngredient[],
): Recipe {
  const total = sumTotals(ingredients);
  const div = servings > 0 ? servings : 1;
  db.run(
    `INSERT INTO recipes (user_id, name, servings, ingredients_json, calories, protein, carbs, fat)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      name,
      servings,
      JSON.stringify(ingredients),
      Math.round(total.calories / div),
      Math.round((total.protein / div) * 10) / 10,
      Math.round((total.carbs / div) * 10) / 10,
      Math.round((total.fat / div) * 10) / 10,
    ],
  );
  const row = db.get<{ id: number }>(
    'SELECT id FROM recipes WHERE user_id = ? ORDER BY id DESC LIMIT 1',
    [userId],
  );
  return getRecipe(userId, row!.id)!;
}

interface RecipeRow {
  id: number;
  name: string;
  servings: number;
  ingredients_json: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  created_at: string;
}

function rowToRecipe(row: RecipeRow): Recipe {
  return {
    id: row.id,
    name: row.name,
    servings: row.servings,
    ingredients: JSON.parse(row.ingredients_json) as RecipeIngredient[],
    perServing: {
      calories: row.calories,
      protein: row.protein,
      carbs: row.carbs,
      fat: row.fat,
    },
    createdAt: row.created_at,
  };
}

export function getRecipe(userId: string, id: number): Recipe | null {
  const row = db.get<RecipeRow>('SELECT * FROM recipes WHERE id = ? AND user_id = ?', [id, userId]);
  return row ? rowToRecipe(row) : null;
}

export function listRecipes(userId: string): Recipe[] {
  const rows = db.all<RecipeRow>(
    'SELECT * FROM recipes WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
  );
  return rows.map(rowToRecipe);
}

export function deleteRecipe(userId: string, id: number): boolean {
  const exists = db.get<{ n: number }>('SELECT 1 as n FROM recipes WHERE id = ? AND user_id = ?', [
    id,
    userId,
  ]);
  if (!exists) return false;
  db.run('DELETE FROM recipes WHERE id = ? AND user_id = ?', [id, userId]);
  return true;
}
