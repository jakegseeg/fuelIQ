import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, userIdFrom } from './_helpers.js';
import { getSuggestions } from '../services/suggestions.js';
import { generateWeeklyReview } from '../services/weeklyReview.js';
import { chat, streamChat, type ChatMessage } from '../services/chat.js';
import { generateCoachInsights } from '../services/coachEngine.js';
import { todayISO, weekStartISO } from '../domain/dates.js';

const router = Router();

// GET /api/ai/coach/insights — personalized bullets from user logs
router.get(
  '/coach/insights',
  asyncHandler(async (req, res) => {
    const userId = userIdFrom(req);
    res.json({ insights: generateCoachInsights(userId) });
  }),
);

// GET /api/ai/suggestions?remaining_protein=&remaining_carbs=&remaining_fat=&goal=
router.get(
  '/suggestions',
  asyncHandler(async (req, res) => {
    const remaining = {
      protein: Number(req.query.remaining_protein) || 0,
      carbs: Number(req.query.remaining_carbs) || 0,
      fat: Number(req.query.remaining_fat) || 0,
    };
    const goal = String(req.query.goal || 'maintain');
    const limit = Math.min(5, Math.max(3, Number(req.query.limit) || 4));
    res.json(await getSuggestions(remaining, goal, limit));
  }),
);

// GET /api/ai/weekly-review?force=true — current week's check-in (generates if missing)
router.get(
  '/weekly-review',
  asyncHandler(async (req, res) => {
    const userId = userIdFrom(req);
    const weekStart = weekStartISO(todayISO());
    const force = req.query.force === 'true';
    const result = await generateWeeklyReview(userId, weekStart, force);
    res.json(result);
  }),
);

const chatSchema = z.object({
  message: z.string().min(1).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1),
      }),
    )
    .optional(),
});

// POST /api/ai/chat — general nutrition Q&A
router.post(
  '/chat',
  asyncHandler(async (req, res) => {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Provide a message or messages array' });
      return;
    }
    const history: ChatMessage[] =
      parsed.data.messages ??
      (parsed.data.message ? [{ role: 'user', content: parsed.data.message }] : []);
    if (history.length === 0) {
      res.status(400).json({ error: 'No message provided' });
      return;
    }
    const userId = userIdFrom(req);
    res.json(chat(history, userId));
  }),
);

// POST /api/ai/chat/stream — SSE streaming coach responses (spec 7.1)
router.post(
  '/chat/stream',
  asyncHandler(async (req, res) => {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Provide a message or messages array' });
      return;
    }
    const history: ChatMessage[] =
      parsed.data.messages ??
      (parsed.data.message ? [{ role: 'user', content: parsed.data.message }] : []);
    if (history.length === 0) {
      res.status(400).json({ error: 'No message provided' });
      return;
    }

    const userId = userIdFrom(req);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    try {
      for await (const chunk of streamChat(history, userId)) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    } catch (err) {
      console.error('chat stream error:', err);
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Stream failed' })}\n\n`);
    }
    res.end();
  }),
);

export default router;
