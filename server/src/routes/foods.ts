import { Router } from 'express';
import { asyncHandler, userIdFrom } from './_helpers.js';
import { lookupBarcode, searchFoods } from '../services/openFoodFacts.js';
import { computeFuelScore } from '../domain/fuelscore.js';
import { foodItemSchema, scoreSchema } from '../domain/foodSchema.js';
import { getCustomFood, saveCustomFood, searchCustomFoods } from '../db/customFoodRepo.js';
import { isGenericBarcode, matchGenericFoods } from '../domain/genericFoods.js';
import type { FoodItem } from '../domain/food.js';

const router = Router();

function scored(food: FoodItem) {
  return {
    ...food,
    fuelScore: computeFuelScore({
      per100: food.per100,
      novaGroup: food.novaGroup,
      micronutrientCount: food.micronutrientCount,
    }),
  };
}

// GET /api/food(s)/search?q=oats&limit=20 — the user's custom foods first, then OFF
router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    if (!q) return res.json({ foods: [] });
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const userId = userIdFrom(req);
    const custom = searchCustomFoods(userId, q, 5).map(scored);
    const generic = matchGenericFoods(q).map(scored);
    const genericNames = new Set(generic.map((g) => g.name.toLowerCase()));
    const off = (await searchFoods(q, limit))
      .map(scored)
      .filter((f) => !isGenericBarcode(f.barcode) && !genericNames.has(f.name.toLowerCase()));
    res.json({ foods: [...custom, ...generic, ...off] });
  }),
);

// GET /api/foods/barcode/:code
router.get(
  '/barcode/:code',
  asyncHandler(async (req, res) => {
    const food = await lookupBarcode(req.params.code);
    if (!food) return res.status(404).json({ error: 'Product not found' });
    res.json({ food: scored(food) });
  }),
);

// POST /api/foods/score — FuelScore for arbitrary nutrition (used by custom entry)
router.post('/score', (req, res) => {
  const parsed = scoreSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid nutrition data', issues: parsed.error.flatten() });
  }
  res.json(computeFuelScore(parsed.data));
});

// POST /api/food/custom — persist a custom food for reuse, returns it scored
router.post('/custom', (req, res) => {
  const parsed = foodItemSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid food', issues: parsed.error.flatten() });
  }
  const d = parsed.data;
  const food = saveCustomFood(userIdFrom(req), {
    name: d.name,
    brand: d.brand,
    per100: d.per100,
    novaGroup: d.novaGroup,
    micronutrientCount: d.micronutrientCount,
  });
  res.status(201).json({ food: scored(food) });
});

// GET /api/food/:id — single food with FuelScore.
// Resolves saved custom foods ("custom-<n>") and otherwise treats id as an OFF code.
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const customMatch = /^custom-(\d+)$/.exec(id);
    if (customMatch) {
      const food = getCustomFood(userIdFrom(req), Number(customMatch[1]));
      if (!food) return res.status(404).json({ error: 'Food not found' });
      return res.json({ food: scored(food) });
    }
    const food = await lookupBarcode(id);
    if (!food) return res.status(404).json({ error: 'Food not found' });
    res.json({ food: scored(food) });
  }),
);

export default router;
