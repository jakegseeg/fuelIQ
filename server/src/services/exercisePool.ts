import {
  getExerciseCacheSyncedAt,
  listCachedExercises,
} from '../db/exerciseCacheRepo.js';
import type { ExerciseRecord } from '../domain/exerciseTypes.js';
import {
  buildExerciseRecords,
  filterByFocus,
  filterExercisesByRotationGroup,
  filterExercisesBySplit,
  getSmartExercises,
  searchExerciseRecords,
} from './exerciseLibrary.js';
import { syncExercisesFromWger } from './wgerSync.js';

const REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

let allExercises: ExerciseRecord[] = [];
let exerciseById = new Map<number, ExerciseRecord>();
let refreshPromise: Promise<void> | null = null;

function rebuildIndexes(records: ExerciseRecord[]): void {
  allExercises = records;
  exerciseById = new Map(records.map((record) => [record.id, record]));
}

function isCacheFresh(): boolean {
  const syncedAt = getExerciseCacheSyncedAt();
  if (!syncedAt) return false;
  return Date.now() - new Date(syncedAt).getTime() < REFRESH_MS;
}

export async function refreshExercisePool(force = false): Promise<void> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      if (!force && isCacheFresh()) {
        const cached = listCachedExercises();
        if (cached.length > 0) {
          rebuildIndexes(buildExerciseRecords(cached));
          console.log(`✅ Exercise pool loaded from exercise_cache (${cached.length} exercises)`);
          return;
        }
      }

      const count = await syncExercisesFromWger();
      const rows = listCachedExercises();
      rebuildIndexes(buildExerciseRecords(rows));
      console.log(`✅ Exercise pool synced from wger (${count} exercises)`);
    } catch (err) {
      const cached = listCachedExercises();
      if (cached.length > 0) {
        rebuildIndexes(buildExerciseRecords(cached));
        console.warn('⚠️ wger exercise sync failed; using cached exercises', err);
        return;
      }
      rebuildIndexes([]);
      console.error('❌ Exercise pool unavailable', err);
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export function initExercisePool(): Promise<void> {
  return refreshExercisePool(false);
}

export function scheduleExercisePoolRefresh(): void {
  setInterval(() => {
    void refreshExercisePool(true);
  }, REFRESH_MS);
}

export function getAllExercises(): ExerciseRecord[] {
  return allExercises;
}

export function getExerciseById(id: number): ExerciseRecord | undefined {
  return exerciseById.get(id);
}

export function getExercisesBySplit(split: string): ExerciseRecord[] {
  return filterExercisesBySplit(allExercises, split);
}

export function searchExercises(query: string): ExerciseRecord[] {
  return searchExerciseRecords(allExercises, query);
}

export function getExercisesByRotationGroup(rotationGroup: string): ExerciseRecord[] {
  return filterExercisesByRotationGroup(allExercises, rotationGroup);
}

export function getSmartExercisesForFocus(focus: string): ExerciseRecord[] {
  return filterByFocus(getSmartExercises(allExercises), focus);
}

export function getSwapAlternatives(
  rotationGroup: string,
  excludeNames: string[],
): ExerciseRecord[] {
  const exclude = new Set(excludeNames.map((n) => n.toLowerCase()));
  return filterExercisesByRotationGroup(allExercises, rotationGroup).filter(
    (record) => !exclude.has(record.name.toLowerCase()),
  );
}

export function exercisePoolStats() {
  const withSmart = allExercises.filter((e) => e.smartData).length;
  return {
    total: allExercises.length,
    withSmartData: withSmart,
    syncedAt: getExerciseCacheSyncedAt(),
  };
}
