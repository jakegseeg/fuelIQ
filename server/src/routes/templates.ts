import { Router } from 'express';
import { z } from 'zod';
import { parseDate, userIdFrom } from './_helpers.js';
import { foodItemSchema } from '../domain/foodSchema.js';
import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  listTemplates,
  type TemplateItem,
} from '../db/mealsRepo.js';
import { addEntry } from '../db/logRepo.js';
import { buildDaySummary } from '../services/daySummary.js';

const router = Router();

const templateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  items: z
    .array(
      z.object({
        food: foodItemSchema,
        quantityG: z.number().positive().max(5000),
        meal: z.enum(['breakfast', 'lunch', 'dinner', 'snacks']).optional(),
      }),
    )
    .min(1),
});

// GET /api/templates
router.get('/', (req, res) => {
  res.json({ templates: listTemplates(userIdFrom(req)) });
});

// POST /api/templates { name, items }
router.post('/', (req, res) => {
  const parsed = templateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid template', issues: parsed.error.flatten() });
  }
  const template = createTemplate(
    userIdFrom(req),
    parsed.data.name,
    parsed.data.items as TemplateItem[],
  );
  res.status(201).json({ template });
});

// DELETE /api/templates/:id
router.delete('/:id', (req, res) => {
  const ok = deleteTemplate(userIdFrom(req), Number(req.params.id));
  if (!ok) return res.status(404).json({ error: 'Template not found' });
  res.json({ ok: true });
});

// POST /api/templates/:id/log { date } — quick-log every item in the template
router.post('/:id/log', (req, res) => {
  const userId = userIdFrom(req);
  const template = getTemplate(userId, Number(req.params.id));
  if (!template) return res.status(404).json({ error: 'Template not found' });
  const date = parseDate(req.body?.date);

  for (const item of template.items) {
    const meal = item.meal ?? 'snacks';
    const label =
      item.food.servingOptions.find((o) => Math.abs(o.grams - item.quantityG) < 0.01)?.label ||
      `${item.quantityG} g`;
    addEntry(userId, {
      date,
      meal,
      source: item.food.source,
      name: item.food.name,
      brand: item.food.brand,
      barcode: item.food.barcode,
      servingLabel: label,
      quantityG: item.quantityG,
      per100: item.food.per100,
      novaGroup: item.food.novaGroup,
      micronutrientCount: item.food.micronutrientCount,
    });
  }

  res.status(201).json({ day: buildDaySummary(userId, date) });
});

export default router;
