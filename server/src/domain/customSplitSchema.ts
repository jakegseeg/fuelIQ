import { z } from 'zod';
import { MUSCLE_GROUP_OPTIONS, SPLIT_PRESETS, WEEK_DAYS } from './customSplit.js';

const muscleGroupSchema = z.enum(MUSCLE_GROUP_OPTIONS);

const customSplitDaySchema = z.object({
  day: z.enum(WEEK_DAYS),
  rest: z.boolean(),
  muscleGroups: z.array(muscleGroupSchema),
  durationMin: z.union([z.literal(20), z.literal(30), z.literal(45), z.literal(60), z.literal(90)]).optional(),
});

export const customSplitConfigSchema = z.object({
  days: z.array(customSplitDaySchema).length(7),
  defaultDurationMin: z.union([
    z.literal(20),
    z.literal(30),
    z.literal(45),
    z.literal(60),
    z.literal(90),
  ]),
  preset: z.enum(SPLIT_PRESETS).optional(),
});

export const customSplitExerciseSwapSchema = z.object({
  dayIndex: z.number().int().min(0).max(6),
  exerciseIndex: z.number().int().min(0),
  exercise: z.object({
    name: z.string().min(1),
    sets: z.number().int().min(1),
    reps: z.string().min(1),
    restSeconds: z.number().int().min(0),
    notes: z.string(),
    muscleGroups: z.array(z.string()),
    exerciseId: z.number().optional(),
    rotationGroup: z.string().optional(),
    primaryMuscle: z.string().optional(),
    sessionReason: z.string().optional(),
    repExplanation: z.string().optional(),
    isNewRotation: z.boolean().optional(),
    movementPattern: z.string().optional(),
  }),
});

export const customSplitDayTradeoffSchema = z.object({
  dayIndex: z.number().int().min(0).max(6),
  mode: z.enum(['default', 'shorter_rest', 'fewer_sets']),
});
