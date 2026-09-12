// Mirrors server/src/domain/types.ts (kept in sync manually for the chunk-1 MVP).

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

export interface ProfileInput {
  firstName: string;
  dateOfBirth: string;
  biologicalSex: BiologicalSex;
  heightCm: number;
  weightKg: number;
  goal: Goal;
  activityLevel: ActivityLevel;
  dietaryPreferences: DietaryPreference[];
  customDietary: string | null;
  targetWeightKg: number | null;
  targetDate: string | null;
  units: UnitPreferences;
}

export interface NutritionTargets {
  age: number;
  bmr: number;
  tdee: number;
  activityMultiplier: number;
  calorieTarget: number;
  macros: {
    proteinG: number;
    fatG: number;
    carbsG: number;
    proteinKcal: number;
    fatKcal: number;
    carbsKcal: number;
  };
  projectedWeeklyChangeKg: number;
}

import type { WorkoutSchedulePreferences } from './workoutTypes';

export interface Profile extends ProfileInput {
  id: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
  targets: NutritionTargets;
  workoutSchedule?: WorkoutSchedulePreferences | null;
  pantry?: string[];
  preferredWorkoutDuration?: number;
  equipmentAvailable?: import('./workoutTypes').Equipment[];
  fitnessLevel?: import('./workoutTypes').FitnessLevel;
}

export interface ProgressPhoto {
  id: number;
  url: string;
  weightKg: number | null;
  takenAt: string;
}
