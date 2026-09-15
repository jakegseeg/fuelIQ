import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Moon } from 'lucide-react';
import { BestFoodsSubCard } from './BestFoodsSubCard';
import { MacroCalorieRing, MacroRingLegend } from '../ui/MacroCalorieRing';
import { Spinner } from '../Spinner';
import { api } from '../../lib/api';
import type { LogSummary } from '../../lib/foodTypes';
import { FocusIcon } from '../../lib/focusIcon';
import { focusStyle, type DayPlan, type WorkoutPlanRecord } from '../../lib/workoutTypes';

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

function todayISO(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function weekdayName(iso: string): string {
  return WEEKDAY_NAMES[new Date(iso + 'T12:00:00').getDay()];
}

function formatHeaderDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function isRestDay(workout: DayPlan): boolean {
  return /rest|recovery|off day/i.test(workout.focus) || workout.exercises.length === 0;
}

function todaysWorkoutFromPlan(plan: WorkoutPlanRecord | null, date: string): DayPlan | null {
  if (!plan) return null;
  const name = weekdayName(date);
  return plan.plan.weeklySchedule.find((d) => d.day === name) ?? null;
}

interface Props {
  date?: string;
  goal: string | null;
  className?: string;
  refreshKey?: number;
  onMealLogged?: () => void;
}

export function TodayContainer({
  date = todayISO(),
  goal,
  className = '',
  refreshKey = 0,
  onMealLogged,
}: Props) {
  const [summary, setSummary] = useState<LogSummary | null>(null);
  const [plan, setPlan] = useState<WorkoutPlanRecord | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const reload = useCallback(async () => {
    const [logSummary, waterDay, activePlan] = await Promise.all([
      api.getLogSummary(date),
      api.getWater(date),
      api.getActivePlan(),
    ]);
    setSummary({
      ...logSummary,
      water: {
        totalOz: waterDay.totalOz,
        goalOz: logSummary.water.goalOz,
        entries: waterDay.entries,
      },
    });
    setPlan(activePlan);
    return logSummary;
  }, [date]);

  useEffect(() => {
    setInitialLoading(true);
    reload().finally(() => setInitialLoading(false));
  }, [reload]);

  useEffect(() => {
    if (refreshKey === 0) return;
    void reload();
  }, [refreshKey, reload]);

  const handleMealLogged = useCallback(async () => {
    await reload();
    onMealLogged?.();
  }, [reload, onMealLogged]);

  const addWater = async (oz: number) => {
    await api.addWater(date, oz);
    const waterDay = await api.getWater(date);
    setSummary((prev) =>
      prev
        ? {
            ...prev,
            water: { ...prev.water, totalOz: waterDay.totalOz, entries: waterDay.entries },
          }
        : prev,
    );
  };

  const todaysWorkout = todaysWorkoutFromPlan(plan, date);

  return (
    <div
      className={`flex min-h-[280px] flex-col surface-card p-4 md:h-full ${className}`}
    >
        {initialLoading || !summary ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner label="Loading today…" />
          </div>
        ) : (
          <>
            <header className="flex flex-none items-center justify-between gap-3">
              <p className="section-label">Today</p>
              <p className="text-xs text-ink-600">{formatHeaderDate(date)}</p>
            </header>

            <div className="flex min-h-0 flex-1 items-center justify-center gap-4 py-2">
              <MacroCalorieRing totals={summary.totals} target={summary.target} size={240} strokeWidth={18} />
              <MacroRingLegend totals={summary.totals} target={summary.target} />
            </div>

            <div className="grid flex-none grid-cols-1 gap-3 sm:grid-cols-3">
              <BestFoodsSubCard
                date={date}
                remaining={summary.remaining}
                goal={goal}
                onLogged={handleMealLogged}
              />
              <WorkoutSubCard
                workout={todaysWorkout}
                hasPlan={!!plan}
                caloriesBurned={summary.caloriesBurned}
              />
              <WaterSubCard water={summary.water} onAdd={addWater} />
            </div>
          </>
        )}
    </div>
  );
}

function WorkoutSubCard({
  workout,
  hasPlan,
  caloriesBurned,
}: {
  workout: DayPlan | null;
  hasPlan: boolean;
  caloriesBurned: number;
}) {
  const navigate = useNavigate();

  const start = () => {
    if (!workout) return;
    const payload = { date: todayISO(), day: workout };
    sessionStorage.setItem('fueliq.activeWorkout', JSON.stringify(payload));
    navigate('/workouts/active', { state: payload });
  };

  if (!hasPlan) {
    return (
      <SubCard title="Today's Workout">
        <p className="text-xs text-ink-600">
          No plan yet —{' '}
          <Link to="/workouts" className="font-semibold text-accent-300 hover:underline">
            Generate workout plan
          </Link>
        </p>
      </SubCard>
    );
  }

  if (!workout || isRestDay(workout)) {
    return (
      <SubCard title="Today's Workout">
        <p className="flex items-center gap-1.5 text-xs text-ink-600">
          <Moon size={14} aria-hidden />
          Rest Day — recovery is part of the plan
        </p>
      </SubCard>
    );
  }

  if (caloriesBurned > 0) {
    return (
      <SubCard title="Today's Workout">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-accent-500">
          <Check size={14} className="text-accent-500" aria-hidden />
          Complete
        </p>
        <p className="mt-1 text-xs text-ink-600">{Math.round(caloriesBurned)} kcal burned</p>
      </SubCard>
    );
  }

  const style = focusStyle(workout.focus);

  return (
    <SubCard title="Today's Workout">
      <div className="flex items-start gap-2">
        <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-[10px] ${style.color}`}>
          <FocusIcon focus={workout.focus} size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-ink-900">{workout.focus}</p>
          <p className="text-[10px] text-ink-600">
            {workout.exercises.length} exercises · ~{workout.estimatedDurationMin} min
          </p>
        </div>
      </div>
      <button type="button" onClick={start} className="btn-primary mt-2 w-full text-xs">
        Start
      </button>
    </SubCard>
  );
}

function WaterSubCard({
  water,
  onAdd,
}: {
  water: LogSummary['water'];
  onAdd: (oz: number) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const pct = water.goalOz > 0 ? Math.min(100, (water.totalOz / water.goalOz) * 100) : 0;

  const add = async (oz: number) => {
    if (busy) return;
    setBusy(true);
    try {
      await onAdd(oz);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SubCard title="Water">
      <p className="text-sm tabular-nums text-ink-600">
        {water.totalOz} / {water.goalOz} oz
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-line-track">
        <div
          className="h-full rounded-full bg-sky-400 transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {[8, 16, 32].map((oz) => (
          <button
            key={oz}
            type="button"
            disabled={busy}
            onClick={() => add(oz)}
            className="btn-pill disabled:opacity-50"
          >
            +{oz} oz
          </button>
        ))}
      </div>
    </SubCard>
  );
}

function SubCard({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[140px] flex-col rounded-[16px] bg-surface2 p-3 ring-1 ring-ink-200/50">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-700">{title}</h3>
        {badge}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
