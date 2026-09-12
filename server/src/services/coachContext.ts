/** Legacy context summaries — superseded by coachEngine.ts for the Coach chat. */
import type { Profile } from '../domain/types.js';
import { getProfile } from '../db/profileRepo.js';
import { dailyNutrition } from '../db/progressRepo.js';
import { getActivePlan } from '../db/workoutRepo.js';
import { addDaysISO, todayISO, weekStartISO } from '../domain/dates.js';

export interface CoachContext {
  userProfileSummary: string;
  weeklyLogSummary: string;
  workoutPlanSummary: string;
}

export function buildCoachContext(userId: string): CoachContext {
  const profile = getProfile(userId);
  return {
    userProfileSummary: summarizeProfile(profile),
    weeklyLogSummary: summarizeWeeklyLogs(userId),
    workoutPlanSummary: summarizeWorkoutPlan(userId),
  };
}

function summarizeProfile(profile: Profile | null): string {
  if (!profile) {
    return 'Profile not completed — encourage the user to finish onboarding for personalized targets.';
  }
  const t = profile.targets;
  const age = profile.dateOfBirth
    ? Math.floor(
        (Date.now() - new Date(profile.dateOfBirth + 'T00:00:00').getTime()) / (365.25 * 86400000),
      )
    : null;
  const parts = [
    `Name: ${profile.firstName}`,
    age != null ? `Age: ${age}` : null,
    `Sex: ${profile.biologicalSex}`,
    `Goal: ${profile.goal}`,
    `Activity: ${profile.activityLevel}`,
    `Weight: ${profile.weightKg.toFixed(1)} kg`,
    profile.targetWeightKg != null ? `Target weight: ${profile.targetWeightKg.toFixed(1)} kg` : null,
    `Daily targets: ${t.calorieTarget} kcal · ${t.macros.proteinG}g protein · ${t.macros.carbsG}g carbs · ${t.macros.fatG}g fat`,
    `TDEE: ${Math.round(t.tdee)} kcal · BMR: ${Math.round(t.bmr)} kcal`,
    profile.dietaryPreferences.length
      ? `Diet: ${profile.dietaryPreferences.join(', ')}${profile.customDietary ? ` (${profile.customDietary})` : ''}`
      : 'Diet: no restrictions logged',
  ].filter(Boolean);
  return parts.join('; ') + '.';
}

function summarizeWeeklyLogs(userId: string): string {
  const weekStart = weekStartISO(todayISO());
  const weekEnd = addDaysISO(weekStart, 6);
  const days = dailyNutrition(userId, weekStart).filter((d) => d.date <= weekEnd);

  if (days.length === 0) {
    return `Week of ${weekStart}: no food logged yet this week.`;
  }

  const totalCals = days.reduce((s, d) => s + d.calories, 0);
  const avgCals = Math.round(totalCals / days.length);
  const avgProtein = Math.round((days.reduce((s, d) => s + d.protein, 0) / days.length) * 10) / 10;
  const avgFuel =
    Math.round((days.reduce((s, d) => s + d.avgFuel, 0) / days.length) * 10) / 10;
  const loggedDays = days.length;

  const dayLines = days
    .map(
      (d) =>
        `${d.date}: ${d.calories} kcal, ${d.protein}g P, ${d.carbs}g C, ${d.fat}g F, avg FuelScore ${d.avgFuel}, ${d.entries} items`,
    )
    .join('; ');

  return (
    `Week of ${weekStart} (${loggedDays}/7 days logged): avg ${avgCals} kcal/day, ${avgProtein}g protein/day, avg FuelScore ${avgFuel}. ` +
    `Daily breakdown: ${dayLines}.`
  );
}

function summarizeWorkoutPlan(userId: string): string {
  const record = getActivePlan(userId);
  if (!record) {
    return 'No active workout plan — user can generate one on the Workouts page.';
  }
  const { plan } = record;
  const schedule = plan.weeklySchedule
    .map(
      (d) =>
        `${d.day}: ${d.focus} (~${d.estimatedDurationMin} min, ~${d.estimatedCaloriesBurned} kcal, ${d.exercises.length} exercises)`,
    )
    .join('; ');
  return `Plan "${plan.planName}": ${schedule}. Nutrition notes: ${plan.nutritionNotes.slice(0, 200)}`;
}
