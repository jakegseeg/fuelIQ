/**
 * Workout domain: plan/exercise types, workout categories, and MET-based
 * calorie-burn calculation (spec section 3.5).
 */

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

/** Preferences supplied when generating a plan (combined with the profile). */
export interface PlanInput {
  daysPerWeek: number; // 1-7
  equipment: Equipment[];
  durationMin: number; // 20 | 30 | 45 | 60 | 90
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
  reps: string; // "8-12" or "30 seconds"
  restSeconds: number;
  notes: string;
  muscleGroups: string[];
  /** Smart programming metadata (Chunk B). */
  exerciseId?: number;
  rotationGroup?: string;
  primaryMuscle?: string;
  sessionReason?: string;
  repExplanation?: string;
  isNewRotation?: boolean;
  movementPattern?: string;
}

export interface DayPlan {
  day: string; // Monday, Tuesday, ...
  focus: string; // Push / Upper / Legs / Cardio / Rest
  estimatedDurationMin: number;
  estimatedCaloriesBurned: number;
  exercises: PlanExercise[];
  /** User's preferred workout time (HH:MM), set via schedule customization. */
  preferredTime?: string | null;
  /** Smart programming metadata (Chunk B). */
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

/** A single completed set inside a logged session. */
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

// --- MET (Metabolic Equivalent of Task) -----------------------------------
// Mid-range values from the spec's reference table.
export const MET_VALUES: Record<WorkoutType, number> = {
  weight_training: 5.0, // 3.5–6.0
  hiit: 10.0, // 8.0–12.0
  running: 8.0,
  cycling: 6.8,
  yoga: 2.8, // 2.5–3.0
  walking: 3.5,
  cardio: 7.0,
  mobility: 2.5,
  rest: 1.0,
};

/** Map a free-text plan "focus" to a workout type for MET lookup. */
export function focusToType(focus: string): WorkoutType {
  const f = focus.toLowerCase();
  if (/rest|recovery|off/.test(f)) return 'rest';
  if (/hiit|interval|circuit|metcon/.test(f)) return 'hiit';
  if (/run|jog|sprint/.test(f)) return 'running';
  if (/cycle|cycling|bike|spin/.test(f)) return 'cycling';
  if (/yoga|stretch|flexib/.test(f)) return 'yoga';
  if (/walk/.test(f)) return 'walking';
  if (/mobility|warm/.test(f)) return 'mobility';
  if (/cardio|conditioning|endurance/.test(f)) return 'cardio';
  // push / pull / legs / upper / lower / full body / strength -> weights
  return 'weight_training';
}

/**
 * Estimated calorie burn = MET × weight(kg) × duration(hours).
 */
export function estimateCalorieBurn(
  type: WorkoutType,
  weightKg: number,
  durationMin: number,
): number {
  const met = MET_VALUES[type] ?? MET_VALUES.weight_training;
  return Math.round(met * weightKg * (durationMin / 60));
}
