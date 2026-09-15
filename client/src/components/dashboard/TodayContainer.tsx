import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Moon } from 'lucide-react';
import { BestFoodsSubCard } from './BestFoodsSubCard';
import { MacroCalorieRing, MacroRingLegend } from '../ui/MacroCalorieRing';
import { Spinner } from '../Spinner';
import { useRingSize } from '../../hooks/useRingSize';
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

interface SharedProps {
  date?: string;
  goal?: string | null;
  refreshKey?: number;
  onMealLogged?: () => void;
  className?: string;
}

type TodayData = ReturnType<typeof useTodayData>;

const TodayDataContext = createContext<TodayData | null>(null);

function useTodayDataContext(): TodayData {
  const ctx = useContext(TodayDataContext);
  if (!ctx) throw new Error('TodayHero/TodayHighlights must be used within TodayDataProvider');
  return ctx;
}

/** Wrap dashboard today sections so log summary is fetched once. */
export function TodayDataProvider({
  date = todayISO(),
  refreshKey = 0,
  children,
}: {
  date?: string;
  refreshKey?: number;
  children: ReactNode;
}) {
  const data = useTodayData(date, refreshKey);
  return <TodayDataContext.Provider value={data}>{children}</TodayDataContext.Provider>;
}

function useTodayData(date: string, refreshKey: number) {
  const [summary, setSummary] = useState<LogSummary | null>(null);
  const [plan, setPlan] = useState<WorkoutPlanRecord | null>(null);
  const [loading, setLoading] = useState(true);

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
    setLoading(true);
    reload().finally(() => setLoading(false));
  }, [reload]);

  useEffect(() => {
    if (refreshKey === 0) return;
    void reload();
  }, [refreshKey, reload]);

  return { summary, plan, loading, reload, setSummary };
}

/** Health-style hero — large centered ring with macro legend beneath. */
export function TodayHero({ date = todayISO(), className = '' }: Pick<SharedProps, 'date' | 'className'>) {
  const ringSize = useRingSize();
  const { summary, loading } = useTodayDataContext();
  const strokeWidth = ringSize >= 340 ? 24 : ringSize >= 310 ? 22 : 20;

  return (
    <section className={`flex flex-col items-center px-2 py-4 sm:py-6 ${className}`} aria-label="Today's nutrition">
      <p className="mb-8 text-sm text-ink-500">{formatHeaderDate(date)}</p>

      {loading || !summary ? (
        <div className="flex h-[340px] w-full items-center justify-center">
          <Spinner label="Loading today…" />
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center py-4 sm:py-6">
            <MacroCalorieRing
              totals={summary.totals}
              target={summary.target}
              size={ringSize}
              strokeWidth={strokeWidth}
            />
          </div>
          <div className="mt-10 w-full max-w-lg px-2">
            <MacroRingLegend totals={summary.totals} target={summary.target} layout="horizontal" />
          </div>
        </>
      )}
    </section>
  );
}

/** Compact highlight tiles — water, workout, best foods (Health “Highlights” row). */
export function TodayHighlights({
  date = todayISO(),
  goal = null,
  onMealLogged,
  className = '',
}: SharedProps) {
  const { summary, plan, loading, reload, setSummary } = useTodayDataContext();

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

  if (loading || !summary) {
    return (
      <div className={`flex h-32 items-center justify-center ${className}`}>
        <Spinner label="Loading highlights…" />
      </div>
    );
  }

  return (
    <div className={`grouped-section ${className}`}>
      <h2 className="grouped-header">Highlights</h2>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
        <HighlightTile className="min-w-[200px] lg:min-w-0">
          <BestFoodsSubCard
            date={date}
            remaining={summary.remaining}
            goal={goal}
            onLogged={handleMealLogged}
            compact
          />
        </HighlightTile>
        <HighlightTile className="min-w-[200px] lg:min-w-0">
          <WorkoutSubCard
            workout={todaysWorkout}
            hasPlan={!!plan}
            caloriesBurned={summary.caloriesBurned}
          />
        </HighlightTile>
        <HighlightTile className="min-w-[200px] lg:min-w-0">
          <WaterSubCard water={summary.water} onAdd={addWater} />
        </HighlightTile>
      </div>
    </div>
  );
}

/** @deprecated Use TodayDataProvider + TodayHero + TodayHighlights on the dashboard. */
export function TodayContainer(props: SharedProps) {
  return (
    <TodayDataProvider date={props.date} refreshKey={props.refreshKey}>
      <TodayHero date={props.date} className={props.className} />
      <TodayHighlights {...props} className="mt-8" />
    </TodayDataProvider>
  );
}

function HighlightTile({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`grouped-inset flex flex-col p-4 ${className}`}>{children}</div>
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
      <HighlightContent title="Workout">
        <p className="text-sm text-ink-600">
          No plan yet —{' '}
          <Link to="/workouts" className="font-semibold text-accent-500 hover:underline">
            set one up
          </Link>
        </p>
      </HighlightContent>
    );
  }

  if (!workout || isRestDay(workout)) {
    return (
      <HighlightContent title="Workout">
        <p className="flex items-center gap-1.5 text-sm text-ink-600">
          <Moon size={14} aria-hidden />
          Rest day
        </p>
      </HighlightContent>
    );
  }

  if (caloriesBurned > 0) {
    return (
      <HighlightContent title="Workout">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-accent-500">
          <Check size={14} aria-hidden />
          Complete
        </p>
        <p className="mt-1 text-xs text-ink-500">{Math.round(caloriesBurned)} kcal burned</p>
      </HighlightContent>
    );
  }

  const style = focusStyle(workout.focus);

  return (
    <HighlightContent title="Workout">
      <div className="flex items-center gap-2">
        <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-btn ${style.color}`}>
          <FocusIcon focus={workout.focus} size={16} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink-900">{workout.focus}</p>
          <p className="text-xs text-ink-500">
            {workout.exercises.length} exercises · ~{workout.estimatedDurationMin} min
          </p>
        </div>
      </div>
      <button type="button" onClick={start} className="btn-primary mt-3 w-full py-2.5 text-sm">
        Start
      </button>
    </HighlightContent>
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
    <HighlightContent title="Water">
      <p className="text-lg font-semibold tabular-nums text-ink-900">
        {water.totalOz}
        <span className="text-sm font-normal text-ink-500"> / {water.goalOz} oz</span>
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-line-track">
        <div
          className="h-full rounded-full bg-sky-400 transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
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
    </HighlightContent>
  );
}

function HighlightContent({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex h-full min-h-[140px] flex-col">
      <h3 className="card-header mb-3">{title}</h3>
      <div className="flex flex-1 flex-col justify-center">{children}</div>
    </div>
  );
}
