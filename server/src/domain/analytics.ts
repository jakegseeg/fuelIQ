/** Pure analytics helpers for dashboard & progress charts. */
import { addDaysISO } from './dates.js';

export type AdherenceStatus = 'green' | 'yellow' | 'red';

/** Color-code a day's calories vs target: <=10% off green, 10–20% yellow, else red. */
export function adherenceStatus(calories: number, target: number): AdherenceStatus {
  if (target <= 0) return 'red';
  const offPct = Math.abs(calories - target) / target;
  if (offPct <= 0.1) return 'green';
  if (offPct <= 0.2) return 'yellow';
  return 'red';
}

export function adherencePct(calories: number, target: number): number {
  if (target <= 0) return 0;
  return Math.round((calories / target) * 100);
}

/** N-day trailing moving average over an ordered numeric series. */
export function movingAverage(values: (number | null)[], window: number): (number | null)[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1).filter((v): v is number => v != null);
    if (slice.length === 0) return null;
    return Math.round((slice.reduce((s, v) => s + v, 0) / slice.length) * 10) / 10;
  });
}

/**
 * Consecutive-day logging streak ending today. If today has no log yet but
 * yesterday does, the streak still counts (it only breaks on a full missed day).
 */
export function loggingStreak(loggedDates: Iterable<string>, todayISO: string): number {
  const set = loggedDates instanceof Set ? loggedDates : new Set(loggedDates);
  let cursor = todayISO;
  if (!set.has(cursor)) cursor = addDaysISO(todayISO, -1);
  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

export interface MacroGrams {
  protein: number;
  carbs: number;
  fat: number;
}

/** Percentage of calories from each macro (protein/carbs 4 kcal/g, fat 9). */
export function macroSplitPercent(m: MacroGrams): MacroGrams {
  const pK = m.protein * 4;
  const cK = m.carbs * 4;
  const fK = m.fat * 9;
  const total = pK + cK + fK;
  if (total <= 0) return { protein: 0, carbs: 0, fat: 0 };
  return {
    protein: Math.round((pK / total) * 100),
    carbs: Math.round((cK / total) * 100),
    fat: Math.round((fK / total) * 100),
  };
}

/** Percent change from baseline to current (e.g. FuelScore improvement). */
export function improvementPct(baseline: number, current: number): number | null {
  if (baseline <= 0) return null;
  return Math.round(((current - baseline) / baseline) * 100);
}
