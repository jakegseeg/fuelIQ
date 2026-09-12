import { Router } from 'express';
import { asyncHandler, userIdFrom } from './_helpers.js';
import { getProfile } from '../db/profileRepo.js';
import { getExerciseDemo } from '../services/exerciseDemo.js';
import {
  getAllExercises,
  getExerciseById,
  getExercisesBySplit,
  getSwapAlternatives,
  searchExercises,
} from '../services/exercisePool.js';
import { planExerciseFromRecord, profileGoalToTrainingGoal } from '../services/smartWorkoutPlanner.js';

const router = Router();

// GET /api/exercises/demo?name=Back%20Squat
router.get(
  '/demo',
  asyncHandler(async (req, res) => {
    const name = String(req.query.name ?? '').trim();
    if (!name) return res.status(400).json({ error: 'name is required' });
    res.json(await getExerciseDemo(name));
  }),
);

// GET /api/exercises/search?q=
router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    if (!q) return res.status(400).json({ error: 'q is required' });
    res.json(searchExercises(q));
  }),
);

// GET /api/exercises/swap-alternatives?rotationGroup=&exclude=
router.get(
  '/swap-alternatives',
  asyncHandler(async (req, res) => {
    const rotationGroup = String(req.query.rotationGroup ?? '').trim();
    if (!rotationGroup) return res.status(400).json({ error: 'rotationGroup is required' });
    const excludeRaw = String(req.query.exclude ?? '').trim();
    const exclude = excludeRaw ? excludeRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const profile = getProfile(userIdFrom(req));
    const goal = profileGoalToTrainingGoal(profile?.goal ?? 'maintain');
    const alternatives = getSwapAlternatives(rotationGroup, exclude).map((record) =>
      planExerciseFromRecord(record, goal),
    );
    res.json(alternatives);
  }),
);

// GET /api/exercises/by-split/:split
router.get(
  '/by-split/:split',
  asyncHandler(async (req, res) => {
    const split = String(req.params.split ?? '').trim();
    if (!split) return res.status(400).json({ error: 'split is required' });
    res.json(getExercisesBySplit(split));
  }),
);

// GET /api/exercises
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(getAllExercises());
  }),
);

// GET /api/exercises/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'invalid exercise id' });
    }
    const exercise = getExerciseById(id);
    if (!exercise) return res.status(404).json({ error: 'Exercise not found' });
    res.json(exercise);
  }),
);

export default router;
