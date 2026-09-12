/**
 * FuelScore (spec section 2.4): a 1–10 nutritional quality score.
 *
 * Six components are each scored 0–10, then averaged over the components for
 * which we actually have data. The final score is clamped to [1, 10].
 */
import type {
  FuelRating,
  FuelScore,
  FuelScoreComponent,
  NutritionPer100g,
} from './food.js';

export interface FuelScoreInput {
  per100: NutritionPer100g;
  novaGroup: number | null;
  micronutrientCount: number;
}

const clamp = (n: number, lo = 0, hi = 10) => Math.max(lo, Math.min(hi, n));
const r1 = (n: number) => Math.round(n * 10) / 10;

export function computeFuelScore(input: FuelScoreInput): FuelScore {
  const { per100, novaGroup, micronutrientCount } = input;
  const components: FuelScoreComponent[] = [];

  // 1. Protein density: g protein per 100 kcal. ~20 g/100kcal => 10.
  if (per100.calories > 0) {
    const density = (per100.protein / per100.calories) * 100;
    components.push({
      key: 'protein_density',
      label: 'Protein density',
      score: clamp(density / 2),
      detail: `${density.toFixed(1)} g protein per 100 kcal`,
    });
  } else {
    components.push({
      key: 'protein_density',
      label: 'Protein density',
      score: null,
      detail: 'No calorie data',
    });
  }

  // 2. Fiber score: g fiber per 100 kcal, target >= 3 g => 10.
  if (per100.fiber != null && per100.calories > 0) {
    const fiberPer100kcal = (per100.fiber / per100.calories) * 100;
    components.push({
      key: 'fiber',
      label: 'Fiber',
      score: clamp((fiberPer100kcal / 3) * 10),
      detail: `${fiberPer100kcal.toFixed(1)} g fiber per 100 kcal`,
    });
  } else {
    components.push({ key: 'fiber', label: 'Fiber', score: null, detail: 'No fiber data' });
  }

  // 3. Sugar penalty: added sugar / total carbs (fallback to total sugars).
  const sugarNumerator = per100.addedSugars ?? per100.sugars;
  if (sugarNumerator != null && per100.carbs > 0) {
    const ratio = clamp(sugarNumerator / per100.carbs, 0, 1);
    const usedAdded = per100.addedSugars != null;
    components.push({
      key: 'sugar',
      label: 'Sugar',
      score: clamp(10 - ratio * 10),
      detail: `${Math.round(ratio * 100)}% of carbs are ${usedAdded ? 'added sugar' : 'sugar'}`,
    });
  } else {
    components.push({ key: 'sugar', label: 'Sugar', score: null, detail: 'No sugar data' });
  }

  // 4. Processing level from NOVA: 1=>10, 2=>6.7, 3=>3.3, 4=>0.
  if (novaGroup != null && novaGroup >= 1 && novaGroup <= 4) {
    components.push({
      key: 'processing',
      label: 'Processing (NOVA)',
      score: clamp(((4 - novaGroup) / 3) * 10),
      detail: `NOVA group ${novaGroup} (${novaLabel(novaGroup)})`,
    });
  } else {
    components.push({
      key: 'processing',
      label: 'Processing (NOVA)',
      score: null,
      detail: 'No NOVA classification',
    });
  }

  // 5. Micronutrient load: bonus, 4+ micros at >=10% DV => 10.
  components.push({
    key: 'micronutrients',
    label: 'Micronutrients',
    score: clamp(micronutrientCount * 2.5),
    detail:
      micronutrientCount > 0
        ? `${micronutrientCount} nutrient(s) at >= 10% DV`
        : 'No significant micronutrients',
  });

  // 6. Saturated fat ratio: sat fat / total fat, lower is better.
  if (per100.satFat != null && per100.fat > 0) {
    const ratio = clamp(per100.satFat / per100.fat, 0, 1);
    components.push({
      key: 'sat_fat',
      label: 'Saturated fat',
      score: clamp(10 - ratio * 10),
      detail: `${Math.round(ratio * 100)}% of fat is saturated`,
    });
  } else if (per100.fat === 0) {
    components.push({
      key: 'sat_fat',
      label: 'Saturated fat',
      score: 10,
      detail: 'Fat-free',
    });
  } else {
    components.push({
      key: 'sat_fat',
      label: 'Saturated fat',
      score: null,
      detail: 'No saturated fat data',
    });
  }

  const scored = components.filter((c) => c.score != null) as (FuelScoreComponent & {
    score: number;
  })[];
  const avg = scored.length
    ? scored.reduce((sum, c) => sum + c.score, 0) / scored.length
    : 5;
  const score = clamp(r1(avg), 1, 10);

  return { score, rating: ratingFor(score), components };
}

export function ratingFor(score: number): FuelRating {
  if (score >= 8) return 'excellent';
  if (score >= 5) return 'good';
  if (score >= 3) return 'fair';
  return 'poor';
}

function novaLabel(group: number): string {
  switch (group) {
    case 1:
      return 'unprocessed / minimally processed';
    case 2:
      return 'processed culinary ingredient';
    case 3:
      return 'processed';
    default:
      return 'ultra-processed';
  }
}
