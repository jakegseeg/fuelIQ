export type CardioIntensity = 'low' | 'moderate' | 'high';

export const CARDIO_ACTIVITIES = [
  'Running',
  'Walking',
  'Cycling',
  'Swimming',
  'Rowing',
  'Jump Rope',
  'Elliptical',
  'Stair Climber',
  'Other',
] as const;

export type CardioActivity = (typeof CARDIO_ACTIVITIES)[number];

export function cardioMet(activity: CardioActivity, intensity: CardioIntensity): number {
  switch (activity) {
    case 'Running':
      if (intensity === 'high') return 11.0;
      if (intensity === 'low') return 6.0;
      return 8.0;
    case 'Walking':
      return intensity === 'high' ? 4.5 : 3.5;
    case 'Cycling':
      if (intensity === 'high') return 10.0;
      if (intensity === 'low') return 4.0;
      return 6.8;
    case 'Swimming':
      if (intensity === 'high') return 9.0;
      if (intensity === 'low') return 4.0;
      return 5.8;
    case 'Rowing':
      if (intensity === 'high') return 10.0;
      if (intensity === 'low') return 4.5;
      return 7.0;
    case 'Jump Rope':
      return 10.0;
    case 'Elliptical':
      if (intensity === 'high') return 8.0;
      if (intensity === 'low') return 3.5;
      return 5.0;
    case 'Stair Climber':
      if (intensity === 'high') return 10.0;
      if (intensity === 'low') return 6.0;
      return 8.5;
    case 'Other':
      if (intensity === 'high') return 8.0;
      if (intensity === 'low') return 3.0;
      return 5.0;
    default:
      return 5.0;
  }
}

export function estimateCardioCalories(
  activity: CardioActivity,
  intensity: CardioIntensity,
  weightKg: number,
  durationMin: number,
): number {
  const met = cardioMet(activity, intensity);
  return Math.round(met * weightKg * (durationMin / 60));
}

export function cardioActivityToWorkoutType(
  activity: CardioActivity,
): 'running' | 'walking' | 'cycling' | 'hiit' | 'cardio' {
  switch (activity) {
    case 'Running':
      return 'running';
    case 'Walking':
      return 'walking';
    case 'Cycling':
      return 'cycling';
    case 'Jump Rope':
      return 'hiit';
    default:
      return 'cardio';
  }
}

export function logSourceBadge(log: { logSource?: string; sets: unknown[] }): string | null {
  if (log.logSource === 'custom') return 'Custom';
  if (log.logSource === 'cardio') return 'Cardio';
  return null;
}

const MET_WEIGHT_TRAINING = 5.0;

export function estimateStrengthCalories(weightKg: number, durationMin: number): number {
  return Math.round(MET_WEIGHT_TRAINING * weightKg * (durationMin / 60));
}
