import { Router } from 'express';
import { z } from 'zod';
import { userIdFrom } from './_helpers.js';
import { foodItemSchema } from '../domain/foodSchema.js';
import {
  createRecipe,
  deleteRecipe,
  listRecipes,
  type RecipeIngredient,
} from '../db/mealsRepo.js';

const router = Router();

const recipeSchema = z.object({
  name: z.string().trim().min(1).max(120),
  servings: z.number().positive().max(100),
  ingredients: z
    .array(
      z.object({
        food: foodItemSchema,
        quantityG: z.number().positive().max(5000),
      }),
    )
    .min(1),
});

// GET /api/recipes
router.get('/', (req, res) => {
  res.json({ recipes: listRecipes(userIdFrom(req)) });
});

// POST /api/recipes { name, servings, ingredients } — auto-calculates per-serving macros
router.post('/', (req, res) => {
  const parsed = recipeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid recipe', issues: parsed.error.flatten() });
  }
  const recipe = createRecipe(
    userIdFrom(req),
    parsed.data.name,
    parsed.data.servings,
    parsed.data.ingredients as RecipeIngredient[],
  );
  res.status(201).json({ recipe });
});

// DELETE /api/recipes/:id
router.delete('/:id', (req, res) => {
  const ok = deleteRecipe(userIdFrom(req), Number(req.params.id));
  if (!ok) return res.status(404).json({ error: 'Recipe not found' });
  res.json({ ok: true });
});

export default router;
