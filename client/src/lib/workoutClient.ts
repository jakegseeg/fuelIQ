import type { WorkoutType } from './workoutTypes';

/** Mirror of server focusToType — maps a plan "focus" to a workout type. */
export function focusToTypeClient(focus: string): WorkoutType {
  const f = focus.toLowerCase();
  if (/rest|recovery|off/.test(f)) return 'rest';
  if (/hiit|interval|circuit|metcon/.test(f)) return 'hiit';
  if (/run|jog|sprint/.test(f)) return 'running';
  if (/cycle|cycling|bike|spin/.test(f)) return 'cycling';
  if (/yoga|stretch|flexib/.test(f)) return 'yoga';
  if (/walk/.test(f)) return 'walking';
  if (/mobility|warm/.test(f)) return 'mobility';
  if (/cardio|conditioning|endurance/.test(f)) return 'cardio';
  return 'weight_training';
}
