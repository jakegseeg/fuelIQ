// Mirrors server/src/domain/workout.ts

export type Equipment =
  | 'bodyweight'
  | 'dumbbells'
  | 'barbell'
  | 'machines'
  | 'full_gym'
  | 'resistance_bands'
  | 'cardio_machines';

export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';

export type WorkoutType =
  | 'weight_training'
  | 'hiit'
  | 'running'
  | 'cycling'
  | 'yoga'
  | 'walking'
  | 'cardio'
  | 'mobility'
  | 'rest';

export interface PlanInput {
  daysPerWeek: number;
  equipment: Equipment[];
  durationMin: number;
  limitations: string;
  fitnessLevel: FitnessLevel;
}

export type TimeTradeoffMode = 'default' | 'shorter_rest' | 'fewer_sets';

export interface ExerciseTimeBreakdown {
  exerciseName: string;
  minutes: number;
}

export interface PlanExercise {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  notes: string;
  muscleGroups: string[];
  exerciseId?: number;
  rotationGroup?: string;
  primaryMuscle?: string;
  sessionReason?: string;
  repExplanation?: string;
  isNewRotation?: boolean;
  movementPattern?: string;
}

export interface DaySchedulePreference {
  day: string;
  available: boolean;
  preferredTime: string | null;
}

export interface WorkoutSchedulePreferences {
  days: DaySchedulePreference[];
}

export const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export function defaultWorkoutSchedule(): WorkoutSchedulePreferences {
  return {
    days: WEEKDAYS.map((day) => ({ day, available: true, preferredTime: null })),
  };
}

export interface DayPlan {
  day: string;
  focus: string;
  estimatedDurationMin: number;
  estimatedCaloriesBurned: number;
  exercises: PlanExercise[];
  preferredTime?: string | null;
  sessionOverview?: string;
  calculatedDurationMin?: number;
  calculatedDurationMinLow?: number;
  calculatedDurationMinHigh?: number;
  timeBreakdown?: ExerciseTimeBreakdown[];
  cardioFinisher?: string;
  timeTradeoff?: TimeTradeoffMode;
  showTimeTradeoffBanner?: boolean;
  rotationNotice?: string;
}

export interface WorkoutPlan {
  planName: string;
  weeklySchedule: DayPlan[];
  nutritionNotes: string;
  progressionTips: string;
}

export interface WorkoutPlanRecord {
  id: number;
  plan: WorkoutPlan;
  input: PlanInput;
  source: 'claude' | 'local' | 'smart';
  createdAt: string;
}

export interface LoggedSet {
  exercise: string;
  muscleGroups: string[];
  weightKg: number;
  reps: number;
}

export interface WorkoutLog {
  id: number;
  date: string;
  focus: string;
  type: WorkoutType;
  durationMin: number;
  caloriesBurned: number;
  sets: LoggedSet[];
  totalSets: number;
  createdAt: string;
  notes?: string | null;
  logSource?: 'plan' | 'custom' | 'cardio';
}

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

export const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
  { value: 'bodyweight', label: 'Bodyweight only' },
  { value: 'dumbbells', label: 'Dumbbells' },
  { value: 'barbell', label: 'Barbell' },
  { value: 'machines', label: 'Cable / Smith / Machines' },
  { value: 'full_gym', label: 'Full gym' },
  { value: 'resistance_bands', label: 'Resistance bands' },
  { value: 'cardio_machines', label: 'Cardio machines' },
];

export const FITNESS_OPTIONS: { value: FitnessLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export const DURATION_OPTIONS = [20, 30, 45, 60, 90];

export const FOCUS_STYLES: { test: RegExp; color: string }[] = [
  { test: /rest/i, color: 'bg-ink-100 text-ink-600' },
  { test: /push/i, color: 'bg-rose-100 text-rose-700' },
  { test: /pull/i, color: 'bg-blue-100 text-blue-700' },
  { test: /leg|lower/i, color: 'bg-amber-100 text-amber-700' },
  { test: /upper/i, color: 'bg-violet-100 text-violet-700' },
  { test: /cardio|run|hiit/i, color: 'bg-accent-50 text-accent-600' },
  { test: /core|mobility|yoga/i, color: 'bg-teal-100 text-teal-700' },
];

export function focusStyle(focus: string): { color: string } {
  return (
    FOCUS_STYLES.find((s) => s.test.test(focus)) ?? {
      color: 'bg-accent-50 text-accent-600',
    }
  );
}
