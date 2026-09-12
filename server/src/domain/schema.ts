/** Request validation for profile data (spec section 1.1 field rules). */
import { z } from 'zod';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected an ISO date (YYYY-MM-DD)');

export const profileInputSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(80),
  dateOfBirth: isoDate.refine((d) => {
    const dob = new Date(d + 'T00:00:00');
    return !Number.isNaN(dob.getTime()) && dob < new Date();
  }, 'Date of birth must be a valid past date'),
  biologicalSex: z.enum(['male', 'female', 'unspecified']),
  heightCm: z.number().positive().min(50).max(300),
  weightKg: z.number().positive().min(20).max(500),
  goal: z.enum(['lose_fat', 'maintain', 'build_muscle', 'endurance', 'recomp']),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'very', 'athlete']),
  dietaryPreferences: z
    .array(
      z.enum([
        'none',
        'vegetarian',
        'vegan',
        'gluten_free',
        'dairy_free',
        'keto',
        'halal',
        'kosher',
        'nut_allergy',
      ]),
    )
    .default([]),
  customDietary: z.string().trim().max(280).nullable().default(null),
  targetWeightKg: z.number().positive().min(20).max(500).nullable().default(null),
  targetDate: isoDate.nullable().default(null),
  units: z.object({
    weight: z.enum(['lbs', 'kg']),
    height: z.enum(['imperial', 'metric']),
    energy: z.enum(['kcal', 'kj']),
  }),
});

export type ProfileInputDto = z.infer<typeof profileInputSchema>;
