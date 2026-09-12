import { Router } from 'express';
import { asyncHandler, userIdFrom } from './_helpers.js';
import { getCheckin, latestCheckin } from '../db/progressRepo.js';
import { generateWeeklyReview } from '../services/weeklyReview.js';
import { todayISO, weekStartISO } from '../domain/dates.js';

const router = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function resolveWeekStart(value: unknown): string {
  if (typeof value === 'string' && DATE_RE.test(value)) return weekStartISO(value);
  return weekStartISO(todayISO());
}

// GET /api/checkin?week=YYYY-MM-DD  → that week's check-in, or the latest.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = userIdFrom(req);
    if (req.query.week) {
      const weekStart = resolveWeekStart(req.query.week);
      res.json({ checkin: getCheckin(userId, weekStart) });
      return;
    }
    res.json({ checkin: latestCheckin(userId) });
  }),
);

// POST /api/checkin/generate  { weekStart?, force? }
router.post(
  '/generate',
  asyncHandler(async (req, res) => {
    const userId = userIdFrom(req);
    const weekStart = resolveWeekStart(req.body?.weekStart);
    const force = req.body?.force === true;
    const result = await generateWeeklyReview(userId, weekStart, force);
    res.json(result);
  }),
);

export default router;
