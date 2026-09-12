import { Router } from 'express';
import { parseDate, userIdFrom } from './_helpers.js';
import { addWater, deleteWater, getWaterDay } from '../db/waterRepo.js';

const router = Router();

// GET /api/water?date=YYYY-MM-DD
router.get('/', (req, res) => {
  res.json(getWaterDay(userIdFrom(req), parseDate(req.query.date)));
});

// POST /api/water { date, oz }
router.post('/', (req, res) => {
  const oz = Number(req.body?.oz);
  if (!Number.isFinite(oz) || oz <= 0 || oz > 300) {
    return res.status(400).json({ error: 'oz must be a positive number' });
  }
  const date = parseDate(req.body?.date);
  res.status(201).json(addWater(userIdFrom(req), date, oz));
});

// DELETE /api/water/:id?date=YYYY-MM-DD
router.delete('/:id', (req, res) => {
  const date = parseDate(req.query.date);
  res.json(deleteWater(userIdFrom(req), Number(req.params.id), date));
});

export default router;
