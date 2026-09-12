import { Router } from 'express';
import { asyncHandler, userIdFrom } from './_helpers.js';
import { importMfpCsv } from '../services/mfpImport.js';

const router = Router();

// POST /api/import/mfp — body: { csv: string } (spec 7.4)
router.post(
  '/mfp',
  asyncHandler(async (req, res) => {
    const csv = typeof req.body?.csv === 'string' ? req.body.csv : '';
    if (!csv.trim()) {
      res.status(400).json({ error: 'Provide csv text in body' });
      return;
    }
    const result = importMfpCsv(userIdFrom(req), csv);
    res.json(result);
  }),
);

export default router;
