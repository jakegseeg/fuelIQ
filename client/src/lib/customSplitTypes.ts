import type { WorkoutPlan } from './workoutTypes';

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

export const SPLIT_PRESET_OPTIONS = [
  { id: 'push_pull_legs' as const, label: 'Push/Pull/Legs' },
  { id: 'upper_lower' as const, label: 'Upper/Lower' },
  { id: 'bro_split' as const, label: 'Bro Split' },
  { id: 'full_body_3x' as const, label: 'Full Body 3x' },
  { id: 'custom' as const, label: 'Custom' },
];

export type SplitPreset = (typeof SPLIT_PRESET_OPTIONS)[number]['id'];

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

export function emptyWeekConfig(): CustomSplitDayConfig[] {
  return WEEK_DAYS.map((day) => ({
    day,
    rest: day === 'Sunday',
    muscleGroups: [],
  }));
}

export function applySplitPreset(preset: SplitPreset): CustomSplitDayConfig[] {
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
      return emptyWeekConfig();
  }
}

/** Session swap storage key — negative id avoids collision with AI plan ids. */
export function customSplitPlanId(recordId: number): number {
  return -recordId;
}
