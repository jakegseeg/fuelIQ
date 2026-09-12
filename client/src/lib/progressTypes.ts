// Mirrors server Chunk 4 route response shapes.
import type { DaySummary } from './foodTypes';
import type { DayPlan, MuscleVolume } from './workoutTypes';

export type AdherenceStatus = 'green' | 'yellow' | 'red' | 'empty';

export interface AdherenceDay {
  date: string;
  calories: number;
  target: number;
  pct: number;
  status: AdherenceStatus;
}

export interface CheckinRecord {
  weekStart: string;
  content: string;
  source: 'claude' | 'local';
  createdAt: string;
}

export interface LoggingStreakDay {
  date: string;
  day: string;
  logged: boolean;
  isToday: boolean;
}

export interface LoggingStreakResponse {
  streak: number;
  week: LoggingStreakDay[];
}

export interface DashboardResponse {
  date: string;
  hasProfile: boolean;
  firstName: string | null;
  day: DaySummary;
  streak: number;
  adherence: AdherenceDay[];
  todaysWorkout: DayPlan | null;
  nextWorkout: { date: string; day: string; focus: string } | null;
  insight: { content: string; source: string } | null;
  checkin: CheckinRecord | null;
}

export interface WeightPoint {
  date: string;
  weightKg: number;
  avg7: number;
}

export interface WeightSeriesResponse {
  series: WeightPoint[];
  goalWeightKg: number | null;
  startWeightKg: number | null;
  latestWeightKg: number | null;
}

export interface MacroSplit {
  protein: number;
  carbs: number;
  fat: number;
}

export interface ProgressSummary {
  hasProfile: boolean;
  calories: AdherenceDay[];
  macros: {
    days: { date: string; protein: number; carbs: number; fat: number }[];
    avgSplit: MacroSplit;
    targetSplit: MacroSplit | null;
  };
  fuelScore: {
    days: { date: string; avg: number }[];
    improvementPct: number | null;
    baseline: number | null;
    current: number | null;
  };
  volumeByMuscle: MuscleVolume[];
  cardioByWeek: { week: string; minutes: number }[];
}

export type WeightRange = '7' | '30' | '90' | 'all';
