import type { CachedExercise } from '../domain/exerciseTypes.js';
import { db } from './index.js';

interface ExerciseRow {
  id: number;
  wger_id: number;
  name: string;
  description: string;
  category_name: string;
  primary_muscles: string;
  secondary_muscles: string;
  equipment: string;
  cached_at: string;
}

interface MetaRow {
  synced_at: string;
}

function parseJsonArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function mapRow(row: ExerciseRow): CachedExercise {
  return {
    id: row.id,
    wgerId: row.wger_id,
    name: row.name,
    description: row.description,
    categoryName: row.category_name,
    primaryMuscles: parseJsonArray(row.primary_muscles),
    secondaryMuscles: parseJsonArray(row.secondary_muscles),
    equipment: parseJsonArray(row.equipment),
    cachedAt: row.cached_at,
  };
}

export function getExerciseCacheSyncedAt(): string | null {
  const row = db.get<MetaRow>('SELECT synced_at FROM exercise_cache_meta WHERE id = 1');
  return row?.synced_at ?? null;
}

export function setExerciseCacheSyncedAt(iso: string): void {
  db.run(
    `INSERT OR REPLACE INTO exercise_cache_meta (id, synced_at) VALUES (1, ?)`,
    [iso],
  );
}

export function clearExerciseCache(): void {
  db.run('DELETE FROM exercise_cache');
}

export function insertExerciseCacheRow(
  exercise: Omit<CachedExercise, 'id' | 'cachedAt'>,
  cachedAt: string,
): number {
  db.run(
    `INSERT OR REPLACE INTO exercise_cache (
      wger_id, name, description, category_name,
      primary_muscles, secondary_muscles, equipment, cached_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      exercise.wgerId,
      exercise.name,
      exercise.description,
      exercise.categoryName,
      JSON.stringify(exercise.primaryMuscles),
      JSON.stringify(exercise.secondaryMuscles),
      JSON.stringify(exercise.equipment),
      cachedAt,
    ],
  );
  const row = db.get<{ id: number }>('SELECT id FROM exercise_cache WHERE wger_id = ?', [
    exercise.wgerId,
  ]);
  return row?.id ?? 0;
}

export function listCachedExercises(): CachedExercise[] {
  const rows = db.all<ExerciseRow>(
    'SELECT * FROM exercise_cache ORDER BY name COLLATE NOCASE ASC',
  );
  return rows.map(mapRow);
}

export function getCachedExerciseById(id: number): CachedExercise | null {
  const row = db.get<ExerciseRow>('SELECT * FROM exercise_cache WHERE id = ?', [id]);
  return row ? mapRow(row) : null;
}

export function getCachedExerciseByWgerId(wgerId: number): CachedExercise | null {
  const row = db.get<ExerciseRow>('SELECT * FROM exercise_cache WHERE wger_id = ?', [wgerId]);
  return row ? mapRow(row) : null;
}

export function searchCachedExercises(query: string, limit = 50): CachedExercise[] {
  const q = `%${query.trim().toLowerCase()}%`;
  const rows = db.all<ExerciseRow>(
    `SELECT * FROM exercise_cache
     WHERE lower(name) LIKE ?
     ORDER BY name COLLATE NOCASE ASC
     LIMIT ?`,
    [q, limit],
  );
  return rows.map(mapRow);
}
