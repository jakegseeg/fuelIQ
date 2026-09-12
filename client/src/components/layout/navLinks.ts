import type { LucideIcon } from 'lucide-react';
import { Dumbbell, ShoppingCart } from 'lucide-react';

export interface NavLinkDef {
  to: string;
  label: string;
  Icon?: LucideIcon;
}

export interface WorkoutSubLinkDef {
  to: string;
  label: string;
  subtitle: string;
}

export const NAV_LINKS: NavLinkDef[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/grocery', label: 'Grocery Plan', Icon: ShoppingCart },
  { to: '/log', label: 'Log Food' },
  { to: '/progress', label: 'Progress' },
  { to: '/coach', label: 'Coach' },
  { to: '/profile', label: 'Profile' },
];

export const WORKOUTS_NAV: NavLinkDef = {
  to: '/workouts',
  label: 'Workouts',
  Icon: Dumbbell,
};

export const WORKOUT_SUB_LINKS: WorkoutSubLinkDef[] = [
  { to: '/workouts', label: 'Smart Plan', subtitle: 'AI builds your week' },
  { to: '/workouts/custom', label: 'Custom Plan', subtitle: 'You set the split' },
  { to: '/workouts/log', label: 'Quick Log', subtitle: 'Log any workout' },
];

/** True when the current route is under the Workouts section. */
export function isWorkoutRoute(pathname: string): boolean {
  return pathname === '/workouts' || pathname.startsWith('/workouts/');
}

/** Active state for a workouts sub-nav link. */
export function isWorkoutSubLinkActive(pathname: string, to: string): boolean {
  if (to === '/workouts') {
    return pathname === '/workouts' || pathname === '/workouts/history';
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}
