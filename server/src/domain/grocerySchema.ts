import { z } from 'zod';

export const generateGrocerySchema = z.object({
  budget: z.coerce.number().min(15).max(2000),
  householdSize: z.coerce.number().int().min(1).max(10),
  location: z.string().trim().min(2).max(120),
});
