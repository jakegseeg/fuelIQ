/**
 * TDEE & macro calculation engine (spec section 1.3).
 *
 * All inputs are canonical metric (kg / cm); energy is kcal.
 */
import type {
  ActivityLevel,
  Goal,
  NutritionTargets,
  ProfileInput,
} from './types.js';

export const KCAL_PER_KG_FAT = 7700; // ~kcal stored per kg of body mass
export const KG_PER_LB = 0.45359237;
export const CM_PER_INCH = 2.54;

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  athlete: 1.9,
};

/** Goal -> daily kcal delta applied to TDEE. */
export const GOAL_CALORIE_DELTA: Record<Goal, number> = {
  lose_fat: -500,
  maintain: 0,
  build_muscle: 250,
  recomp: -100,
  endurance: 150,
};

/** Goal -> grams of protein per lb of bodyweight (0.8–1.2 g/lb). */
export const GOAL_PROTEIN_PER_LB: Record<Goal, number> = {
  lose_fat: 1.0,
  maintain: 0.8,
  build_muscle: 1.2,
  recomp: 1.2,
  endurance: 1.0,
};

/** Goal -> share of calories from fat (kept within the 25–35% band). */
export const GOAL_FAT_PERCENT: Record<Goal, number> = {
  lose_fat: 0.3,
  maintain: 0.3,
  build_muscle: 0.25,
  recomp: 0.3,
  endurance: 0.25,
};

/** Whole, completed years between a date of birth and a reference date. */
export function calculateAge(dateOfBirth: string, now: Date = new Date()): number {
  const dob = new Date(dateOfBirth + 'T00:00:00');
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

/**
 * Mifflin-St Jeor basal metabolic rate.
 *   Male:   (10 × kg) + (6.25 × cm) − (5 × age) + 5
 *   Female: (10 × kg) + (6.25 × cm) − (5 × age) − 161
 * For "prefer not to say" we average the male/female constants (+5 and −161).
 */
export function calculateBmr(
  sex: ProfileInput['biologicalSex'],
  weightKg: number,
  heightCm: number,
  age: number,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const constant = sex === 'male' ? 5 : sex === 'female' ? -161 : (5 + -161) / 2;
  return base + constant;
}

/** Compute the full set of nutrition targets for a profile. */
export function computeTargets(
  profile: ProfileInput,
  now: Date = new Date(),
): NutritionTargets {
  const age = calculateAge(profile.dateOfBirth, now);
  const bmr = calculateBmr(profile.biologicalSex, profile.weightKg, profile.heightCm, age);

  const activityMultiplier = ACTIVITY_MULTIPLIERS[profile.activityLevel];
  const tdee = bmr * activityMultiplier;

  const calorieTarget = Math.max(1200, tdee + GOAL_CALORIE_DELTA[profile.goal]);

  // Protein: grams per lb of current bodyweight.
  const weightLbs = profile.weightKg / KG_PER_LB;
  const proteinG = round(GOAL_PROTEIN_PER_LB[profile.goal] * weightLbs);
  const proteinKcal = proteinG * 4;

  // Fat: percentage of total calories, then grams (9 kcal/g).
  const fatKcal = calorieTarget * GOAL_FAT_PERCENT[profile.goal];
  const fatG = round(fatKcal / 9);

  // Carbs: remaining calories (4 kcal/g), never negative.
  const carbsKcal = Math.max(0, calorieTarget - proteinKcal - fatG * 9);
  const carbsG = round(carbsKcal / 4);

  // Implied weekly change: daily kcal delta vs maintenance -> kg/week.
  const dailyDelta = calorieTarget - tdee;
  const projectedWeeklyChangeKg = round((dailyDelta * 7) / KCAL_PER_KG_FAT, 3);

  return {
    age,
    bmr: round(bmr),
    tdee: round(tdee),
    activityMultiplier,
    calorieTarget: round(calorieTarget),
    macros: {
      proteinG,
      fatG,
      carbsG,
      proteinKcal: round(proteinKcal),
      fatKcal: round(fatG * 9),
      carbsKcal: round(carbsG * 4),
    },
    projectedWeeklyChangeKg,
  };
}

function round(n: number, decimals = 0): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

// Unit conversion helpers (handy for the client and tests).
export const lbsToKg = (lbs: number) => lbs * KG_PER_LB;
export const kgToLbs = (kg: number) => kg / KG_PER_LB;
export const inchesToCm = (inches: number) => inches * CM_PER_INCH;
export const cmToInches = (cm: number) => cm / CM_PER_INCH;
