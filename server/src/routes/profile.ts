import { Router } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { userIdFrom } from './_helpers.js';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { profileInputSchema } from '../domain/schema.js';
import { computeTargets } from '../domain/calculations.js';
import {
  addPhoto,
  getProfile,
  getPantry,
  getWorkoutSchedule,
  listPhotos,
  savePantry,
  saveWorkoutSchedule,
  upsertProfile,
} from '../db/profileRepo.js';
import { workoutScheduleSchema } from '../domain/workoutScheduleSchema.js';
import { applyWorkoutSchedule } from '../domain/workoutSchedule.js';
import { getActivePlan, updateActivePlanJson } from '../db/workoutRepo.js';
import { z } from 'zod';

const pantrySchema = z.object({
  pantry: z.array(z.string().trim().min(1).max(80)).max(50),
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, '../../uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, /^image\//.test(file.mimetype));
  },
});

// GET /api/profile — full profile (404 if onboarding not completed)
router.get('/', requireAuth, (req, res) => {
  const userId = userIdFrom(req);
  console.log('[profile] GET /api/profile userId=', userId, 'req.userId=', req.userId ?? null);
  const profile = getProfile(userId);
  if (!profile) return res.status(404).json({ error: 'No profile found' });
  res.json(profile);
});

// PUT /api/profile — upsert profile, recompute & store targets
router.put('/', requireAuth, (req, res) => {
  const userId = userIdFrom(req);
  console.log('[profile] PUT /api/profile userId=', userId, 'req.userId=', req.userId ?? null);
  const parsed = profileInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid profile data',
      issues: parsed.error.flatten(),
    });
  }
  const profile = upsertProfile(userId, parsed.data);
  console.log('[profile] upsert ok userId=', userId, 'profileId=', profile.id);
  res.json(profile);
});

// GET /api/profile/workout-schedule — weekly availability preferences
router.get('/workout-schedule', requireAuth, (req, res) => {
  const userId = userIdFrom(req);
  const schedule = getWorkoutSchedule(userId);
  res.json({ schedule });
});

// PUT /api/profile/workout-schedule — save preferences and rearrange the active plan
router.put('/workout-schedule', requireAuth, (req, res) => {
  const userId = userIdFrom(req);
  const parsed = workoutScheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid schedule', issues: parsed.error.flatten() });
  }
  const schedule = saveWorkoutSchedule(userId, parsed.data);
  const active = getActivePlan(userId);
  let plan = active;
  if (active) {
    const rearranged = applyWorkoutSchedule(active.plan, schedule);
    plan = updateActivePlanJson(userId, rearranged);
  }
  res.json({ schedule, plan });
});

// GET /api/profile/pantry — ingredients the user already owns
router.get('/pantry', requireAuth, (req, res) => {
  const userId = userIdFrom(req);
  res.json({ pantry: getPantry(userId) });
});

// PUT /api/profile/pantry — persist pantry list for grocery planning
router.put('/pantry', requireAuth, (req, res) => {
  const userId = userIdFrom(req);
  const parsed = pantrySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid pantry', issues: parsed.error.flatten() });
  }
  try {
    const pantry = savePantry(userId, parsed.data.pantry);
    res.json({ pantry });
  } catch {
    return res.status(400).json({ error: 'Complete your profile before saving pantry items.' });
  }
});

// GET /api/profile/targets — computed TDEE/macro targets
router.get('/targets', (req, res) => {
  const profile = getProfile(userIdFrom(req));
  if (!profile) return res.status(404).json({ error: 'No profile found' });
  res.json(profile.targets);
});

// POST /api/profile/preview — compute targets without saving (used by the wizard)
router.post('/preview', (req, res) => {
  const parsed = profileInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid profile data',
      issues: parsed.error.flatten(),
    });
  }
  res.json(computeTargets(parsed.data));
});

// GET /api/profile/photos — list progress photos
router.get('/photos', (req, res) => {
  const photos = listPhotos(userIdFrom(req)).map((p) => ({
    id: p.id,
    url: `/uploads/${p.filename}`,
    weightKg: p.weight_kg,
    takenAt: p.taken_at,
  }));
  res.json(photos);
});

// POST /api/profile/photos — upload a progress photo (stored locally)
router.post('/photos', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  const weightKg = req.body.weightKg ? Number(req.body.weightKg) : null;
  const row = addPhoto(userIdFrom(req), req.file.filename, weightKg);
  res.status(201).json({
    id: row.id,
    url: `/uploads/${row.filename}`,
    weightKg: row.weight_kg,
    takenAt: row.taken_at,
  });
});

export default router;
