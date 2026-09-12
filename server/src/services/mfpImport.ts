/** Parse MyFitnessPal CSV export and map to food log entries (spec 7.4). */
import { computeFuelScore } from '../domain/fuelscore.js';
import { addEntry, type LogEntryInput } from '../db/logRepo.js';
import type { MealSlot } from '../domain/food.js';

export interface MfpImportResult {
  imported: number;
  skipped: number;
  dateRange: { from: string | null; to: string | null };
  avgFuelScore: number | null;
  errors: string[];
}

const MEAL_MAP: Record<string, MealSlot> = {
  breakfast: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner',
  snacks: 'snacks',
  snack: 'snacks',
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function parseMfpDate(raw: string): string | null {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, mo, da, yr] = mdy;
    return `${yr}-${mo.padStart(2, '0')}-${da.padStart(2, '0')}`;
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return null;
}

export function importMfpCsv(userId: string, csvText: string): MfpImportResult {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  const result: MfpImportResult = {
    imported: 0,
    skipped: 0,
    dateRange: { from: null, to: null },
    avgFuelScore: null,
    errors: [],
  };
  if (lines.length < 2) {
    result.errors.push('CSV must include a header row and at least one data row.');
    return result;
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const idx = (names: string[]) => headers.findIndex((h) => names.some((n) => h.includes(n)));

  const dateCol = idx(['date']);
  const mealCol = idx(['meal']);
  const foodCol = idx(['food']);
  const calCol = idx(['calories', 'calorie']);
  const proteinCol = idx(['protein']);
  const carbsCol = idx(['carbohydrates', 'carbs', 'carbohydrate']);
  const fatCol = idx(['fat', 'total_fat']);
  const fiberCol = idx(['fiber', 'dietary_fiber']);

  if (dateCol < 0 || foodCol < 0 || calCol < 0) {
    result.errors.push('Could not find Date, Food, and Calories columns in the CSV header.');
    return result;
  }

  const fuelScores: number[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.every((c) => !c)) continue;

    const date = parseMfpDate(cols[dateCol] ?? '');
    const foodName = (cols[foodCol] ?? '').trim();
    const calories = Number(cols[calCol]) || 0;

    if (!date || !foodName || calories <= 0) {
      result.skipped++;
      continue;
    }

    const mealRaw = (mealCol >= 0 ? cols[mealCol] : 'snacks')?.toLowerCase() ?? 'snacks';
    const meal = MEAL_MAP[mealRaw.replace(/[^a-z]/g, '')] ?? 'snacks';

    const protein = proteinCol >= 0 ? Number(cols[proteinCol]) || 0 : 0;
    const carbs = carbsCol >= 0 ? Number(cols[carbsCol]) || 0 : 0;
    const fat = fatCol >= 0 ? Number(cols[fatCol]) || 0 : 0;
    const fiber = fiberCol >= 0 ? Number(cols[fiberCol]) || null : null;

    // MFP rows are per serving; assume ~100g equivalent for per-100g storage.
    const quantityG = 100;
    const per100 = {
      calories: calories,
      protein: protein,
      carbs: carbs,
      fat: fat,
      fiber,
      sugars: null,
      addedSugars: null,
      satFat: null,
      sodium: null,
    };

    const fuel = computeFuelScore({ per100, novaGroup: null, micronutrientCount: 0 });
    fuelScores.push(fuel.score);

    const input: LogEntryInput = {
      date,
      meal,
      source: 'custom',
      name: foodName,
      brand: 'MyFitnessPal import',
      barcode: null,
      servingLabel: '1 serving (imported)',
      quantityG,
      per100,
      novaGroup: null,
      micronutrientCount: 0,
    };

    try {
      addEntry(userId, input);
      result.imported++;
      if (!result.dateRange.from || date < result.dateRange.from) result.dateRange.from = date;
      if (!result.dateRange.to || date > result.dateRange.to) result.dateRange.to = date;
    } catch {
      result.skipped++;
    }
  }

  if (fuelScores.length) {
    result.avgFuelScore =
      Math.round((fuelScores.reduce((s, f) => s + f, 0) / fuelScores.length) * 10) / 10;
  }

  return result;
}
