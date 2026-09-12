import type { PlanExercise } from './workoutTypes';

const STORAGE_PREFIX = 'fueliq.workoutSwaps';

function swapKey(planId: number, dayIndex: number): string {
  return `${STORAGE_PREFIX}.${planId}.${dayIndex}`;
}

export function loadSessionSwaps(planId: number, dayIndex: number): Record<number, PlanExercise> {
  try {
    const raw = sessionStorage.getItem(swapKey(planId, dayIndex));
    return raw ? (JSON.parse(raw) as Record<number, PlanExercise>) : {};
  } catch {
    return {};
  }
}

export function saveSessionSwap(
  planId: number,
  dayIndex: number,
  exerciseIndex: number,
  exercise: PlanExercise,
): void {
  const current = loadSessionSwaps(planId, dayIndex);
  current[exerciseIndex] = exercise;
  sessionStorage.setItem(swapKey(planId, dayIndex), JSON.stringify(current));
}

export function applySessionSwaps(
  exercises: PlanExercise[],
  swaps: Record<number, PlanExercise>,
): PlanExercise[] {
  return exercises.map((ex, i) => swaps[i] ?? ex);
}

export function clearSessionSwaps(planId: number, dayIndex: number): void {
  sessionStorage.removeItem(swapKey(planId, dayIndex));
}
