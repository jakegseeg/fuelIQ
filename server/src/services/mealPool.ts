import type { GroceryMealSlot, GroceryMealTemplate } from '../domain/grocery.js';
import { FALLBACK_GROCERY_MEALS } from '../domain/groceryMeals.js';
import {
  MEALDB_CATEGORY_ENDPOINTS,
  MEALDB_LOOKUP_URL,
  parseMealDbRecipe,
  type MealDbDetail,
} from '../domain/mealDbParser.js';
import { loadRecipeCache, saveRecipeCache } from '../db/recipeCacheRepo.js';

const MIN_THEMEALDB_RECIPES = 20;
const MIN_POOL_SIZE = 30;
const TARGET_THEMEALDB_RECIPES = 60;
const REFRESH_MS = 24 * 60 * 60 * 1000;
const FETCH_CONCURRENCY = 3;
const FETCH_BATCH_DELAY_MS = 350;
const FETCH_MAX_RETRIES = 4;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let allMeals: GroceryMealTemplate[] = [...FALLBACK_GROCERY_MEALS];
let mealById = new Map<string, GroceryMealTemplate>(
  FALLBACK_GROCERY_MEALS.map((meal) => [meal.id, meal]),
);
let lastRefreshAt = 0;
let refreshPromise: Promise<void> | null = null;

function normalizeTemplate(meal: GroceryMealTemplate): GroceryMealTemplate {
  return {
    ...meal,
    eligibleSlots: meal.eligibleSlots?.length ? meal.eligibleSlots : [meal.slot],
  };
}

function rebuildIndexes(meals: GroceryMealTemplate[]): void {
  allMeals = meals.map(normalizeTemplate);
  mealById = new Map(allMeals.map((meal) => [meal.id, meal]));
}

function mergeWithFallback(themealdbMeals: GroceryMealTemplate[]): GroceryMealTemplate[] {
  const byId = new Map<string, GroceryMealTemplate>();
  for (const meal of themealdbMeals) byId.set(meal.id, normalizeTemplate(meal));

  if (byId.size < MIN_THEMEALDB_RECIPES) {
    for (const meal of FALLBACK_GROCERY_MEALS) {
      if (!byId.has(meal.id)) byId.set(meal.id, normalizeTemplate(meal));
    }
  }

  let pool = [...byId.values()];
  if (pool.length < MIN_POOL_SIZE) {
    for (const meal of FALLBACK_GROCERY_MEALS) {
      if (pool.length >= MIN_POOL_SIZE) break;
      if (!pool.some((m) => m.id === meal.id)) pool.push(normalizeTemplate(meal));
    }
  }

  return pool;
}

async function fetchJson<T>(url: string, attempt = 0): Promise<T> {
  const res = await fetch(url);
  if (res.status === 429 && attempt < FETCH_MAX_RETRIES) {
    await sleep(500 * 2 ** attempt);
    return fetchJson(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`TheMealDB request failed (${res.status})`);
  return res.json() as Promise<T>;
}

async function fetchMealIds(): Promise<string[]> {
  const ids = new Set<string>();
  for (const url of MEALDB_CATEGORY_ENDPOINTS) {
    const data = await fetchJson<{ meals: { idMeal: string }[] | null }>(url);
    for (const meal of data.meals ?? []) ids.add(meal.idMeal);
    await sleep(FETCH_BATCH_DELAY_MS);
  }
  return [...ids];
}

async function fetchMealDetail(id: string): Promise<MealDbDetail | null> {
  try {
    const data = await fetchJson<{ meals: MealDbDetail[] | null }>(MEALDB_LOOKUP_URL(id));
    return data.meals?.[0] ?? null;
  } catch {
    return null;
  }
}

async function fetchTheMealDbPool(): Promise<GroceryMealTemplate[]> {
  const ids = await fetchMealIds();
  const parsed: GroceryMealTemplate[] = [];

  for (let i = 0; i < ids.length; i += FETCH_CONCURRENCY) {
    const chunk = ids.slice(i, i + FETCH_CONCURRENCY);
    const details = await Promise.all(chunk.map((id) => fetchMealDetail(id)));
    for (const detail of details) {
      if (!detail) continue;
      const template = parseMealDbRecipe(detail);
      if (template) parsed.push(template);
    }
    if (parsed.length >= TARGET_THEMEALDB_RECIPES) break;
    if (i + FETCH_CONCURRENCY < ids.length) await sleep(FETCH_BATCH_DELAY_MS);
  }

  return parsed;
}

function cacheIsStale(updatedAt: string | undefined): boolean {
  if (!updatedAt) return true;
  const ts = Date.parse(updatedAt.replace(' ', 'T') + 'Z');
  if (!Number.isFinite(ts)) return true;
  return Date.now() - ts >= REFRESH_MS;
}

async function refreshFromNetwork(): Promise<GroceryMealTemplate[]> {
  const themealdbMeals = await fetchTheMealDbPool();
  if (themealdbMeals.length > 0) saveRecipeCache(themealdbMeals);
  if (themealdbMeals.length === 0) throw new Error('TheMealDB returned no recipes');
  return mergeWithFallback(themealdbMeals);
}

function loadFromDbCache(): GroceryMealTemplate[] | null {
  const cached = loadRecipeCache();
  if (!cached || cached.meals.length === 0) return null;
  return mergeWithFallback(cached.meals);
}

export async function refreshMealPool(force = false): Promise<void> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const cached = loadRecipeCache();
      const shouldFetch = force || !cached || cacheIsStale(cached.updatedAt);

      if (shouldFetch) {
        try {
          const pool = await refreshFromNetwork();
          rebuildIndexes(pool);
          lastRefreshAt = Date.now();
          console.log(`✅ Meal pool refreshed from TheMealDB (${pool.length} meals)`);
          return;
        } catch (err) {
          console.warn('TheMealDB fetch failed, using recipe_cache fallback:', err);
        }
      }

      const dbPool = loadFromDbCache();
      if (dbPool) {
        rebuildIndexes(dbPool);
        lastRefreshAt = Date.now();
        console.log(`✅ Meal pool loaded from recipe_cache (${dbPool.length} meals)`);
        return;
      }

      rebuildIndexes(mergeWithFallback([]));
      console.log(`✅ Meal pool using hardcoded fallback (${allMeals.length} meals)`);
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export function initMealPool(): Promise<void> {
  return refreshMealPool(false);
}

export function scheduleMealPoolRefresh(): void {
  setInterval(() => {
    void refreshMealPool(true);
  }, REFRESH_MS);
}

export function getAllMeals(): GroceryMealTemplate[] {
  return allMeals;
}

export function getMealById(id: string): GroceryMealTemplate | undefined {
  return mealById.get(id);
}

export function mealsForSlot(slot: GroceryMealSlot): GroceryMealTemplate[] {
  return allMeals.filter((meal) => meal.eligibleSlots.includes(slot));
}

export const MEAL_BY_ID = {
  get(id: string) {
    return mealById.get(id);
  },
};

export function mealPoolReady(): boolean {
  return allMeals.length >= MIN_POOL_SIZE;
}

export function mealPoolStats() {
  return {
    total: allMeals.length,
    themealdb: allMeals.filter((m) => m.id.startsWith('themealdb-')).length,
    fallback: allMeals.filter((m) => !m.id.startsWith('themealdb-')).length,
    lastRefreshAt,
  };
}
