import { Router } from 'express';
import { asyncHandler, parseDate, userIdFrom } from './_helpers.js';
import {
  addWeight,
  dailyNutrition,
  loggedDates,
  weightSeries,
  type DailyNutrition,
} from '../db/progressRepo.js';
import { updateWeightKg, getProfile } from '../db/profileRepo.js';
import { listLogs, computeStats } from '../db/workoutRepo.js';
import { focusToType } from '../domain/workout.js';
import {
  adherenceStatus,
  adherencePct,
  loggingStreak,
  macroSplitPercent,
  improvementPct,
} from '../domain/analytics.js';
import { addDaysISO, isoOf, lastNDates, parseISO, todayISO, weekStartISO } from '../domain/dates.js';

const router = Router();

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/** Sunday of the calendar week containing `iso`. */
function sundayWeekStart(iso: string): string {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return isoOf(d);
}

const CARDIO_TYPES = new Set(['running', 'cycling', 'hiit', 'cardio', 'walking']);

function sinceForRange(range: string, today: string): string | null {
  switch (range) {
    case '7':
      return addDaysISO(today, -6);
    case '30':
      return addDaysISO(today, -29);
    case '90':
      return addDaysISO(today, -89);
    case 'all':
      return null;
    default:
      return addDaysISO(today, -29);
  }
}

// --- Weight ---------------------------------------------------------------

// POST /api/progress/weight (and the /api/weight alias) — { date?, weightKg }
export function logWeightHandler(req: import('express').Request, res: import('express').Response) {
  const userId = userIdFrom(req);
  const weightKg = Number(req.body?.weightKg);
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    res.status(400).json({ error: 'weightKg must be a positive number' });
    return;
  }
  const date = parseDate(req.body?.date);
  const point = addWeight(userId, date, weightKg);
  // Keep the profile's current weight (and downstream targets) in sync with
  // the most recent weigh-in.
  if (date === todayISO()) updateWeightKg(userId, weightKg);
  res.status(201).json({ ok: true, point });
}
router.post('/weight', logWeightHandler);

// GET /api/progress/weight?range=7|30|90|all
router.get(
  '/weight',
  asyncHandler(async (req, res) => {
    const userId = userIdFrom(req);
    const range = String(req.query.range || '30');
    const today = todayISO();
    const since = sinceForRange(range, today);
    const points = weightSeries(userId, since);

    // Calendar-aware 7-day trailing average.
    const series = points.map((p) => {
      const windowStart = addDaysISO(p.date, -6);
      const inWindow = points.filter((q) => q.date >= windowStart && q.date <= p.date);
      const avg = inWindow.reduce((s, q) => s + q.weightKg, 0) / inWindow.length;
      return { date: p.date, weightKg: p.weightKg, avg7: Math.round(avg * 10) / 10 };
    });

    const profile = getProfile(userId);
    res.json({
      series,
      goalWeightKg: profile?.targetWeightKg ?? null,
      startWeightKg: points[0]?.weightKg ?? null,
      latestWeightKg: points[points.length - 1]?.weightKg ?? null,
    });
  }),
);

// --- Combined chart summary ----------------------------------------------

// GET /api/progress/streak — consecutive logging streak + current week dots
router.get(
  '/streak',
  asyncHandler(async (req, res) => {
    const userId = userIdFrom(req);
    const today = todayISO();
    const logged = loggedDates(userId);
    const streak = loggingStreak(logged, today);
    const weekStart = sundayWeekStart(today);
    const week = WEEKDAY_NAMES.map((day, i) => {
      const date = addDaysISO(weekStart, i);
      return {
        date,
        day,
        logged: logged.has(date),
        isToday: date === today,
      };
    });
    res.json({ streak, week });
  }),
);

// GET /api/progress/summary
router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const userId = userIdFrom(req);
    const today = todayISO();
    const profile = getProfile(userId);
    const target = profile
      ? {
          calories: profile.targets.calorieTarget,
          protein: profile.targets.macros.proteinG,
          carbs: profile.targets.macros.carbsG,
          fat: profile.targets.macros.fatG,
        }
      : null;

    const nut30 = dailyNutrition(userId, addDaysISO(today, -29));
    const byDate = new Map<string, DailyNutrition>(nut30.map((d) => [d.date, d]));

    // Calorie adherence — last 14 days.
    const calorieDays = lastNDates(14, today).map((date) => {
      const d = byDate.get(date);
      const calories = d ? d.calories : 0;
      const t = target?.calories ?? 0;
      return {
        date,
        calories,
        target: t,
        pct: adherencePct(calories, t),
        status: d ? adherenceStatus(calories, t) : ('empty' as const),
      };
    });

    // Macro consistency — last 7 days.
    const macroDays = lastNDates(7, today).map((date) => {
      const d = byDate.get(date);
      return {
        date,
        protein: d ? d.protein : 0,
        carbs: d ? d.carbs : 0,
        fat: d ? d.fat : 0,
      };
    });
    const loggedMacro = macroDays.filter((d) => d.protein + d.carbs + d.fat > 0);
    const avgMacro = loggedMacro.length
      ? {
          protein: loggedMacro.reduce((s, d) => s + d.protein, 0) / loggedMacro.length,
          carbs: loggedMacro.reduce((s, d) => s + d.carbs, 0) / loggedMacro.length,
          fat: loggedMacro.reduce((s, d) => s + d.fat, 0) / loggedMacro.length,
        }
      : { protein: 0, carbs: 0, fat: 0 };
    const avgSplit = macroSplitPercent(avgMacro);
    const targetSplit = target
      ? macroSplitPercent({ protein: target.protein, carbs: target.carbs, fat: target.fat })
      : null;

    // FuelScore trend — last 30 days (days with entries only for accuracy).
    const fuelDays = nut30.map((d) => ({ date: d.date, avg: d.avgFuel }));
    let fuelImprovement: number | null = null;
    let fuelBaseline: number | null = null;
    let fuelCurrent: number | null = null;
    if (fuelDays.length >= 4) {
      const third = Math.max(1, Math.floor(fuelDays.length / 3));
      const base = fuelDays.slice(0, third);
      const recent = fuelDays.slice(-third);
      fuelBaseline = base.reduce((s, d) => s + d.avg, 0) / base.length;
      fuelCurrent = recent.reduce((s, d) => s + d.avg, 0) / recent.length;
      fuelImprovement = improvementPct(fuelBaseline, fuelCurrent);
    }

    // Workout volume + cardio minutes by week (last 8 weeks).
    const stats = computeStats(userId);
    const logs = listLogs(userId, 1000);
    const cardioWeeks = new Map<string, number>();
    for (let i = 7; i >= 0; i--) {
      cardioWeeks.set(weekStartISO(addDaysISO(today, -i * 7)), 0);
    }
    for (const log of logs) {
      const type = focusToType(log.focus);
      if (!CARDIO_TYPES.has(type)) continue;
      const wk = weekStartISO(log.date);
      if (cardioWeeks.has(wk)) cardioWeeks.set(wk, (cardioWeeks.get(wk) ?? 0) + log.durationMin);
    }
    const cardioByWeek = [...cardioWeeks.entries()].map(([week, minutes]) => ({ week, minutes }));

    res.json({
      hasProfile: !!profile,
      calories: calorieDays,
      macros: { days: macroDays, avgSplit, targetSplit },
      fuelScore: {
        days: fuelDays,
        improvementPct: fuelImprovement,
        baseline: fuelBaseline,
        current: fuelCurrent,
      },
      volumeByMuscle: stats.volumeByMuscle,
      cardioByWeek,
    });
  }),
);

function parseRangeDays(value: unknown, fallback: number): number {
  if (typeof value === 'string') {
    const m = /^(\d+)/.exec(value);
    if (m) return Math.min(365, Math.max(1, Number(m[1])));
  }
  return fallback;
}

// GET /api/progress/calories?range=14d — daily calories vs target (spec 5.2)
router.get(
  '/calories',
  asyncHandler(async (req, res) => {
    const userId = userIdFrom(req);
    const today = todayISO();
    const days = parseRangeDays(req.query.range, 14);
    const profile = getProfile(userId);
    const target = profile?.targets.calorieTarget ?? 0;
    const byDate = new Map(dailyNutrition(userId, addDaysISO(today, -(days - 1))).map((d) => [d.date, d]));
    const series = lastNDates(days, today).map((date) => {
      const d = byDate.get(date);
      const calories = d ? d.calories : 0;
      return {
        date,
        calories,
        target,
        pct: adherencePct(calories, target),
        status: d ? adherenceStatus(calories, target) : ('empty' as const),
      };
    });
    res.json({ range: `${days}d`, target, days: series });
  }),
);

// GET /api/progress/macros?range=7d — daily P/C/F grams + avg vs target split
router.get(
  '/macros',
  asyncHandler(async (req, res) => {
    const userId = userIdFrom(req);
    const today = todayISO();
    const days = parseRangeDays(req.query.range, 7);
    const profile = getProfile(userId);
    const byDate = new Map(dailyNutrition(userId, addDaysISO(today, -(days - 1))).map((d) => [d.date, d]));
    const series = lastNDates(days, today).map((date) => {
      const d = byDate.get(date);
      return { date, protein: d ? d.protein : 0, carbs: d ? d.carbs : 0, fat: d ? d.fat : 0 };
    });
    const logged = series.filter((d) => d.protein + d.carbs + d.fat > 0);
    const avg = logged.length
      ? {
          protein: logged.reduce((s, d) => s + d.protein, 0) / logged.length,
          carbs: logged.reduce((s, d) => s + d.carbs, 0) / logged.length,
          fat: logged.reduce((s, d) => s + d.fat, 0) / logged.length,
        }
      : { protein: 0, carbs: 0, fat: 0 };
    const targetSplit = profile
      ? macroSplitPercent({
          protein: profile.targets.macros.proteinG,
          carbs: profile.targets.macros.carbsG,
          fat: profile.targets.macros.fatG,
        })
      : null;
    res.json({ range: `${days}d`, days: series, avgSplit: macroSplitPercent(avg), targetSplit });
  }),
);

export default router;
