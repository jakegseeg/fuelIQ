import { Dumbbell, Flame, Moon } from 'lucide-react';

/** Workout focus badge icon (replaces emoji icons from focusStyle). */
export function FocusIcon({ focus, size = 14 }: { focus: string; size?: number }) {
  if (/rest/i.test(focus)) return <Moon size={size} aria-hidden />;
  if (/push|pull|upper|leg|lower/i.test(focus)) return <Dumbbell size={size} aria-hidden />;
  if (/cardio|run|hiit|core|mobility|yoga/i.test(focus)) return null;
  return <Flame size={size} aria-hidden />;
}
