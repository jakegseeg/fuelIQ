/**
 * Shared domain types for FuelIQ profiles.
 *
 * Canonical storage is always metric (kg, cm). Unit preferences only affect
 * how values are displayed/entered on the client.
 */

import type { FitnessLevel, Equipment } from './workout.js';
import type { WorkoutSchedulePreferences } from './workoutSchedule.js';

export type BiologicalSex = 'male' | 'female' | 'unspecified';

export type Goal =
  | 'lose_fat'
  | 'maintain'
  | 'build_muscle'
  | 'endurance'
  | 'recomp';

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'very'
  | 'athlete';

export type DietaryPreference =
  | 'none'
  | 'vegetarian'
  | 'vegan'
  | 'gluten_free'
  | 'dairy_free'
  | 'keto'
  | 'halal'
  | 'kosher'
  | 'nut_allergy';

export type WeightUnit = 'lbs' | 'kg';
export type HeightUnit = 'imperial' | 'metric';
export type EnergyUnit = 'kcal' | 'kj';

export interface UnitPreferences {
  weight: WeightUnit;
  height: HeightUnit;
  energy: EnergyUnit;
}

/** Profile data collected during onboarding (the editable source of truth). */
export interface ProfileInput {
  firstName: string;
  dateOfBirth: string; // ISO date (YYYY-MM-DD)
  biologicalSex: BiologicalSex;
  heightCm: number; // canonical
  weightKg: number; // canonical
  goal: Goal;
  activityLevel: ActivityLevel;
  dietaryPreferences: DietaryPreference[];
  customDietary: string | null;
  targetWeightKg: number | null;
  targetDate: string | null; // ISO date
  units: UnitPreferences;
}

/** Computed nutrition targets derived from a ProfileInput. */
export interface NutritionTargets {
  age: number;
  bmr: number; // kcal/day (Mifflin-St Jeor)
  tdee: number; // kcal/day
  activityMultiplier: number;
  calorieTarget: number; // kcal/day, goal-adjusted
  macros: {
    proteinG: number;
    fatG: number;
    carbsG: number;
    proteinKcal: number;
    fatKcal: number;
    carbsKcal: number;
  };
  /** Estimated weekly weight change in kg implied by the calorie target. */
  projectedWeeklyChangeKg: number;
}

/** Full profile as returned by the API. */
export interface Profile extends ProfileInput {
  id: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
  targets: NutritionTargets;
  workoutSchedule: WorkoutSchedulePreferences | null;
  /** Ingredients the user already owns (grocery pantry). */
  pantry: string[];
  /** Saved workout generation preferences (Chunk B). */
  preferredWorkoutDuration: number;
  equipmentAvailable: Equipment[];
  fitnessLevel: FitnessLevel;
}
