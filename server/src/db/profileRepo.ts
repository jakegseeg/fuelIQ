/** Persistence + mapping for user profiles. */
import { db } from './index.js';
import { computeTargets } from '../domain/calculations.js';
import { normalizePantryTerm } from '../domain/pantryMatch.js';
import type { Profile, ProfileInput } from '../domain/types.js';
import type { WorkoutSchedulePreferences } from '../domain/workoutSchedule.js';
import type { Equipment, FitnessLevel } from '../domain/workout.js';
 
interface ProfileRow {
  id: number;
  user_id: string;
  first_name: string;
  date_of_birth: string;
  biological_sex: string;
  height_cm: number;
  weight_kg: number;
  goal: string;
  activity_level: string;
  dietary_preferences: string;
  custom_dietary: string | null;
  target_weight_kg: number | null;
  target_date: string | null;
  unit_weight: string;
  unit_height: string;
  unit_energy: string;
  created_at: string;
  updated_at: string;
  workout_schedule_json: string | null;
  pantry_json: string | null;
  preferred_workout_duration: number | null;
  equipment_available: string | null;
  fitness_level: string | null;
}
 
function rowToProfile(row: ProfileRow): Profile {
  const input: ProfileInput = {
    firstName: row.first_name,
    dateOfBirth: row.date_of_birth,
    biologicalSex: row.biological_sex as ProfileInput['biologicalSex'],
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    goal: row.goal as ProfileInput['goal'],
    activityLevel: row.activity_level as ProfileInput['activityLevel'],
    dietaryPreferences: JSON.parse(row.dietary_preferences),
    customDietary: row.custom_dietary,
    targetWeightKg: row.target_weight_kg,
    targetDate: row.target_date,
    units: {
      weight: row.unit_weight as ProfileInput['units']['weight'],
      height: row.unit_height as ProfileInput['units']['height'],
      energy: row.unit_energy as ProfileInput['units']['energy'],
    },
  };
 
  let workoutSchedule: WorkoutSchedulePreferences | null = null;
  if (row.workout_schedule_json) {
    try {
      workoutSchedule = JSON.parse(row.workout_schedule_json) as WorkoutSchedulePreferences;
    } catch {
      workoutSchedule = null;
    }
  }

  let pantry: string[] = [];
  if (row.pantry_json) {
    try {
      const parsed = JSON.parse(row.pantry_json) as unknown;
      pantry = Array.isArray(parsed)
        ? parsed.filter((s): s is string => typeof s === 'string').map(normalizePantryTerm)
        : [];
    } catch {
      pantry = [];
    }
  }

  return {
    ...input,
    id: row.id,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    targets: computeTargets(input),
    workoutSchedule,
    pantry,
    preferredWorkoutDuration: row.preferred_workout_duration ?? 45,
    equipmentAvailable: parseEquipmentAvailable(row.equipment_available),
    fitnessLevel: (row.fitness_level as FitnessLevel) ?? 'intermediate',
  };
}

function parseEquipmentAvailable(raw: string | null): Equipment[] {
  if (!raw) return ['full_gym'];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? (parsed.filter((v): v is Equipment => typeof v === 'string') as Equipment[])
      : ['full_gym'];
  } catch {
    return ['full_gym'];
  }
}
 
export function getProfile(userId: string): Profile | null {
  const row = db.get<ProfileRow>(
    'SELECT * FROM user_profiles WHERE user_id = ?',
    [userId]
  );
  return row ? rowToProfile(row) : null;
}
 
export function upsertProfile(userId: string, input: ProfileInput): Profile {
  const targets = computeTargets(input);
  const dietaryJson = JSON.stringify(input.dietaryPreferences);
 
  // Check if profile exists
  const existing = db.get<{ id: number }>(
    'SELECT id FROM user_profiles WHERE user_id = ?',
    [userId]
  );
 
  if (existing) {
    db.run(
      `UPDATE user_profiles SET
         first_name = ?, date_of_birth = ?, biological_sex = ?,
         height_cm = ?, weight_kg = ?, goal = ?, activity_level = ?,
         dietary_preferences = ?, custom_dietary = ?,
         target_weight_kg = ?, target_date = ?,
         unit_weight = ?, unit_height = ?, unit_energy = ?,
         bmr = ?, tdee = ?, calorie_target = ?,
         protein_g = ?, fat_g = ?, carbs_g = ?,
         updated_at = datetime('now')
       WHERE user_id = ?`,
      [
        input.firstName, input.dateOfBirth, input.biologicalSex,
        input.heightCm, input.weightKg, input.goal, input.activityLevel,
        dietaryJson, input.customDietary ?? null,
        input.targetWeightKg ?? null, input.targetDate ?? null,
        input.units.weight, input.units.height, input.units.energy,
        targets.bmr, targets.tdee, targets.calorieTarget,
        targets.macros.proteinG, targets.macros.fatG, targets.macros.carbsG,
        userId,
      ]
    );
  } else {
    db.run(
      `INSERT INTO user_profiles (
         user_id, first_name, date_of_birth, biological_sex, height_cm, weight_kg,
         goal, activity_level, dietary_preferences, custom_dietary,
         target_weight_kg, target_date, unit_weight, unit_height, unit_energy,
         bmr, tdee, calorie_target, protein_g, fat_g, carbs_g, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        userId, input.firstName, input.dateOfBirth, input.biologicalSex,
        input.heightCm, input.weightKg, input.goal, input.activityLevel,
        dietaryJson, input.customDietary ?? null,
        input.targetWeightKg ?? null, input.targetDate ?? null,
        input.units.weight, input.units.height, input.units.energy,
        targets.bmr, targets.tdee, targets.calorieTarget,
        targets.macros.proteinG, targets.macros.fatG, targets.macros.carbsG,
      ]
    );
  }
 
  const saved = getProfile(userId);
  if (!saved) throw new Error('Failed to persist profile');
  return saved;
}
 
export function getWorkoutSchedule(userId: string): WorkoutSchedulePreferences | null {
  const row = db.get<{ workout_schedule_json: string | null }>(
    'SELECT workout_schedule_json FROM user_profiles WHERE user_id = ?',
    [userId],
  );
  if (!row?.workout_schedule_json) return null;
  try {
    return JSON.parse(row.workout_schedule_json) as WorkoutSchedulePreferences;
  } catch {
    return null;
  }
}

export function saveWorkoutSchedule(
  userId: string,
  schedule: WorkoutSchedulePreferences,
): WorkoutSchedulePreferences {
  const existing = db.get<{ id: number }>(
    'SELECT id FROM user_profiles WHERE user_id = ?',
    [userId],
  );
  if (!existing) throw new Error('Profile required before saving workout schedule');
  db.run(
    "UPDATE user_profiles SET workout_schedule_json = ?, updated_at = datetime('now') WHERE user_id = ?",
    [JSON.stringify(schedule), userId],
  );
  return schedule;
}

export function saveWorkoutPreferences(
  userId: string,
  prefs: {
    preferredWorkoutDuration: number;
    equipmentAvailable: Equipment[];
    fitnessLevel: FitnessLevel;
  },
): void {
  const existing = db.get<{ id: number }>(
    'SELECT id FROM user_profiles WHERE user_id = ?',
    [userId],
  );
  if (!existing) throw new Error('Profile required before saving workout preferences');
  db.run(
    `UPDATE user_profiles SET
      preferred_workout_duration = ?,
      equipment_available = ?,
      fitness_level = ?,
      updated_at = datetime('now')
     WHERE user_id = ?`,
    [
      prefs.preferredWorkoutDuration,
      JSON.stringify(prefs.equipmentAvailable),
      prefs.fitnessLevel,
      userId,
    ],
  );
}

export function getPantry(userId: string): string[] {
  const profile = getProfile(userId);
  return profile?.pantry ?? [];
}

export function savePantry(userId: string, pantry: string[]): string[] {
  const existing = db.get<{ id: number }>(
    'SELECT id FROM user_profiles WHERE user_id = ?',
    [userId],
  );
  if (!existing) throw new Error('Profile required before saving pantry');

  const normalized = [...new Set(pantry.map(normalizePantryTerm).filter(Boolean))];
  db.run(
    "UPDATE user_profiles SET pantry_json = ?, updated_at = datetime('now') WHERE user_id = ?",
    [JSON.stringify(normalized), userId],
  );
  return normalized;
}

export function updateWeightKg(userId: string, weightKg: number): Profile | null {
  const existing = db.get<{ id: number }>(
    'SELECT id FROM user_profiles WHERE user_id = ?',
    [userId]
  );
  if (!existing) return null;
  db.run(
    "UPDATE user_profiles SET weight_kg = ?, updated_at = datetime('now') WHERE user_id = ?",
    [weightKg, userId]
  );
  return getProfile(userId);
}
 
export interface PhotoRow {
  id: number;
  user_id: string;
  filename: string;
  weight_kg: number | null;
  taken_at: string;
}
 
export function addPhoto(userId: string, filename: string, weightKg: number | null): PhotoRow {
  db.run(
    'INSERT INTO progress_photos (user_id, filename, weight_kg) VALUES (?, ?, ?)',
    [userId, filename, weightKg]
  );
  const row = db.get<PhotoRow>(
    'SELECT * FROM progress_photos WHERE user_id = ? ORDER BY taken_at DESC LIMIT 1',
    [userId]
  );
  return row!;
}
 
export function listPhotos(userId: string): PhotoRow[] {
  return db.all<PhotoRow>(
    'SELECT * FROM progress_photos WHERE user_id = ? ORDER BY taken_at DESC',
    [userId]
  );
}