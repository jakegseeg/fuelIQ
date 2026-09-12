import { z } from 'zod';
import type { WorkoutPlan } from './workout.js';

export const planInputSchema = z.object({
  daysPerWeek: z.number().int().min(1).max(7),
  equipment: z
    .array(
      z.enum([
        'bodyweight',
        'dumbbells',
        'barbell',
        'machines',
        'full_gym',
        'resistance_bands',
        'cardio_machines',
      ]),
    )
    .min(1),
  durationMin: z.number().int().min(10).max(180),
  limitations: z.string().trim().max(500).default(''),
  fitnessLevel: z.enum(['beginner', 'intermediate', 'advanced']),
});

/**
 * Parser for the raw JSON Claude returns (snake_case, per the spec prompt).
 * Coerces loose types and normalizes to our camelCase `WorkoutPlan`.
 */
const rawExercise = z.object({
  name: z.string(),
  sets: z.coerce.number().default(3),
  reps: z.union([z.string(), z.number()]).transform((v) => String(v)),
  rest_seconds: z.coerce.number().default(60),
  notes: z.string().default(''),
  muscle_groups: z.array(z.string()).default([]),
});

const rawDay = z.object({
  day: z.string(),
  focus: z.string().default('Workout'),
  estimated_duration_min: z.coerce.number().default(45),
  estimated_calories_burned: z.coerce.number().default(0),
  exercises: z.array(rawExercise).default([]),
});

const rawPlan = z.object({
  plan_name: z.string().default('Custom Plan'),
  weekly_schedule: z.array(rawDay).default([]),
  nutrition_notes: z.string().default(''),
  progression_tips: z.string().default(''),
});

export function parseClaudePlan(json: unknown): WorkoutPlan | null {
  const result = rawPlan.safeParse(json);
  if (!result.success) return null;
  const p = result.data;
  return {
    planName: p.plan_name,
    nutritionNotes: p.nutrition_notes,
    progressionTips: p.progression_tips,
    weeklySchedule: p.weekly_schedule.map((d) => ({
      day: d.day,
      focus: d.focus,
      estimatedDurationMin: d.estimated_duration_min,
      estimatedCaloriesBurned: d.estimated_calories_burned,
      exercises: d.exercises.map((e) => ({
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        restSeconds: e.rest_seconds,
        notes: e.notes,
        muscleGroups: e.muscle_groups,
      })),
    })),
  };
}

export const planExerciseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sets: z.coerce.number().int().min(1).max(20),
  reps: z.string().trim().min(1).max(40),
  restSeconds: z.coerce.number().int().min(0).max(600),
  notes: z.string().trim().max(500).default(''),
  muscleGroups: z.array(z.string().trim().min(1)).default([]),
  exerciseId: z.number().int().optional(),
  rotationGroup: z.string().optional(),
  primaryMuscle: z.string().optional(),
  sessionReason: z.string().optional(),
  repExplanation: z.string().optional(),
  isNewRotation: z.boolean().optional(),
  movementPattern: z.string().optional(),
});

export const dayTradeoffSchema = z.object({
  dayIndex: z.number().int().min(0).max(6),
  mode: z.enum(['default', 'shorter_rest', 'fewer_sets']),
});

export const swapExerciseSchema = z.object({
  dayIndex: z.number().int().min(0).max(6),
  exerciseIndex: z.number().int().min(0).max(50),
  exercise: planExerciseSchema,
});

export const logSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  focus: z.string().trim().max(120).default('Workout'),
  type: z
    .enum([
      'weight_training',
      'hiit',
      'running',
      'cycling',
      'yoga',
      'walking',
      'cardio',
      'mobility',
      'rest',
    ])
    .optional(),
  durationMin: z.number().min(1).max(600),
  caloriesBurned: z.number().min(0).max(10000).optional(),
  notes: z.string().trim().max(500).optional(),
  logSource: z.enum(['plan', 'custom', 'cardio']).optional(),
  sets: z
    .array(
      z.object({
        exercise: z.string().trim().min(1).max(120),
        muscleGroups: z.array(z.string()).default([]),
        weightKg: z.number().min(0).max(1000).default(0),
        reps: z.number().int().min(0).max(1000).default(0),
      }),
    )
    .default([]),
});
