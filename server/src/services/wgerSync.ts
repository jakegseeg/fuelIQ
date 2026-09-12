import {
  clearExerciseCache,
  insertExerciseCacheRow,
  setExerciseCacheSyncedAt,
} from '../db/exerciseCacheRepo.js';
import type { CachedExercise } from '../domain/exerciseTypes.js';

const WGER = 'https://wger.de';
const PAGE_SIZE = 100;
const USER_AGENT = 'FuelIQ/0.1';

interface WgerPage<T> {
  count: number;
  next: string | null;
  results: T[];
}

interface WgerExerciseRow {
  id: number;
  category: number;
  muscles: number[];
  muscles_secondary: number[];
  equipment: number[];
}

interface WgerMuscle {
  id: number;
  name: string;
  name_en: string;
}

interface WgerEquipment {
  id: number;
  name: string;
}

interface WgerCategory {
  id: number;
  name: string;
}

interface WgerTranslation {
  exercise: number;
  name: string;
  description: string;
  language: number;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`wger request failed (${res.status}): ${url}`);
  return res.json() as Promise<T>;
}

async function paginate<T>(firstUrl: string): Promise<T[]> {
  const items: T[] = [];
  let url: string | null = firstUrl;
  while (url) {
    const page: WgerPage<T> = await fetchJson<WgerPage<T>>(url);
    items.push(...page.results);
    url = page.next;
  }
  return items;
}

async function loadMuscleMap(): Promise<Map<number, string>> {
  const muscles = await paginate<WgerMuscle>(`${WGER}/api/v2/muscle/?format=json&limit=100`);
  const map = new Map<number, string>();
  for (const m of muscles) {
    map.set(m.id, m.name_en || m.name);
  }
  return map;
}

async function loadEquipmentMap(): Promise<Map<number, string>> {
  const equipment = await paginate<WgerEquipment>(
    `${WGER}/api/v2/equipment/?format=json&limit=100`,
  );
  const map = new Map<number, string>();
  for (const e of equipment) map.set(e.id, e.name);
  return map;
}

async function loadCategoryMap(): Promise<Map<number, string>> {
  const categories = await paginate<WgerCategory>(
    `${WGER}/api/v2/exercisecategory/?format=json&limit=100`,
  );
  const map = new Map<number, string>();
  for (const c of categories) map.set(c.id, c.name);
  return map;
}

async function loadEnglishTranslations(): Promise<Map<number, WgerTranslation>> {
  const translations = await paginate<WgerTranslation>(
    `${WGER}/api/v2/exercise-translation/?format=json&language=2&limit=${PAGE_SIZE}`,
  );
  const byExercise = new Map<number, WgerTranslation>();
  for (const t of translations) {
    if (t.language !== 2) continue;
    const existing = byExercise.get(t.exercise);
    if (!existing || t.name.length > existing.name.length) {
      byExercise.set(t.exercise, t);
    }
  }
  return byExercise;
}

function mapIds(ids: number[] | undefined, lookup: Map<number, string>): string[] {
  return (ids ?? [])
    .map((id) => lookup.get(id))
    .filter((name): name is string => Boolean(name));
}

export async function syncExercisesFromWger(): Promise<number> {
  const [muscleMap, equipmentMap, categoryMap, translations] = await Promise.all([
    loadMuscleMap(),
    loadEquipmentMap(),
    loadCategoryMap(),
    loadEnglishTranslations(),
  ]);

  const exercises = await paginate<WgerExerciseRow>(
    `${WGER}/api/v2/exercise/?format=json&language=2&limit=${PAGE_SIZE}&offset=0`,
  );

  const syncedAt = new Date().toISOString();
  clearExerciseCache();

  let stored = 0;
  const seenWgerIds = new Set<number>();
  for (const row of exercises) {
    if (seenWgerIds.has(row.id)) continue;
    seenWgerIds.add(row.id);
    const translation = translations.get(row.id);
    if (!translation?.name) continue;

    const cached: Omit<CachedExercise, 'id' | 'cachedAt'> = {
      wgerId: row.id,
      name: translation.name.trim(),
      description: stripHtml(translation.description ?? ''),
      categoryName: categoryMap.get(row.category) ?? '',
      primaryMuscles: mapIds(row.muscles, muscleMap),
      secondaryMuscles: mapIds(row.muscles_secondary, muscleMap),
      equipment: mapIds(row.equipment, equipmentMap),
    };

    insertExerciseCacheRow(cached, syncedAt);
    stored += 1;
  }

  setExerciseCacheSyncedAt(syncedAt);
  return stored;
}
