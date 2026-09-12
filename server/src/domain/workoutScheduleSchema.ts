import { z } from 'zod';
import { WEEKDAY_NAMES } from './workoutSchedule.js';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const dayScheduleSchema = z.object({
  day: z.enum(WEEKDAY_NAMES),
  available: z.boolean(),
  preferredTime: z
    .string()
    .regex(timeRegex, 'Use HH:MM format')
    .nullable()
    .optional()
    .transform((v) => v ?? null),
});

export const workoutScheduleSchema = z.object({
  days: z.array(dayScheduleSchema).length(7),
});
