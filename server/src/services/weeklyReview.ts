/** Assemble the inputs for and persist a weekly check-in (spec 4.3 / 5.2 AI). */
import { getProfile } from '../db/profileRepo.js';
import { listLogs } from '../db/workoutRepo.js';
import {
  dailyNutrition,
  weightSeries,
  getCheckin,
  saveCheckin,
  type CheckinRecord,
} from '../db/progressRepo.js';
import { buildWeeklyCheckin } from './insights.js';
import { addDaysISO } from '../domain/dates.js';

export async function generateWeeklyReview(
  userId: string,
  weekStart: string,
  force: boolean,
): Promise<{ checkin: CheckinRecord; regenerated: boolean }> {
  const existing = getCheckin(userId, weekStart);
  if (existing && !force) return { checkin: existing, regenerated: false };

  const profile = getProfile(userId);
  const weekEnd = addDaysISO(weekStart, 6);

  const nut = dailyNutrition(userId, weekStart).filter((d) => d.date <= weekEnd);
  const byDate = new Map(nut.map((d) => [d.date, d]));
  const caloriesByDay: number[] = [];
  const proteinByDay: number[] = [];
  for (let i = 0; i < 7; i++) {
    const d = byDate.get(addDaysISO(weekStart, i));
    caloriesByDay.push(d ? Math.round(d.calories) : 0);
    proteinByDay.push(d ? d.protein : 0);
  }
  const loggedProtein = proteinByDay.filter((p) => p > 0);
  const proteinAvg = loggedProtein.length
    ? loggedProtein.reduce((s, p) => s + p, 0) / loggedProtein.length
    : 0;

  const workouts = listLogs(userId, 1000)
    .filter((l) => l.date >= weekStart && l.date <= weekEnd)
    .map((l) => `${l.focus} (${l.durationMin}m, ${l.caloriesBurned} kcal)`);

  const weights = weightSeries(userId, weekStart).filter((w) => w.date <= weekEnd);
  const weightDeltaKg =
    weights.length >= 2 ? weights[weights.length - 1].weightKg - weights[0].weightKg : null;

  const built = await buildWeeklyCheckin({
    goal: profile?.goal ?? 'maintain',
    caloriesByDay,
    targetCalories: profile?.targets.calorieTarget ?? 0,
    proteinAvg,
    proteinTarget: profile?.targets.macros.proteinG ?? 0,
    workouts,
    weightDeltaKg,
  });

  const saved = saveCheckin(userId, weekStart, built.content, built.source);
  return { checkin: saved, regenerated: true };
}
