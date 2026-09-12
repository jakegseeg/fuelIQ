/**
 * Open Food Facts integration (spec section 2.3).
 *
 * Normalizes OFF product records into our `FoodItem` shape and counts
 * micronutrients present at >= 10% of the FDA daily value (for FuelScore).
 */
import type { FoodItem, NutritionPer100g, ServingOption } from '../domain/food.js';

const OFF_BASE = 'https://world.openfoodfacts.org';
const USER_AGENT =
  process.env.OPEN_FOOD_FACTS_USER_AGENT || 'FuelIQ/1.0 (local dev; https://github.com/fueliq)';

const FIELDS = [
  'code',
  'product_name',
  'brands',
  'nutriments',
  'nova_group',
  'serving_size',
  'serving_quantity',
].join(',');

/** FDA daily values, expressed in grams to match OFF's normalized _100g values. */
const DAILY_VALUES_G: Record<string, number> = {
  'vitamin-a': 0.0009,
  'vitamin-c': 0.09,
  'vitamin-d': 0.00002,
  'vitamin-e': 0.015,
  'vitamin-k': 0.00012,
  'vitamin-b1': 0.0012,
  'vitamin-b2': 0.0013,
  'vitamin-pp': 0.016, // niacin (B3)
  'vitamin-b6': 0.0017,
  'vitamin-b9': 0.0004, // folate
  folates: 0.0004,
  'vitamin-b12': 0.0000024,
  calcium: 1.3,
  iron: 0.018,
  potassium: 4.7,
  magnesium: 0.42,
  zinc: 0.011,
};

type Nutriments = Record<string, number | string | undefined>;

interface OffProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  nutriments?: Nutriments;
  nova_group?: number | string;
  serving_size?: string;
  serving_quantity?: number | string;
}

function num(v: number | string | undefined): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
}

function energyKcalPer100g(n: Nutriments): number {
  return (
    num(n['energy-kcal_100g']) ??
    num(n['energy-kcal']) ??
    (num(n['energy_100g']) != null ? Math.round((num(n['energy_100g']) as number) / 4.184) : null) ??
    0
  );
}

function countMicronutrients(n: Nutriments): number {
  let count = 0;
  for (const [key, dv] of Object.entries(DAILY_VALUES_G)) {
    const value = num(n[`${key}_100g`]);
    if (value != null && value >= 0.1 * dv) count += 1;
  }
  return count;
}

function buildServingOptions(serving_size?: string, serving_quantity?: number | string): ServingOption[] {
  const options: ServingOption[] = [{ label: '100 g', grams: 100 }];
  const sq = num(serving_quantity);
  if (sq && sq > 0) {
    const label = serving_size ? `1 serving (${serving_size})` : `1 serving (${sq} g)`;
    options.unshift({ label, grams: sq });
  }
  options.push({ label: '1 oz (28 g)', grams: 28.35 });
  return options;
}

function normalize(p: OffProduct): FoodItem | null {
  const n = p.nutriments ?? {};
  const calories = energyKcalPer100g(n);
  const name = (p.product_name || '').trim();
  // Skip records without a name or any usable energy/macro data.
  if (!name) return null;
  if (calories === 0 && num(n['proteins_100g']) == null && num(n['fat_100g']) == null) {
    return null;
  }

  const per100: NutritionPer100g = {
    calories,
    protein: num(n['proteins_100g']) ?? 0,
    carbs: num(n['carbohydrates_100g']) ?? 0,
    fat: num(n['fat_100g']) ?? 0,
    fiber: num(n['fiber_100g']),
    sugars: num(n['sugars_100g']),
    addedSugars: num(n['added-sugars_100g']),
    satFat: num(n['saturated-fat_100g']),
    sodium: num(n['sodium_100g']) != null ? (num(n['sodium_100g']) as number) * 1000 : null,
  };

  const nova = num(p.nova_group);

  return {
    source: 'off',
    name,
    brand: p.brands ? p.brands.split(',')[0].trim() : null,
    barcode: p.code ?? null,
    per100,
    novaGroup: nova != null && nova >= 1 && nova <= 4 ? Math.round(nova) : null,
    micronutrientCount: countMicronutrients(n),
    servingOptions: buildServingOptions(p.serving_size, p.serving_quantity),
    defaultServingG: num(p.serving_quantity) || 100,
  };
}

async function offFetch(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Open Food Facts responded ${res.status}`);
  return res.json();
}

export async function searchFoods(query: string, pageSize = 20): Promise<FoodItem[]> {
  const url =
    `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
    `&search_simple=1&action=process&json=1&page_size=${pageSize}&fields=${FIELDS}`;
  const data = (await offFetch(url)) as { products?: OffProduct[] };
  return (data.products ?? [])
    .map(normalize)
    .filter((f): f is FoodItem => f !== null);
}

export async function lookupBarcode(barcode: string): Promise<FoodItem | null> {
  const url = `${OFF_BASE}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`;
  const data = (await offFetch(url)) as { status?: number; product?: OffProduct };
  if (!data.product || data.status === 0) return null;
  return normalize(data.product);
}
