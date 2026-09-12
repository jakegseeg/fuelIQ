import { db } from './index.js';
import type {
  LoggedSet,
  PlanInput,
  WorkoutLog,
  WorkoutPlan,
  WorkoutPlanRecord,
  WorkoutType,
} from '../domain/workout.js';

export function updateActivePlanJson(userId: string, plan: WorkoutPlan): WorkoutPlanRecord | null {
  const active = db.get<{ id: number }>(
    'SELECT id FROM workout_plans WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1',
    [userId],
  );
  if (!active) return null;
  db.run(
    'UPDATE workout_plans SET plan_json = ? WHERE id = ? AND user_id = ?',
    [JSON.stringify(plan), active.id, userId],
  );
  return getActivePlan(userId);
}

// --- Plans ----------------------------------------------------------------

interface PlanRow {
  id: number;
  plan_json: string;
  input_json: string;
  source: string;
  created_at: string;
}

function rowToPlan(row: PlanRow): WorkoutPlanRecord {
  return {
    id: row.id,
    plan: JSON.parse(row.plan_json) as WorkoutPlan,
    input: JSON.parse(row.input_json) as PlanInput,
    source: row.source as 'claude' | 'local' | 'smart',
    createdAt: row.created_at,
  };
}

export function savePlan(
  userId: string,
  plan: WorkoutPlan,
  input: PlanInput,
  source: 'claude' | 'local' | 'smart',
): WorkoutPlanRecord {
  db.run('UPDATE workout_plans SET is_active = 0 WHERE user_id = ?', [userId]);
  db.run(
    'INSERT INTO workout_plans (user_id, plan_json, input_json, source, is_active) VALUES (?, ?, ?, ?, 1)',
    [userId, JSON.stringify(plan), JSON.stringify(input), source]
  );
  const row = db.get<PlanRow>(
    'SELECT * FROM workout_plans WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1',
    [userId]
  );
  return rowToPlan(row!);
}

export function getPlanById(userId: string, id: number): WorkoutPlanRecord | null {
  const row = db.get<PlanRow>(
    'SELECT * FROM workout_plans WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return row ? rowToPlan(row) : null;
}

export function getActivePlan(userId: string): WorkoutPlanRecord | null {
  const row = db.get<PlanRow>(
    'SELECT * FROM workout_plans WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1',
    [userId]
  );
  return row ? rowToPlan(row) : null;
}

// --- Logs -----------------------------------------------------------------

interface LogRow {
  id: number;
  log_date: string;
  focus: string;
  type: string;
  duration_min: number;
  calories_burned: number;
  sets_json: string;
  total_sets: number;
  created_at: string;
  notes?: string | null;
  log_source?: string | null;
}

function rowToLog(row: LogRow): WorkoutLog {
  return {
    id: row.id,
    date: row.log_date,
    focus: row.focus,
    type: row.type as WorkoutType,
    durationMin: row.duration_min,
    caloriesBurned: row.calories_burned,
    sets: JSON.parse(row.sets_json) as LoggedSet[],
    totalSets: row.total_sets,
    createdAt: row.created_at,
    notes: row.notes ?? null,
    logSource: (row.log_source as WorkoutLog['logSource']) ?? 'plan',
  };
}

export interface AddLogInput {
  date: string;
  focus: string;
  type: WorkoutType;
  durationMin: number;
  caloriesBurned: number;
  sets: LoggedSet[];
  notes?: string | null;
  logSource?: 'plan' | 'custom' | 'cardio';
}

export function addLog(userId: string, input: AddLogInput): WorkoutLog {
  db.run(
    `INSERT INTO workout_logs (user_id, log_date, focus, type, duration_min, calories_burned, sets_json, total_sets, notes, log_source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      input.date,
      input.focus,
      input.type,
      input.durationMin,
      input.caloriesBurned,
      JSON.stringify(input.sets),
      input.sets.length,
      input.notes ?? null,
      input.logSource ?? 'plan',
    ],
  );
  const row = db.get<LogRow>(
    'SELECT * FROM workout_logs WHERE user_id = ? AND log_date = ? ORDER BY created_at DESC LIMIT 1',
    [userId, input.date]
  );
  return rowToLog(row!);
}

export function getLog(userId: string, id: number): WorkoutLog | null {
  const row = db.get<LogRow>(
    'SELECT * FROM workout_logs WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return row ? rowToLog(row) : null;
}

export function listLogs(userId: string, limit = 100): WorkoutLog[] {
  const rows = db.all<LogRow>(
    'SELECT * FROM workout_logs WHERE user_id = ? ORDER BY log_date DESC, created_at DESC LIMIT ?',
    [userId, limit]
  );
  return rows.map(rowToLog);
}

export function caloriesBurnedForDate(userId: string, date: string): number {
  const row = db.get<{ total: number }>(
    'SELECT COALESCE(SUM(calories_burned), 0) AS total FROM workout_logs WHERE user_id = ? AND log_date = ?',
    [userId, date]
  );
  return Math.round(row?.total ?? 0);
}

export function deleteLog(userId: string, id: number): boolean {
  const existing = db.get<{ id: number }>(
    'SELECT id FROM workout_logs WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  if (!existing) return false;
  db.run('DELETE FROM workout_logs WHERE id = ? AND user_id = ?', [id, userId]);
  return true;
}

// --- History stats --------------------------------------------------------

export interface MuscleVolume {
  muscleGroup: string;
  volume: number;
  sets: number;
}

export interface PersonalRecord {
  exercise: string;
  weightKg: number;
  reps: number;
  date: string;
}

export interface WorkoutStats {
  totalSessions: number;
  weeklyStreak: number;
  thisWeekSessions: number;
  volumeByMuscle: MuscleVolume[];
  personalRecords: PersonalRecord[];
}

function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function computeStats(userId: string): WorkoutStats {
  const logs = listLogs(userId, 1000);

  const thisWeek = isoWeekKey(new Date());
  const volMap = new Map<string, { volume: number; sets: number }>();
  let thisWeekSessions = 0;
  for (const log of logs) {
    if (isoWeekKey(new Date(log.date + 'T00:00:00')) !== thisWeek) continue;
    thisWeekSessions++;
    for (const s of log.sets) {
      const vol = s.weightKg * s.reps;
      for (const mg of s.muscleGroups.length ? s.muscleGroups : ['Other']) {
        const cur = volMap.get(mg) ?? { volume: 0, sets: 0 };
        cur.volume += vol;
        cur.sets += 1;
        volMap.set(mg, cur);
      }
    }
  }
  const volumeByMuscle: MuscleVolume[] = [...volMap.entries()]
    .map(([muscleGroup, v]) => ({ muscleGroup, volume: Math.round(v.volume), sets: v.sets }))
    .sort((a, b) => b.volume - a.volume);

  const prMap = new Map<string, PersonalRecord>();
  for (const log of logs) {
    for (const s of log.sets) {
      const cur = prMap.get(s.exercise);
      if (!cur || s.weightKg > cur.weightKg) {
        prMap.set(s.exercise, {
          exercise: s.exercise,
          weightKg: s.weightKg,
          reps: s.reps,
          date: log.date,
        });
      }
    }
  }
  const personalRecords = [...prMap.values()]
    .filter((p) => p.weightKg > 0)
    .sort((a, b) => b.weightKg - a.weightKg);

  const weeksWithSessions = new Set(logs.map((l) => isoWeekKey(new Date(l.date + 'T00:00:00'))));
  let streak = 0;
  const cursor = new Date();
  if (!weeksWithSessions.has(isoWeekKey(cursor))) cursor.setDate(cursor.getDate() - 7);
  while (weeksWithSessions.has(isoWeekKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }

  return {
    totalSessions: logs.length,
    weeklyStreak: streak,
    thisWeekSessions,
    volumeByMuscle,
    personalRecords,
  };
}