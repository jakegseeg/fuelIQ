import type {
  ActivityLevel,
  BiologicalSex,
  DietaryPreference,
  Goal,
} from './types';

export const SEX_OPTIONS: { value: BiologicalSex; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'unspecified', label: 'Prefer not to say' },
];

export const GOAL_OPTIONS: {
  value: Goal;
  label: string;
  description: string;
}[] = [
  { value: 'lose_fat', label: 'Lose fat', description: 'Trim body fat while keeping muscle.' },
  { value: 'maintain', label: 'Maintain weight', description: 'Hold steady at your current weight.' },
  { value: 'build_muscle', label: 'Build muscle', description: 'Add lean mass with a calorie surplus.' },
  { value: 'endurance', label: 'Improve endurance', description: 'Fuel longer, harder training.' },
  { value: 'recomp', label: 'Recomp', description: 'Lose fat and gain muscle together.' },
];

export const ACTIVITY_OPTIONS: {
  value: ActivityLevel;
  label: string;
  description: string;
}[] = [
  { value: 'sedentary', label: 'Sedentary', description: 'Desk job, little or no exercise.' },
  { value: 'light', label: 'Lightly active', description: '1–3 workouts per week.' },
  { value: 'moderate', label: 'Moderately active', description: '3–5 workouts per week.' },
  { value: 'very', label: 'Very active', description: '6–7 workouts per week.' },
  { value: 'athlete', label: 'Athlete', description: '2× daily training or a physical job.' },
];

export const DIETARY_OPTIONS: { value: DietaryPreference; label: string }[] = [
  { value: 'none', label: 'No restrictions' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten_free', label: 'Gluten-free' },
  { value: 'dairy_free', label: 'Dairy-free' },
  { value: 'keto', label: 'Keto / Low-carb' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Kosher' },
  { value: 'nut_allergy', label: 'Nut allergy' },
];

export const GOAL_LABELS = Object.fromEntries(
  GOAL_OPTIONS.map((g) => [g.value, g.label]),
) as Record<Goal, string>;

export const ACTIVITY_LABELS = Object.fromEntries(
  ACTIVITY_OPTIONS.map((a) => [a.value, a.label]),
) as Record<ActivityLevel, string>;

export const DIETARY_LABELS = Object.fromEntries(
  DIETARY_OPTIONS.map((d) => [d.value, d.label]),
) as Record<DietaryPreference, string>;

/** Goals that unlock the optional target-weight step. */
export const GOALS_WITH_TARGET: Goal[] = ['lose_fat', 'build_muscle'];
