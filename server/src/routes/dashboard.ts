import { Router } from 'express';
import { asyncHandler, parseDate, userIdFrom } from './_helpers.js';
import { buildDaySummary } from '../services/daySummary.js';
import { getProfile } from '../db/profileRepo.js';
import { getActivePlan } from '../db/workoutRepo.js';
import {
  dailyNutrition,
  loggedDates,
  getInsight,
  saveInsight,
  latestCheckin,
} from '../db/progressRepo.js';
import { loggingStreak, adherencePct, adherenceStatus } from '../domain/analytics.js';
import { addDaysISO, lastNDates, parseISO, todayISO } from '../domain/dates.js';
import { buildDailyInsight } from '../services/insights.js';
import type { DayPlan } from '../domain/workout.js';

const router = Router();

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function weekdayName(iso: string): string {
  return WEEKDAYS[parseISO(iso).getUTCDay()];
}

function isRest(focus: string): boolean {
  return /rest|recovery|off day/i.test(focus);
}

// GET /api/dashboard?date=YYYY-MM-DD
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = userIdFrom(req);
    const date = parseDate(req.query.date);
    const today = todayISO();

    const day = buildDaySummary(userId, date);
    const profile = getProfile(userId);

    // Logging streak.
    const streak = loggingStreak(loggedDates(userId), today);

    // Weekly calorie adherence (last 7 days).
    const nut7 = dailyNutrition(userId, addDaysISO(today, -6));
    const calByDate = new Map(nut7.map((d) => [d.date, d.calories]));
    const targetCals = profile?.targets.calorieTarget ?? 0;
    const adherence = lastNDates(7, today).map((d) => {
      const calories = calByDate.get(d) ?? 0;
      return {
        date: d,
        calories,
        target: targetCals,
        pct: adherencePct(calories, targetCals),
        status: calByDate.has(d) ? adherenceStatus(calories, targetCals) : ('empty' as const),
      };
    });

    // Today's workout from the active plan + next upcoming workout.
    const plan = getActivePlan(userId);
    let todaysWorkout: DayPlan | null = null;
    let nextWorkout: { date: string; day: string; focus: string } | null = null;
    if (plan) {
      const todayName = weekdayName(date);
      todaysWorkout = plan.plan.weeklySchedule.find((p) => p.day === todayName) ?? null;
      for (let i = 1; i <= 7; i++) {
        const futureISO = addDaysISO(date, i);
        const dp = plan.plan.weeklySchedule.find((p) => p.day === weekdayName(futureISO));
        if (dp && !isRest(dp.focus)) {
          nextWorkout = { date: futureISO, day: dp.day, focus: dp.focus };
          break;
        }
      }
    }

    // Daily AI insight (cached per day; only computed for the current day).
    let insight: { content: string; source: string } | null = null;
    if (date === today) {
      insight = getInsight(userId, today);
      if (!insight && profile) {
        const recent = dailyNutrition(userId, addDaysISO(today, -6)).map((d) => ({
          calories: d.calories,
          protein: d.protein,
          avgFuel: d.avgFuel,
        }));
        const built = await buildDailyInsight({
          target: {
            calories: profile.targets.calorieTarget,
            protein: profile.targets.macros.proteinG,
            carbs: profile.targets.macros.carbsG,
            fat: profile.targets.macros.fatG,
          },
          recent,
          goal: profile.goal,
        });
        saveInsight(userId, today, built.content, built.source);
        insight = built;
      }
    }

    res.json({
      date,
      hasProfile: !!profile,
      firstName: profile?.firstName ?? null,
      day,
      streak,
      adherence,
      todaysWorkout,
      nextWorkout,
      insight,
      checkin: latestCheckin(userId),
    });
  }),
);

export default router;
