import { db } from './index.js';

export interface WeightPoint {
  date: string;
  weightKg: number;
}

export interface DailyNutrition {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  avgFuel: number;
  entries: number;
}

// --- Weight ---------------------------------------------------------------

export function addWeight(userId: string, date: string, weightKg: number): WeightPoint {
  const existing = db.get<{ id: number }>(
    'SELECT id FROM weight_logs WHERE user_id = ? AND log_date = ?',
    [userId, date]
  );
  if (existing) {
    db.run(
      "UPDATE weight_logs SET weight_kg = ?, created_at = datetime('now') WHERE user_id = ? AND log_date = ?",
      [weightKg, userId, date]
    );
  } else {
    db.run(
      'INSERT INTO weight_logs (user_id, log_date, weight_kg) VALUES (?, ?, ?)',
      [userId, date, weightKg]
    );
  }
  return { date, weightKg };
}

export function weightSeries(userId: string, sinceISO: string | null): WeightPoint[] {
  if (sinceISO) {
    return db.all<WeightPoint>(
      'SELECT log_date AS date, weight_kg AS weightKg FROM weight_logs WHERE user_id = ? AND log_date >= ? ORDER BY log_date ASC',
      [userId, sinceISO]
    );
  }
  return db.all<WeightPoint>(
    'SELECT log_date AS date, weight_kg AS weightKg FROM weight_logs WHERE user_id = ? ORDER BY log_date ASC',
    [userId]
  );
}

export function latestWeight(userId: string): WeightPoint | null {
  const row = db.get<WeightPoint>(
    'SELECT log_date AS date, weight_kg AS weightKg FROM weight_logs WHERE user_id = ? ORDER BY log_date DESC LIMIT 1',
    [userId]
  );
  return row ?? null;
}

// --- Nutrition aggregations ----------------------------------------------

export function dailyNutrition(userId: string, sinceISO: string): DailyNutrition[] {
  return db.all<DailyNutrition>(
    `SELECT log_date AS date,
            ROUND(SUM(calories)) AS calories,
            ROUND(SUM(protein) * 10) / 10 AS protein,
            ROUND(SUM(carbs) * 10) / 10 AS carbs,
            ROUND(SUM(fat) * 10) / 10 AS fat,
            ROUND(AVG(fuel_score) * 10) / 10 AS avgFuel,
            COUNT(*) AS entries
       FROM food_log_entries
      WHERE user_id = ? AND log_date >= ?
      GROUP BY log_date
      ORDER BY log_date ASC`,
    [userId, sinceISO]
  );
}

export function loggedDates(userId: string): Set<string> {
  const rows = db.all<{ log_date: string }>(
    'SELECT DISTINCT log_date FROM food_log_entries WHERE user_id = ?',
    [userId]
  );
  return new Set(rows.map((r) => r.log_date));
}

// --- Insights & check-ins cache ------------------------------------------

export function getInsight(userId: string, date: string): { content: string; source: string } | null {
  const row = db.get<{ content: string; source: string }>(
    'SELECT content, source FROM daily_insights WHERE user_id = ? AND log_date = ?',
    [userId, date]
  );
  return row ?? null;
}

export function saveInsight(userId: string, date: string, content: string, source: string): void {
  const existing = db.get<{ id: number }>(
    'SELECT id FROM daily_insights WHERE user_id = ? AND log_date = ?',
    [userId, date]
  );
  if (existing) {
    db.run(
      'UPDATE daily_insights SET content = ?, source = ? WHERE user_id = ? AND log_date = ?',
      [content, source, userId, date]
    );
  } else {
    db.run(
      'INSERT INTO daily_insights (user_id, log_date, content, source) VALUES (?, ?, ?, ?)',
      [userId, date, content, source]
    );
  }
}

export interface CheckinRecord {
  weekStart: string;
  content: string;
  source: string;
  createdAt: string;
}

export function getCheckin(userId: string, weekStart: string): CheckinRecord | null {
  const row = db.get<CheckinRecord>(
    'SELECT week_start AS weekStart, content, source, created_at AS createdAt FROM weekly_checkins WHERE user_id = ? AND week_start = ?',
    [userId, weekStart]
  );
  return row ?? null;
}

export function latestCheckin(userId: string): CheckinRecord | null {
  const row = db.get<CheckinRecord>(
    'SELECT week_start AS weekStart, content, source, created_at AS createdAt FROM weekly_checkins WHERE user_id = ? ORDER BY week_start DESC LIMIT 1',
    [userId]
  );
  return row ?? null;
}

export function saveCheckin(userId: string, weekStart: string, content: string, source: string): CheckinRecord {
  const existing = db.get<{ id: number }>(
    'SELECT id FROM weekly_checkins WHERE user_id = ? AND week_start = ?',
    [userId, weekStart]
  );
  if (existing) {
    db.run(
      "UPDATE weekly_checkins SET content = ?, source = ?, created_at = datetime('now') WHERE user_id = ? AND week_start = ?",
      [content, source, userId, weekStart]
    );
  } else {
    db.run(
      'INSERT INTO weekly_checkins (user_id, week_start, content, source) VALUES (?, ?, ?, ?)',
      [userId, weekStart, content, source]
    );
  }
  return getCheckin(userId, weekStart)!;
}