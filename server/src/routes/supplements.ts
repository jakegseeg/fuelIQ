import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, userIdFrom } from './_helpers.js';
import {
  addSupplement,
  deleteSupplement,
  listSupplements,
  logSupplement,
  unlogSupplement,
} from '../db/supplementRepo.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    res.json({ supplements: listSupplements(userIdFrom(req), date) });
  }),
);

const createSchema = z.object({
  name: z.string().min(1),
  dose: z.string().optional(),
  notes: z.string().optional(),
});

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid supplement' });
      return;
    }
    const sup = addSupplement(
      userIdFrom(req),
      parsed.data.name,
      parsed.data.dose,
      parsed.data.notes,
    );
    res.status(201).json({ supplement: sup });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const ok = deleteSupplement(userIdFrom(req), Number(req.params.id));
    if (!ok) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json({ ok: true });
  }),
);

router.post(
  '/:id/log',
  asyncHandler(async (req, res) => {
    const date = String(req.body?.date ?? req.query.date ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'date required (YYYY-MM-DD)' });
      return;
    }
    const ok = logSupplement(
      userIdFrom(req),
      Number(req.params.id),
      date,
      typeof req.body?.notes === 'string' ? req.body.notes : null,
    );
    if (!ok) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json({ supplements: listSupplements(userIdFrom(req), date) });
  }),
);

router.delete(
  '/:id/log',
  asyncHandler(async (req, res) => {
    const date = String(req.query.date ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'date query required' });
      return;
    }
    unlogSupplement(userIdFrom(req), Number(req.params.id), date);
    res.json({ supplements: listSupplements(userIdFrom(req), date) });
  }),
);

export default router;
