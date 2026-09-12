import type { Goal } from './types';
import { KG_PER_LB } from './units';

const KCAL_PER_KG = 7700;

const GOAL_CALORIE_DELTA: Record<Goal, number> = {
  lose_fat: -500,
  maintain: 0,
  build_muscle: 250,
  recomp: -100,
  endurance: 150,
};

/** Weekly weight change (kg) implied purely by the goal's calorie delta. */
export function goalWeeklyChangeKg(goal: Goal): number {
  return (GOAL_CALORIE_DELTA[goal] * 7) / KCAL_PER_KG;
}

/** Estimated weeks to move from current to target weight at the goal pace. */
export function weeksToTarget(
  goal: Goal,
  currentKg: number,
  targetKg: number,
): number | null {
  const rate = goalWeeklyChangeKg(goal);
  if (rate === 0) return null;
  const delta = targetKg - currentKg;
  // Only meaningful when the pace moves toward the target.
  if (Math.sign(delta) !== Math.sign(rate)) return null;
  return Math.ceil(Math.abs(delta) / Math.abs(rate));
}

export const kgToLbsRate = (kg: number) => kg / KG_PER_LB;
