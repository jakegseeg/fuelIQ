import type { CachedExercise, ExerciseRecord } from '../domain/exerciseTypes.js';
import { getSmartDataForName } from '../domain/exerciseSmartData.js';

export function mergeExerciseWithSmartData(cached: CachedExercise): ExerciseRecord {
  return {
    ...cached,
    smartData: getSmartDataForName(cached.name),
  };
}

export function buildExerciseRecords(cached: CachedExercise[]): ExerciseRecord[] {
  return cached.map(mergeExerciseWithSmartData);
}

export function filterExercisesBySplit(records: ExerciseRecord[], split: string): ExerciseRecord[] {
  const needle = split.trim().toLowerCase();
  if (!needle) return [];
  return records.filter((record) =>
    record.smartData?.workoutSplit.some((s) => s.toLowerCase() === needle),
  );
}

export function filterExercisesByRotationGroup(
  records: ExerciseRecord[],
  rotationGroup: string,
): ExerciseRecord[] {
  return records.filter((record) => record.smartData?.rotationGroup === rotationGroup);
}

export function getSmartExercises(records: ExerciseRecord[]): ExerciseRecord[] {
  return records.filter((record) => record.smartData != null);
}

export function filterByFocus(records: ExerciseRecord[], focus: string): ExerciseRecord[] {
  const f = focus.toLowerCase();
  const splits: string[] = [];
  if (f.includes('push')) splits.push('push', 'chest', 'shoulders', 'arms');
  else if (f.includes('pull')) splits.push('pull', 'back', 'arms');
  else if (f.includes('leg') || f.includes('lower')) splits.push('legs', 'lower');
  else if (f.includes('upper')) splits.push('upper', 'push', 'pull', 'chest', 'back', 'shoulders', 'arms');
  else if (f.includes('full body')) splits.push('push', 'pull', 'legs', 'core', 'full');
  else if (f.includes('cardio') || f.includes('conditioning')) splits.push('cardio', 'conditioning');
  else if (f.includes('core')) splits.push('core');
  else splits.push('push', 'pull', 'legs', 'core', 'full');

  const seen = new Set<number>();
  const out: ExerciseRecord[] = [];
  for (const split of splits) {
    for (const record of filterExercisesBySplit(records, split)) {
      if (!seen.has(record.id)) {
        seen.add(record.id);
        out.push(record);
      }
    }
  }
  return out;
}

export function searchExerciseRecords(records: ExerciseRecord[], query: string): ExerciseRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return records.filter((record) => record.name.toLowerCase().includes(q));
}
