/**
 * Smart food suggestions (spec section 2.5).
 *
 * Given the macros remaining for the day, return 3–5 foods that best fill the
 * gap with high FuelScores. Uses the Anthropic Claude API when an API key is
 * configured, and otherwise falls back to a deterministic ranking over a
 * curated high-quality food library (so the feature works offline).
 */
import { computeFuelScore } from '../domain/fuelscore.js';
import {
  totalsForQuantity,
  type FoodItem,
  type FuelScore,
  type MacroTotals,
  type NutritionPer100g,
} from '../domain/food.js';

export interface RemainingMacros {
  protein: number;
  carbs: number;
  fat: number;
}

export interface Suggestion {
  food: FoodItem;
  suggestedServingG: number;
  reason: string;
  fuelScore: FuelScore;
  estimated: MacroTotals;
}

function per100(p: Partial<NutritionPer100g> & { calories: number }): NutritionPer100g {
  return {
    calories: p.calories,
    protein: p.protein ?? 0,
    carbs: p.carbs ?? 0,
    fat: p.fat ?? 0,
    fiber: p.fiber ?? null,
    sugars: p.sugars ?? null,
    addedSugars: p.addedSugars ?? null,
    satFat: p.satFat ?? null,
    sodium: p.sodium ?? null,
  };
}

interface CuratedFood {
  name: string;
  serving: number; // grams
  nova: number;
  micros: number;
  per100: NutritionPer100g;
}

const c = (
  name: string,
  serving: number,
  nova: number,
  micros: number,
  n: Partial<NutritionPer100g> & { calories: number },
): CuratedFood => ({ name, serving, nova, micros, per100: per100(n) });

/** Curated library of whole, high-FuelScore foods (per-100g nutrition). */
const LIBRARY: CuratedFood[] = [
  c('Grilled chicken breast', 120, 1, 2, { calories: 165, protein: 31, carbs: 0, fat: 3.6, satFat: 1, fiber: 0, sugars: 0 }),
  c('Nonfat Greek yogurt', 170, 1, 2, { calories: 59, protein: 10, carbs: 3.6, fat: 0.4, satFat: 0.1, sugars: 3.2 }),
  c('Cooked lentils', 150, 1, 3, { calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 7.9, sugars: 1.8 }),
  c('Baked salmon', 140, 1, 3, { calories: 208, protein: 20, carbs: 0, fat: 13, satFat: 3, sugars: 0 }),
  c('Eggs', 100, 1, 2, { calories: 143, protein: 13, carbs: 0.7, fat: 9.5, satFat: 3.1 }),
  c('Black beans', 130, 1, 2, { calories: 132, protein: 8.9, carbs: 24, fat: 0.5, fiber: 8.7, sugars: 0.3 }),
  c('Firm tofu', 120, 2, 2, { calories: 144, protein: 17, carbs: 2.8, fat: 9, satFat: 1.3, fiber: 2 }),
  c('Rolled oats', 50, 1, 3, { calories: 389, protein: 17, carbs: 66, fat: 7, fiber: 10, sugars: 1 }),
  c('Broccoli', 100, 1, 3, { calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, sugars: 1.7 }),
  c('Spinach', 80, 1, 4, { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 }),
  c('Sweet potato', 150, 1, 2, { calories: 86, protein: 1.6, carbs: 20, fat: 0.1, fiber: 3, sugars: 4.2 }),
  c('Cooked quinoa', 150, 1, 2, { calories: 120, protein: 4.4, carbs: 21, fat: 1.9, fiber: 2.8 }),
  c('Almonds', 30, 1, 3, { calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12, satFat: 3.8 }),
  c('Canned tuna in water', 100, 1, 2, { calories: 116, protein: 26, carbs: 0, fat: 1, satFat: 0.3 }),
  c('Low-fat cottage cheese', 150, 1, 1, { calories: 72, protein: 12, carbs: 2.7, fat: 1, satFat: 0.6 }),
  c('Brown rice', 150, 1, 1, { calories: 112, protein: 2.6, carbs: 24, fat: 0.9, fiber: 1.8 }),
  c('Banana', 120, 1, 2, { calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, sugars: 12 }),
  c('Avocado', 100, 1, 3, { calories: 160, protein: 2, carbs: 9, fat: 15, fiber: 7, satFat: 2.1 }),
  c('Edamame', 100, 1, 2, { calories: 121, protein: 12, carbs: 9, fat: 5, fiber: 5 }),
  c('Whey protein shake', 35, 4, 2, { calories: 400, protein: 80, carbs: 8, fat: 6, satFat: 2, sugars: 4 }),
];

function toFood(cf: CuratedFood): FoodItem {
  return {
    source: 'custom',
    name: cf.name,
    brand: null,
    barcode: null,
    per100: cf.per100,
    novaGroup: cf.nova,
    micronutrientCount: cf.micros,
    servingOptions: [
      { label: `1 serving (${cf.serving} g)`, grams: cf.serving },
      { label: '100 g', grams: 100 },
    ],
    defaultServingG: cf.serving,
  };
}

function buildReason(
  totals: MacroTotals,
  need: RemainingMacros,
  goal: string,
  fuel: FuelScore,
): string {
  const contributions: [string, number][] = [
    ['protein', Math.min(totals.protein, Math.max(0, need.protein))],
    ['carb', Math.min(totals.carbs, Math.max(0, need.carbs))],
    ['fat', Math.min(totals.fat, Math.max(0, need.fat))],
  ];
  contributions.sort((a, b) => b[1] - a[1]);
  const primary = contributions[0][0];
  const lowCal = totals.calories <= 200;
  const pieces: string[] = [];
  if (primary === 'protein') pieces.push('High protein');
  else if (primary === 'carb') pieces.push('Quality carbs');
  else pieces.push('Healthy fats');
  if (lowCal && goal === 'lose_fat') pieces.push('low calorie');
  if (fuel.rating === 'excellent') pieces.push('excellent FuelScore');
  return `${pieces.join(', ')} — fills your ${primary} gap (${Math.round(
    contributions[0][1],
  )} g).`;
}

function rankLocal(remaining: RemainingMacros, goal: string, limit: number): Suggestion[] {
  const need: RemainingMacros = {
    protein: Math.max(0, remaining.protein),
    carbs: Math.max(0, remaining.carbs),
    fat: Math.max(0, remaining.fat),
  };

  const ranked = LIBRARY.map((cf) => {
    const food = toFood(cf);
    const totals = totalsForQuantity(cf.per100, cf.serving);
    const fuel = computeFuelScore({
      per100: cf.per100,
      novaGroup: cf.nova,
      micronutrientCount: cf.micros,
    });

    // Useful contribution toward the deficit (no credit for overshoot).
    const fit =
      Math.min(totals.protein, need.protein) * (goal === 'build_muscle' ? 1.5 : 1) +
      Math.min(totals.carbs, need.carbs) +
      Math.min(totals.fat, need.fat);

    let score = fit * (0.5 + fuel.score / 20);
    if (goal === 'lose_fat') score = score / Math.sqrt(Math.max(50, totals.calories));

    return { food, totals, fuel, score, serving: cf.serving };
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked.map((r) => ({
    food: r.food,
    suggestedServingG: r.serving,
    reason: buildReason(r.totals, need, goal, r.fuel),
    fuelScore: r.fuel,
    estimated: r.totals,
  }));
}

interface ClaudeFood {
  name: string;
  reason: string;
  servingG: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  novaGroup?: number;
}

async function rankWithClaude(
  remaining: RemainingMacros,
  goal: string,
  limit: number,
): Promise<Suggestion[] | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    // Non-literal specifier keeps this an optional dependency: the project
    // builds and runs without the SDK installed, and uses it when present.
    const pkg = '@anthropic-ai/sdk';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import(pkg);
    const Anthropic = mod.default;
    const client = new Anthropic({ apiKey });

    const prompt =
      `You are a nutrition coach. The user's goal is "${goal}". ` +
      `They have these macros remaining for the day: protein ${Math.round(
        remaining.protein,
      )} g, carbs ${Math.round(remaining.carbs)} g, fat ${Math.round(remaining.fat)} g. ` +
      `Suggest ${limit} whole, high-quality foods that best fill the remaining macros. ` +
      `Respond ONLY with a JSON array (no prose) of objects with keys: ` +
      `name, reason (short, e.g. "High protein, low calorie — fills your protein gap"), ` +
      `servingG, calories, protein, carbs, fat, novaGroup (1-4). Values are for the given serving.`;

    const msg = await client.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = msg.content
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map((b) => b.text)
      .join('');
    const jsonStart = text.indexOf('[');
    const jsonEnd = text.lastIndexOf(']');
    if (jsonStart === -1 || jsonEnd === -1) return null;
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as ClaudeFood[];

    return parsed.slice(0, limit).map((f) => {
      const grams = f.servingG > 0 ? f.servingG : 100;
      const scale = 100 / grams;
      const p100 = per100({
        calories: f.calories * scale,
        protein: f.protein * scale,
        carbs: f.carbs * scale,
        fat: f.fat * scale,
      });
      const nova = f.novaGroup && f.novaGroup >= 1 && f.novaGroup <= 4 ? f.novaGroup : null;
      const fuel = computeFuelScore({ per100: p100, novaGroup: nova, micronutrientCount: 0 });
      const food: FoodItem = {
        source: 'custom',
        name: f.name,
        brand: null,
        barcode: null,
        per100: p100,
        novaGroup: nova,
        micronutrientCount: 0,
        servingOptions: [
          { label: `1 serving (${grams} g)`, grams },
          { label: '100 g', grams: 100 },
        ],
        defaultServingG: grams,
      };
      return {
        food,
        suggestedServingG: grams,
        reason: f.reason,
        fuelScore: fuel,
        estimated: {
          calories: Math.round(f.calories),
          protein: Math.round(f.protein),
          carbs: Math.round(f.carbs),
          fat: Math.round(f.fat),
        },
      };
    });
  } catch (err) {
    console.warn('Claude suggestion failed, falling back to local ranking:', err);
    return null;
  }
}

export async function getSuggestions(
  remaining: RemainingMacros,
  goal: string,
  limit = 4,
): Promise<{ source: 'claude' | 'local'; suggestions: Suggestion[] }> {
  const claude = await rankWithClaude(remaining, goal, limit);
  if (claude && claude.length > 0) return { source: 'claude', suggestions: claude };
  return { source: 'local', suggestions: rankLocal(remaining, goal, limit) };
}
