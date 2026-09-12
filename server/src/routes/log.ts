import { Router } from 'express';
import { asyncHandler, parseDate, userIdFrom } from './_helpers.js';
import { logEntrySchema } from '../domain/foodSchema.js';
import { computeFuelScore } from '../domain/fuelscore.js';
import {
  addEntry,
  deleteEntry,
  frequentFoods,
  recentFoods,
  updateEntryQuantity,
} from '../db/logRepo.js';
import { buildDaySummary } from '../services/daySummary.js';
import type { FoodItem, FuelScore } from '../domain/food.js';

const router = Router();

function withFuelScore(food: FoodItem): FoodItem & { fuelScore: FuelScore } {
  return {
    ...food,
    fuelScore: computeFuelScore({
      per100: food.per100,
      novaGroup: food.novaGroup,
      micronutrientCount: food.micronutrientCount,
    }),
  };
}

// GET /api/log?date=YYYY-MM-DD — full day summary (meals, totals, remaining, water)
router.get('/', (req, res) => {
  const date = parseDate(req.query.date);
  res.json(buildDaySummary(userIdFrom(req), date));
});

// POST /api/log/entry — add a food, return the entry + refreshed day summary
router.post('/entry', (req, res) => {
  const parsed = logEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid log entry', issues: parsed.error.flatten() });
  }
  const { date, meal, food, quantityG, servingLabel } = parsed.data;
  const userId = userIdFrom(req);

  const label =
    servingLabel ||
    food.servingOptions.find((o) => Math.abs(o.grams - quantityG) < 0.01)?.label ||
    `${quantityG} g`;

  const entry = addEntry(userId, {
    date,
    meal,
    source: food.source,
    name: food.name,
    brand: food.brand,
    barcode: food.barcode,
    servingLabel: label,
    quantityG,
    per100: food.per100,
    novaGroup: food.novaGroup,
    micronutrientCount: food.micronutrientCount,
  });

  res.status(201).json({ entry, day: buildDaySummary(userId, date) });
});

// PATCH/PUT /api/log/entry/:id — change quantity/serving (PUT is the spec 5.2 alias)
function updateEntryHandler(req: import('express').Request, res: import('express').Response) {
  const userId = userIdFrom(req);
  const id = Number(req.params.id);
  const quantityG = Number(req.body?.quantityG);
  if (!Number.isFinite(quantityG) || quantityG <= 0) {
    return res.status(400).json({ error: 'quantityG must be a positive number' });
  }
  const entry = updateEntryQuantity(userId, id, quantityG, req.body?.servingLabel);
  if (!entry) return res.status(404).json({ error: 'Entry not found' });
  res.json({ entry, day: buildDaySummary(userId, entry.date) });
}
router.patch('/entry/:id', updateEntryHandler);
router.put('/entry/:id', updateEntryHandler);

// DELETE /api/log/entry/:id?date=YYYY-MM-DD
router.delete('/entry/:id', (req, res) => {
  const userId = userIdFrom(req);
  const ok = deleteEntry(userId, Number(req.params.id));
  if (!ok) return res.status(404).json({ error: 'Entry not found' });
  res.json({ day: buildDaySummary(userId, parseDate(req.query.date)) });
});

// GET /api/log/summary?date=YYYY-MM-DD — totals + remaining (no per-meal detail)
router.get('/summary', (req, res) => {
  const date = parseDate(req.query.date);
  const day = buildDaySummary(userIdFrom(req), date);
  const trackerMeals = (['breakfast', 'lunch', 'dinner'] as const).map((meal) => {
    const group = day.meals.find((m) => m.meal === meal);
    return {
      meal,
      logged: (group?.entries.length ?? 0) > 0,
      calories: group?.subtotal.calories ?? 0,
    };
  });
  res.json({
    date: day.date,
    totals: day.totals,
    target: day.target,
    remaining: day.remaining,
    caloriesBurned: day.caloriesBurned,
    netCalories: day.netCalories,
    water: day.water,
    meals: trackerMeals,
  });
});

// GET /api/log/recent — last 20 unique foods
router.get('/recent', (req, res) => {
  res.json({ foods: recentFoods(userIdFrom(req), 20).map(withFuelScore) });
});

// GET /api/log/frequent — top 10 foods by log count
router.get('/frequent', (req, res) => {
  res.json({ foods: frequentFoods(userIdFrom(req), 10).map(withFuelScore) });
});

export default router;
