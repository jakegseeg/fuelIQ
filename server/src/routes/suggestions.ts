import { Router } from 'express';
import { asyncHandler } from './_helpers.js';
import { getSuggestions } from '../services/suggestions.js';

const router = Router();

// GET /api/suggestions?remaining_protein=X&remaining_carbs=Y&remaining_fat=Z&goal=lose_fat
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const remaining = {
      protein: Number(req.query.remaining_protein) || 0,
      carbs: Number(req.query.remaining_carbs) || 0,
      fat: Number(req.query.remaining_fat) || 0,
    };
    const goal = String(req.query.goal || 'maintain');
    const limit = Math.min(5, Math.max(3, Number(req.query.limit) || 4));
    const result = await getSuggestions(remaining, goal, limit);
    res.json(result);
  }),
);

export default router;
