import { Router } from 'express';
import { asyncHandler, userIdFrom } from './_helpers.js';
import { generateGrocerySchema } from '../domain/grocerySchema.js';
import { swapMealBodySchema, swapMealQuerySchema } from '../domain/grocerySwapSchema.js';
import { getProfile } from '../db/profileRepo.js';
import {
  deleteGroceryPlan,
  getActiveGroceryPlan,
  getPriorGroceryMealPlans,
  getRecentGroceryMealPlans,
  saveGroceryPlan,
  updateActiveGroceryPlan,
} from '../db/groceryRepo.js';
import { generateGroceryPlan } from '../services/groceryPlanner.js';
import { getSwapAlternatives, rebuildPlanAfterSwap, swapWithinBudget } from '../services/grocerySwap.js';
import { getMealById } from '../services/mealPool.js';
import { todayISO } from '../domain/dates.js';

const router = Router();

// GET /api/grocery/meals/:mealId — recipe details for meal cards / modals
router.get(
  '/meals/:mealId',
  asyncHandler(async (req, res) => {
    const meal = getMealById(String(req.params.mealId));
    if (!meal) return res.status(404).json({ error: 'Meal not found' });
    res.json({
      meal: {
        mealId: meal.id,
        name: meal.name,
        thumbnailUrl: meal.thumbnailUrl ?? null,
        ingredients: meal.ingredients.map((ing) => ({
          displayName: ing.displayName,
          quantity: ing.servingQuantity,
        })),
        instructions: meal.instructions,
      },
    });
  }),
);

// GET /api/grocery/plan — active grocery plan
router.get(
  '/plan',
  asyncHandler(async (req, res) => {
    const plan = getActiveGroceryPlan(userIdFrom(req));
    res.json({ plan });
  }),
);

// GET /api/grocery/alternatives?date=YYYY-MM-DD&slot=breakfast|lunch|dinner
router.get(
  '/alternatives',
  asyncHandler(async (req, res) => {
    const parsed = swapMealQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid query', issues: parsed.error.flatten() });
    }
    const userId = userIdFrom(req);
    const plan = getActiveGroceryPlan(userId);
    if (!plan) return res.status(404).json({ error: 'No active grocery plan' });

    const profile = getProfile(userId);
    if (!profile) return res.status(400).json({ error: 'Profile required' });

    const alternatives = getSwapAlternatives(
      plan,
      getPriorGroceryMealPlans(userId, 2),
      profile,
      parsed.data.date,
      parsed.data.slot,
    );
    res.json({ alternatives });
  }),
);

// POST /api/grocery/swap — replace one meal and persist updated plan
router.post(
  '/swap',
  asyncHandler(async (req, res) => {
    const parsed = swapMealBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', issues: parsed.error.flatten() });
    }
    const userId = userIdFrom(req);
    const plan = getActiveGroceryPlan(userId);
    if (!plan) return res.status(404).json({ error: 'No active grocery plan' });

    const profile = getProfile(userId);
    if (!profile) return res.status(400).json({ error: 'Profile required' });

    const { date, slot, mealId } = parsed.data;
    const alternatives = getSwapAlternatives(
      plan,
      getPriorGroceryMealPlans(userId, 2),
      profile,
      date,
      slot,
    );
    if (!alternatives.some((a) => a.mealId === mealId)) {
      return res.status(400).json({ error: 'Meal is not an eligible swap option' });
    }

    const payload = rebuildPlanAfterSwap(plan, profile, date, slot, mealId);
    if (!swapWithinBudget(plan, payload)) {
      return res.status(400).json({ error: 'Swap would exceed weekly budget' });
    }

    const updated = updateActiveGroceryPlan(userId, payload);
    if (!updated) return res.status(500).json({ error: 'Failed to save updated plan' });

    res.json({ plan: updated });
  }),
);

// POST /api/grocery/generate — build and save a weekly plan
router.post(
  '/generate',
  asyncHandler(async (req, res) => {
    const parsed = generateGrocerySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', issues: parsed.error.flatten() });
    }
    const userId = userIdFrom(req);
    const profile = getProfile(userId);
    if (!profile) {
      return res.status(400).json({ error: 'Complete your profile before generating a grocery plan.' });
    }

    const payload = generateGroceryPlan(
      parsed.data,
      profile,
      todayISO(),
      getRecentGroceryMealPlans(userId, 2),
    );
    const saved = saveGroceryPlan(userId, parsed.data, payload);
    res.status(201).json({ plan: saved });
  }),
);

// DELETE /api/grocery/plan — clear active plan
router.delete(
  '/plan',
  asyncHandler(async (req, res) => {
    deleteGroceryPlan(userIdFrom(req));
    res.json({ ok: true });
  }),
);

export default router;
