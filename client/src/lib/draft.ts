import type {
  ActivityLevel,
  BiologicalSex,
  DietaryPreference,
  EnergyUnit,
  Goal,
  HeightUnit,
  Profile,
  ProfileInput,
  WeightUnit,
} from './types';
import { GOALS_WITH_TARGET } from './options';

/**
 * Working draft for the onboarding wizard and profile editor. Canonical
 * height/weight are stored in metric; the active units only affect display.
 */
export interface ProfileDraft {
  firstName: string;
  dateOfBirth: string;
  biologicalSex: BiologicalSex | '';
  heightCm: number | null;
  weightKg: number | null;
  goal: Goal | null;
  activityLevel: ActivityLevel | null;
  dietaryPreferences: DietaryPreference[];
  customDietary: string;
  targetWeightKg: number | null;
  targetDate: string;
  unitWeight: WeightUnit;
  unitHeight: HeightUnit;
  unitEnergy: EnergyUnit;
}

export function emptyDraft(): ProfileDraft {
  return {
    firstName: '',
    dateOfBirth: '',
    biologicalSex: '',
    heightCm: null,
    weightKg: null,
    goal: null,
    activityLevel: null,
    dietaryPreferences: [],
    customDietary: '',
    targetWeightKg: null,
    targetDate: '',
    unitWeight: 'lbs',
    unitHeight: 'imperial',
    unitEnergy: 'kcal',
  };
}

export function draftFromProfile(p: Profile): ProfileDraft {
  return {
    firstName: p.firstName,
    dateOfBirth: p.dateOfBirth,
    biologicalSex: p.biologicalSex,
    heightCm: p.heightCm,
    weightKg: p.weightKg,
    goal: p.goal,
    activityLevel: p.activityLevel,
    dietaryPreferences: p.dietaryPreferences,
    customDietary: p.customDietary ?? '',
    targetWeightKg: p.targetWeightKg,
    targetDate: p.targetDate ?? '',
    unitWeight: p.units.weight,
    unitHeight: p.units.height,
    unitEnergy: p.units.energy,
  };
}

/** Convert a draft into the API payload (only valid once required fields set). */
export function draftToInput(d: ProfileDraft): ProfileInput {
  const showsTarget = d.goal != null && GOALS_WITH_TARGET.includes(d.goal);
  return {
    firstName: d.firstName.trim(),
    dateOfBirth: d.dateOfBirth,
    biologicalSex: (d.biologicalSex || 'unspecified') as BiologicalSex,
    heightCm: d.heightCm ?? 0,
    weightKg: d.weightKg ?? 0,
    goal: (d.goal ?? 'maintain') as Goal,
    activityLevel: (d.activityLevel ?? 'sedentary') as ActivityLevel,
    dietaryPreferences: d.dietaryPreferences,
    customDietary: d.dietaryPreferences.includes('none')
      ? null
      : d.customDietary.trim() || null,
    targetWeightKg: showsTarget ? d.targetWeightKg : null,
    targetDate: showsTarget && d.targetDate ? d.targetDate : null,
    units: { weight: d.unitWeight, height: d.unitHeight, energy: d.unitEnergy },
  };
}

export type StepErrors = Record<string, string>;

/** Validate a single wizard step. Returns a map of field -> error message. */
export function validateStep(step: number, d: ProfileDraft): StepErrors {
  const errors: StepErrors = {};
  if (step === 1) {
    if (!d.firstName.trim()) errors.firstName = 'First name is required.';
    if (!d.dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required.';
    } else if (new Date(d.dateOfBirth + 'T00:00:00') >= new Date()) {
      errors.dateOfBirth = 'Date of birth must be in the past.';
    }
    if (!d.biologicalSex) errors.biologicalSex = 'Please choose an option.';
    if (!d.heightCm || d.heightCm <= 0) errors.heightCm = 'Height is required.';
    if (!d.weightKg || d.weightKg <= 0) errors.weightKg = 'Weight is required.';
  }
  if (step === 2 && !d.goal) errors.goal = 'Pick a goal to continue.';
  if (step === 3 && !d.activityLevel) {
    errors.activityLevel = 'Select your activity level.';
  }
  if (step === 4 && d.dietaryPreferences.length === 0) {
    errors.dietaryPreferences = 'Select at least one (choose "No restrictions" if none).';
  }
  return errors;
}
