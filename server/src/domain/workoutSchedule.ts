import type { DayPlan, WorkoutPlan } from './workout.js';

export const WEEKDAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export type WeekdayName = (typeof WEEKDAY_NAMES)[number];

export interface DaySchedulePreference {
  day: WeekdayName;
  available: boolean;
  preferredTime: string | null; // HH:MM (24h)
}

export interface WorkoutSchedulePreferences {
  days: DaySchedulePreference[];
}

export function defaultWorkoutSchedule(): WorkoutSchedulePreferences {
  return {
    days: WEEKDAY_NAMES.map((day) => ({
      day,
      available: true,
      preferredTime: null,
    })),
  };
}

function restDay(day: string, preferredTime: string | null): DayPlan {
  return {
    day,
    focus: 'Rest',
    estimatedDurationMin: 0,
    estimatedCaloriesBurned: 0,
    exercises: [],
    preferredTime,
  };
}

/** Place training sessions onto user-available days; unavailable days become rest. */
export function applyWorkoutSchedule(
  plan: WorkoutPlan,
  schedule: WorkoutSchedulePreferences | null,
): WorkoutPlan {
  if (!schedule?.days?.length) return plan;

  const prefByDay = new Map(schedule.days.map((d) => [d.day, d]));
  const trainingSessions = plan.weeklySchedule.filter((d) => d.exercises.length > 0);

  let sessionIdx = 0;
  const weeklySchedule = WEEKDAY_NAMES.map((dayName) => {
    const pref = prefByDay.get(dayName);
    const available = pref?.available ?? true;
    const preferredTime = pref?.preferredTime ?? null;

    if (!available) {
      return restDay(dayName, preferredTime);
    }

    if (sessionIdx < trainingSessions.length) {
      const session = trainingSessions[sessionIdx++];
      return {
        ...session,
        day: dayName,
        preferredTime,
      };
    }

    return restDay(dayName, preferredTime);
  });

  return { ...plan, weeklySchedule };
}
