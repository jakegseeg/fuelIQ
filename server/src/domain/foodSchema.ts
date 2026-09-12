import { z } from 'zod';

export const per100Schema = z.object({
  calories: z.number().min(0).max(2000),
  protein: z.number().min(0).max(200),
  carbs: z.number().min(0).max(200),
  fat: z.number().min(0).max(200),
  fiber: z.number().min(0).max(100).nullable().default(null),
  sugars: z.number().min(0).max(200).nullable().default(null),
  addedSugars: z.number().min(0).max(200).nullable().default(null),
  satFat: z.number().min(0).max(200).nullable().default(null),
  sodium: z.number().min(0).nullable().default(null),
});

export const foodItemSchema = z.object({
  source: z.enum(['off', 'custom', 'recipe']).default('custom'),
  name: z.string().trim().min(1).max(200),
  brand: z.string().trim().max(120).nullable().default(null),
  barcode: z.string().trim().max(64).nullable().default(null),
  per100: per100Schema,
  novaGroup: z.number().int().min(1).max(4).nullable().default(null),
  micronutrientCount: z.number().int().min(0).max(30).default(0),
  servingOptions: z
    .array(z.object({ label: z.string(), grams: z.number().positive() }))
    .default([]),
  defaultServingG: z.number().positive().default(100),
});

export const logEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meal: z.enum(['breakfast', 'lunch', 'dinner', 'snacks']),
  food: foodItemSchema,
  quantityG: z.number().positive().max(5000),
  servingLabel: z.string().max(120).optional(),
});

export const scoreSchema = z.object({
  per100: per100Schema,
  novaGroup: z.number().int().min(1).max(4).nullable().default(null),
  micronutrientCount: z.number().int().min(0).max(30).default(0),
});

export type FoodItemDto = z.infer<typeof foodItemSchema>;
