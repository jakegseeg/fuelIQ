import { Router } from 'express';
import { asyncHandler, parseDate, userIdFrom } from './_helpers.js';
import { logSchema, planInputSchema, swapExerciseSchema, dayTradeoffSchema } from '../domain/workoutSchema.js';
import {
  customSplitConfigSchema,
  customSplitExerciseSwapSchema,
  customSplitDayTradeoffSchema,
} from '../domain/customSplitSchema.js';
import { estimateCalorieBurn, focusToType } from '../domain/workout.js';
import { generateSmartPlan, profileGoalToTrainingGoal, recalculateDayExercises } from '../services/smartWorkoutPlanner.js';
import { generateCustomSplitPlan } from '../services/customSplitPlanner.js';
import { getCustomSplit, saveCustomSplit } from '../db/customSplitRepo.js';
import { saveWorkoutPreferences } from '../db/profileRepo.js';
import { buildDaySummary } from '../services/daySummary.js';
import { getProfile } from '../db/profileRepo.js';
import { kgToLbs, cmToInches } from '../domain/calculations.js';
import {
  addLog,
  caloriesBurnedForDate,
  computeStats,
  deleteLog,
  getActivePlan,
  getLog,
  getPlanById,
  listLogs,
  savePlan,
  updateActivePlanJson,
} from '../db/workoutRepo.js';
import { applyWorkoutSchedule } from '../domain/workoutSchedule.js';
import { getWorkoutSchedule } from '../db/profileRepo.js';
import type { Profile } from '../domain/types.js';
import type { Equipment } from '../domain/workout.js';
import type { SmartPlannerContext } from '../services/smartWorkoutPlanner.js';

const router = Router();

function heightLabel(profile: Profile): string {
  if (profile.units.height === 'metric') return `${Math.round(profile.heightCm)} cm`;
  const totalIn = cmToInches(profile.heightCm);
  const ft = Math.floor(totalIn / 12);
  const inch = Math.round(totalIn - ft * 12);
  return `${ft}'${inch}"`;
}

function contextFromProfile(profile: Profile): SmartPlannerContext {
  return {
    age: profile.targets.age,
    sex:
      profile.biologicalSex === 'male'
        ? 'male'
        : profile.biologicalSex === 'female'
          ? 'female'
          : 'person',
    weightKg: profile.weightKg,
    weightLbs: kgToLbs(profile.weightKg),
    heightLabel: heightLabel(profile),
    goal: profile.goal,
    calories: profile.targets.calorieTarget,
    protein: profile.targets.macros.proteinG,
    dietPrefs: profile.dietaryPreferences.join(', '),
    trainingGoal: profileGoalToTrainingGoal(profile.goal),
  };
}

// POST /api/workouts/generate-plan
router.post(
  '/generate-plan',
  asyncHandler(async (req, res) => {
    const parsed = planInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid plan input', issues: parsed.error.flatten() });
    }
    const userId = userIdFrom(req);
    const profile = getProfile(userId);
    if (!profile) {
      return res.status(409).json({ error: 'Complete your profile before generating a plan.' });
    }
    const ctx = contextFromProfile(profile);
    const input = {
      ...parsed.data,
      durationMin: parsed.data.durationMin || profile.preferredWorkoutDuration || 45,
      equipment: parsed.data.equipment.length ? parsed.data.equipment : profile.equipmentAvailable,
      fitnessLevel: parsed.data.fitnessLevel || profile.fitnessLevel,
    };
    saveWorkoutPreferences(userId, {
      preferredWorkoutDuration: input.durationMin,
      equipmentAvailable: input.equipment,
      fitnessLevel: input.fitnessLevel,
    });
    const plan = generateSmartPlan(userId, ctx, input);
    const schedule = getWorkoutSchedule(userId);
    const arranged = applyWorkoutSchedule(plan, schedule);
    const record = savePlan(userId, arranged, input, 'smart');
    res.status(201).json({ plan: record, source: 'smart' });
  }),
);

// GET /api/workouts/custom-split
router.get('/custom-split', (req, res) => {
  res.json({ split: getCustomSplit(userIdFrom(req)) });
});

// POST /api/workouts/custom-split — save config and generate exercises
router.post(
  '/custom-split',
  asyncHandler(async (req, res) => {
    const parsed = customSplitConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid split config', issues: parsed.error.flatten() });
    }
    const userId = userIdFrom(req);
    const profile = getProfile(userId);
    if (!profile) {
      return res.status(409).json({ error: 'Complete your profile before creating a split.' });
    }
    const ctx = contextFromProfile(profile);
    const equipment = (profile.equipmentAvailable?.length
      ? profile.equipmentAvailable
      : ['full_gym']) as Equipment[];
    const generatedPlan = generateCustomSplitPlan(
      userId,
      ctx,
      parsed.data,
      equipment,
      profile.fitnessLevel,
      '',
    );
    const record = saveCustomSplit(userId, { config: parsed.data, generatedPlan });
    res.status(201).json({ split: record });
  }),
);

// POST /api/workouts/custom-split/regenerate — keep muscle assignments, fresh exercises
router.post(
  '/custom-split/regenerate',
  asyncHandler(async (req, res) => {
    const userId = userIdFrom(req);
    const existing = getCustomSplit(userId);
    if (!existing) return res.status(404).json({ error: 'No custom split found' });

    const profile = getProfile(userId);
    if (!profile) {
      return res.status(409).json({ error: 'Complete your profile before regenerating.' });
    }
    const ctx = contextFromProfile(profile);
    const equipment = (profile.equipmentAvailable?.length
      ? profile.equipmentAvailable
      : ['full_gym']) as Equipment[];
    const generatedPlan = generateCustomSplitPlan(
      userId,
      ctx,
      existing.split.config,
      equipment,
      profile.fitnessLevel,
      '',
    );
    const record = saveCustomSplit(userId, { config: existing.split.config, generatedPlan });
    res.json({ split: record });
  }),
);

// PATCH /api/workouts/custom-split/exercise — permanently swap one exercise
router.patch(
  '/custom-split/exercise',
  asyncHandler(async (req, res) => {
    const parsed = customSplitExerciseSwapSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid swap payload', issues: parsed.error.flatten() });
    }
    const userId = userIdFrom(req);
    const record = getCustomSplit(userId);
    if (!record?.split.generatedPlan) {
      return res.status(404).json({ error: 'No custom split plan found' });
    }

    const { dayIndex, exerciseIndex, exercise } = parsed.data;
    const schedule = record.split.generatedPlan.weeklySchedule;
    if (dayIndex < 0 || dayIndex >= schedule.length) {
      return res.status(400).json({ error: 'Invalid day index' });
    }
    const day = schedule[dayIndex];
    if (exerciseIndex < 0 || exerciseIndex >= day.exercises.length) {
      return res.status(400).json({ error: 'Invalid exercise index' });
    }

    const plan = {
      ...record.split.generatedPlan,
      weeklySchedule: schedule.map((d, di) =>
        di === dayIndex
          ? {
              ...d,
              exercises: d.exercises.map((ex, ei) => (ei === exerciseIndex ? exercise : ex)),
            }
          : d,
      ),
    };
    const updated = saveCustomSplit(userId, { ...record.split, generatedPlan: plan });
    res.json({ split: updated });
  }),
);

// PATCH /api/workouts/custom-split/day/tradeoff
router.patch(
  '/custom-split/day/tradeoff',
  asyncHandler(async (req, res) => {
    const parsed = customSplitDayTradeoffSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid tradeoff payload', issues: parsed.error.flatten() });
    }
    const userId = userIdFrom(req);
    const record = getCustomSplit(userId);
    if (!record?.split.generatedPlan) {
      return res.status(404).json({ error: 'No custom split plan found' });
    }

    const profile = getProfile(userId);
    const goal = profileGoalToTrainingGoal(profile?.goal ?? 'maintain');
    const { dayIndex, mode } = parsed.data;
    const day = record.split.generatedPlan.weeklySchedule[dayIndex];
    if (!day) return res.status(400).json({ error: 'Invalid day index' });

    const budget = record.split.config.defaultDurationMin;
    const { exercises, calculatedDurationMin, calculatedDurationMinLow, calculatedDurationMinHigh, timeBreakdown } =
      recalculateDayExercises(day.exercises, mode, goal, budget);

    const plan = {
      ...record.split.generatedPlan,
      weeklySchedule: record.split.generatedPlan.weeklySchedule.map((d, i) =>
        i === dayIndex
          ? {
              ...d,
              exercises,
              calculatedDurationMin,
              calculatedDurationMinLow,
              calculatedDurationMinHigh,
              timeBreakdown,
              estimatedDurationMin: calculatedDurationMin,
              timeTradeoff: mode,
            }
          : d,
      ),
    };
    const updated = saveCustomSplit(userId, { ...record.split, generatedPlan: plan });
    res.json({ split: updated });
  }),
);

// PATCH /api/workouts/plan/day/tradeoff — recalculate a day with shorter rest or fewer sets
router.patch(
  '/plan/day/tradeoff',
  asyncHandler(async (req, res) => {
    const parsed = dayTradeoffSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid tradeoff payload', issues: parsed.error.flatten() });
    }
    const userId = userIdFrom(req);
    const record = getActivePlan(userId);
    if (!record) return res.status(404).json({ error: 'No active workout plan' });

    const profile = getProfile(userId);
    const goal = profileGoalToTrainingGoal(profile?.goal ?? 'maintain');
    const { dayIndex, mode } = parsed.data;
    const day = record.plan.weeklySchedule[dayIndex];
    if (!day) return res.status(400).json({ error: 'Invalid day index' });

    const budget = record.input.durationMin;
    const { exercises, calculatedDurationMin, calculatedDurationMinLow, calculatedDurationMinHigh, timeBreakdown } =
      recalculateDayExercises(day.exercises, mode, goal, budget);

    const plan = {
      ...record.plan,
      weeklySchedule: record.plan.weeklySchedule.map((d, i) =>
        i === dayIndex
          ? {
              ...d,
              exercises,
              calculatedDurationMin,
              calculatedDurationMinLow,
              calculatedDurationMinHigh,
              timeBreakdown,
              estimatedDurationMin: calculatedDurationMin,
              timeTradeoff: mode,
            }
          : d,
      ),
    };
    const updated = updateActivePlanJson(userId, plan);
    res.json({ plan: updated });
  }),
);

// PATCH /api/workouts/plan/exercise — permanently swap one exercise in the active plan
router.patch(
  '/plan/exercise',
  asyncHandler(async (req, res) => {
    const parsed = swapExerciseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid swap payload', issues: parsed.error.flatten() });
    }
    const userId = userIdFrom(req);
    const record = getActivePlan(userId);
    if (!record) {
      return res.status(404).json({ error: 'No active workout plan' });
    }
    const { dayIndex, exerciseIndex, exercise } = parsed.data;
    const schedule = record.plan.weeklySchedule;
    if (dayIndex < 0 || dayIndex >= schedule.length) {
      return res.status(400).json({ error: 'Invalid day index' });
    }
    const day = schedule[dayIndex];
    if (exerciseIndex < 0 || exerciseIndex >= day.exercises.length) {
      return res.status(400).json({ error: 'Invalid exercise index' });
    }
    const plan = {
      ...record.plan,
      weeklySchedule: schedule.map((d, di) =>
        di === dayIndex
          ? {
              ...d,
              exercises: d.exercises.map((ex, ei) => (ei === exerciseIndex ? exercise : ex)),
            }
          : d,
      ),
    };
    const updated = updateActivePlanJson(userId, plan);
    res.json({ plan: updated });
  }),
);

// GET /api/workouts/plan — the active plan (or null)
router.get('/plan', (req, res) => {
  res.json({ plan: getActivePlan(userIdFrom(req)) });
});

// GET /api/workouts/plan/active — alias for the active plan (spec 5.2)
router.get('/plan/active', (req, res) => {
  res.json({ plan: getActivePlan(userIdFrom(req)) });
});

// GET /api/workouts/plan/:id — a specific plan by id
router.get('/plan/:id', (req, res) => {
  const plan = getPlanById(userIdFrom(req), Number(req.params.id));
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json({ plan });
});

// POST /api/workouts/log(s) — finish a session
function finishSession(req: import('express').Request, res: import('express').Response) {
  const parsed = logSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid workout log', issues: parsed.error.flatten() });
  }
  const userId = userIdFrom(req);
  const profile = getProfile(userId);
  const weightKg = profile?.weightKg ?? 70;
  const { date, focus, durationMin, sets } = parsed.data;
  const type = parsed.data.type ?? focusToType(focus);
  const caloriesBurned =
    parsed.data.caloriesBurned ??
    estimateCalorieBurn(type, weightKg, durationMin);

  const log = addLog(userId, {
    date,
    focus,
    type,
    durationMin,
    caloriesBurned,
    sets,
    notes: parsed.data.notes,
    logSource: parsed.data.logSource,
  });
  res.status(201).json({ log, day: buildDaySummary(userId, date) });
}
router.post('/logs', finishSession);
router.post('/log', finishSession); // spec 5.2 alias

// GET /api/workouts/logs — history
router.get('/logs', (req, res) => {
  res.json({ logs: listLogs(userIdFrom(req)) });
});

// DELETE /api/workouts/logs/:id?date=
router.delete('/logs/:id', (req, res) => {
  const userId = userIdFrom(req);
  const ok = deleteLog(userId, Number(req.params.id));
  if (!ok) return res.status(404).json({ error: 'Workout not found' });
  res.json({ day: buildDaySummary(userId, parseDate(req.query.date)) });
});

// GET /api/workouts/history — stats (volume, PRs, streak)
router.get('/history', (req, res) => {
  res.json(computeStats(userIdFrom(req)));
});

// GET /api/workouts/history/:id — a single past session
router.get('/history/:id', (req, res) => {
  const log = getLog(userIdFrom(req), Number(req.params.id));
  if (!log) return res.status(404).json({ error: 'Session not found' });
  res.json({ log });
});

// GET /api/workouts/burned?date= — calories burned that day
router.get('/burned', (req, res) => {
  const date = parseDate(req.query.date);
  res.json({ date, caloriesBurned: caloriesBurnedForDate(userIdFrom(req), date) });
});

export default router;
