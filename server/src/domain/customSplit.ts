import type { WorkoutPlan } from './workout.js';

export const MUSCLE_GROUP_OPTIONS = [
  'Chest',
  'Triceps',
  'Shoulders',
  'Back',
  'Biceps',
  'Legs',
  'Glutes',
  'Hamstrings',
  'Core',
  'Cardio',
  'Full Body',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUP_OPTIONS)[number];

export const SPLIT_PRESETS = [
  'push_pull_legs',
  'upper_lower',
  'bro_split',
  'full_body_3x',
  'custom',
] as const;

export type SplitPreset = (typeof SPLIT_PRESETS)[number];

export const WEEK_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export interface CustomSplitDayConfig {
  day: string;
  rest: boolean;
  muscleGroups: MuscleGroup[];
  durationMin?: number;
}

export interface CustomSplitConfig {
  days: CustomSplitDayConfig[];
  defaultDurationMin: 20 | 30 | 45 | 60 | 90;
  preset?: SplitPreset;
}

export interface CustomSplitData {
  config: CustomSplitConfig;
  generatedPlan: WorkoutPlan | null;
}

export interface CustomSplitRecord {
  id: number;
  split: CustomSplitData;
  createdAt: string;
}

export function emptyWeekConfig(defaultDurationMin = 45): CustomSplitDayConfig[] {
  return WEEK_DAYS.map((day) => ({
    day,
    rest: day === 'Sunday',
    muscleGroups: [],
  }));
}

export function applySplitPreset(preset: SplitPreset, defaultDurationMin = 45): CustomSplitDayConfig[] {
  const rest = (day: string): CustomSplitDayConfig => ({
    day,
    rest: true,
    muscleGroups: [],
  });
  const train = (day: string, muscleGroups: MuscleGroup[]): CustomSplitDayConfig => ({
    day,
    rest: false,
    muscleGroups,
  });

  switch (preset) {
    case 'push_pull_legs':
      return [
        train('Monday', ['Chest', 'Triceps', 'Shoulders']),
        train('Tuesday', ['Back', 'Biceps']),
        train('Wednesday', ['Legs', 'Glutes', 'Hamstrings']),
        train('Thursday', ['Chest', 'Triceps', 'Shoulders']),
        train('Friday', ['Back', 'Biceps']),
        train('Saturday', ['Legs', 'Glutes', 'Hamstrings']),
        rest('Sunday'),
      ];
    case 'upper_lower':
      return [
        train('Monday', ['Chest', 'Back', 'Shoulders', 'Triceps', 'Biceps']),
        train('Tuesday', ['Legs', 'Glutes', 'Hamstrings']),
        rest('Wednesday'),
        train('Thursday', ['Chest', 'Back', 'Shoulders', 'Triceps', 'Biceps']),
        train('Friday', ['Legs', 'Glutes', 'Hamstrings']),
        rest('Saturday'),
        rest('Sunday'),
      ];
    case 'bro_split':
      return [
        train('Monday', ['Chest', 'Triceps']),
        train('Tuesday', ['Back', 'Biceps']),
        train('Wednesday', ['Shoulders']),
        train('Thursday', ['Legs', 'Glutes', 'Hamstrings']),
        rest('Friday'),
        rest('Saturday'),
        rest('Sunday'),
      ];
    case 'full_body_3x':
      return [
        train('Monday', ['Full Body']),
        rest('Tuesday'),
        train('Wednesday', ['Full Body']),
        rest('Thursday'),
        train('Friday', ['Full Body']),
        rest('Saturday'),
        rest('Sunday'),
      ];
    default:
      return emptyWeekConfig(defaultDurationMin);
  }
}
