import { z } from 'zod';

export const swapMealQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.enum(['breakfast', 'lunch', 'dinner']),
});

export const swapMealBodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.enum(['breakfast', 'lunch', 'dinner']),
  mealId: z.string().trim().min(1),
});
