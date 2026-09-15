import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Moon } from 'lucide-react';
import { Modal } from '../Modal';
import { FoodSearchModal } from '../modals/FoodSearchModal';
import { Spinner } from '../Spinner';
import { api } from '../../lib/api';
import {
  MEAL_LABELS,
  type DaySummary,
  type LogSummary,
  type MealSlot,
  type TrackerMealSlot,
} from '../../lib/foodTypes';
import { FocusIcon } from '../../lib/focusIcon';
import { focusStyle, type DayPlan, type WorkoutPlanRecord } from '../../lib/workoutTypes';

const TRACKER_MEALS: TrackerMealSlot[] = ['breakfast', 'lunch', 'dinner'];

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

function isRestDay(workout: DayPlan): boolean {
  return /rest|recovery|off day/i.test(workout.focus) || workout.exercises.length === 0;
}

function todaysWorkoutFromPlan(plan: WorkoutPlanRecord | null, date: string): DayPlan | null {
  if (!plan) return null;
  const name = weekdayName(date);
  return plan.plan.weeklySchedule.find((d) => d.day === name) ?? null;
}

function summaryFromDay(day: DaySummary): LogSummary {
  return {
    date: day.date,
    totals: day.totals,
    target: day.target,
    remaining: day.remaining,
    caloriesBurned: day.caloriesBurned,
    netCalories: day.netCalories,
    water: day.water,
    meals: TRACKER_MEALS.map((meal) => {
      const group = day.meals.find((m) => m.meal === meal);
      return {
        meal,
        logged: (group?.entries.length ?? 0) > 0,
        calories: group?.subtotal.calories ?? 0,
      };
    }),
  };
}

function mealSummary(summary: LogSummary, meal: TrackerMealSlot) {
  return summary.meals.find((m) => m.meal === meal) ?? { meal, logged: false, calories: 0 };
}

interface Props {
  date?: string;
  className?: string;
  onUpdate?: () => void;
}

export function DailyTrackerCard({ date = todayISO(), className = '', onUpdate }: Props) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<LogSummary | null>(null);
  const [plan, setPlan] = useState<WorkoutPlanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [foodModalMeal, setFoodModalMeal] = useState<MealSlot | null>(null);

  const reload = useCallback(async () => {
    const [logSummary, activePlan] = await Promise.all([
      api.getLogSummary(date),
      api.getActivePlan(),
    ]);
    setSummary(logSummary);
    setPlan(activePlan);
    return logSummary;
  }, [date]);

  useEffect(() => {
    setLoading(true);
    reload().finally(() => setLoading(false));
  }, [reload]);

  const workout = todaysWorkoutFromPlan(plan, date);
  const hasPlan = !!plan;

  const openFoodModal = (meal: TrackerMealSlot, e?: MouseEvent) => {
    e?.stopPropagation();
    setFoodModalMeal(meal);
  };

  const startWorkout = (e?: MouseEvent) => {
    e?.stopPropagation();
    if (!workout || isRestDay(workout)) return;
    const payload = { date, day: workout };
    sessionStorage.setItem('fueliq.activeWorkout', JSON.stringify(payload));
    navigate('/workouts/active', { state: payload });
  };

  const handleFoodAdded = (day: DaySummary) => {
    setSummary(summaryFromDay(day));
    onUpdate?.();
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setDetailOpen(true)}
        onKeyDown={(e) => e.key === 'Enter' && setDetailOpen(true)}
        className={`flex cursor-pointer flex-col surface-card transition hover:shadow-mid ${className}`}
      >
        {loading || !summary ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner label="Loading tracker…" />
          </div>
        ) : (
          <>
            <p className="section-label">Daily Tracker</p>

            <div className="mt-3 grid flex-1 grid-cols-3 gap-2">
              {TRACKER_MEALS.map((meal) => (
                <MealPill
                  key={meal}
                  meal={meal}
                  summary={mealSummary(summary, meal)}
                  onLog={(m, e) => openFoodModal(m, e)}
                />
              ))}
            </div>

            <WorkoutStrip
              className="mt-3"
              workout={workout}
              hasPlan={hasPlan}
              caloriesBurned={summary.caloriesBurned}
              onStart={startWorkout}
            />
          </>
        )}
      </div>

      {summary && (
        <Modal
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          title="Daily Tracker"
          maxWidth="max-w-md"
        >
          <TrackerContent
            summary={summary}
            workout={workout}
            hasPlan={hasPlan}
            onLogMeal={(meal) => {
              setDetailOpen(false);
              setFoodModalMeal(meal);
            }}
            onStart={() => {
              setDetailOpen(false);
              startWorkout();
            }}
            large
          />
        </Modal>
      )}

      <FoodSearchModal
        open={foodModalMeal !== null}
        onClose={() => setFoodModalMeal(null)}
        date={date}
        meal={foodModalMeal ?? 'breakfast'}
        onAdded={handleFoodAdded}
      />
    </>
  );
}

function MealPill({
  meal,
  summary,
  onLog,
  large = false,
}: {
  meal: TrackerMealSlot;
  summary: { logged: boolean; calories: number };
  onLog: (meal: TrackerMealSlot, e: MouseEvent) => void;
  large?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => onLog(meal, e)}
      className={`flex flex-col items-center justify-center rounded-lg text-center transition ${
        large ? 'gap-1.5 p-4' : 'gap-0.5 p-2'
      } ${
        summary.logged
          ? 'border-2 border-accent-400 bg-[#F0FFF4]'
          : 'border border-line-card bg-surface hover:bg-surface2'
      }`}
    >
      <span className={`font-semibold text-ink-700 ${large ? 'text-sm' : 'text-xs'}`}>
        {MEAL_LABELS[meal]}
      </span>
      {summary.logged ? (
        <>
          <span className={`text-accent-400 ${large ? 'text-lg' : 'text-sm'}`}>
            <Check size={14} aria-hidden />
          </span>
          <span
            className={`font-bold tabular-nums text-ink-900 ${large ? 'text-sm' : 'text-[10px]'}`}
          >
            {summary.calories} kcal
          </span>
        </>
      ) : (
        <>
          <span className={`text-ink-600 ${large ? 'text-base' : 'text-xs'}`}>+</span>
          <span className={`text-ink-700 ${large ? 'text-sm' : 'text-xs'}`}>Not logged</span>
        </>
      )}
    </button>
  );
}

function WorkoutStrip({
  workout,
  hasPlan,
  caloriesBurned,
  onStart,
  className = '',
  large = false,
}: {
  workout: DayPlan | null;
  hasPlan: boolean;
  caloriesBurned: number;
  onStart: (e?: MouseEvent) => void;
  className?: string;
  large?: boolean;
}) {
  if (caloriesBurned > 0) {
    return (
      <div
        className={`flex items-center gap-2 rounded-lg bg-accent-400/10 px-3 py-2 ring-1 ring-accent-400/25 ${className} ${large ? 'py-4' : ''}`}
      >
        <span className={`text-accent-500 ${large ? 'text-base' : 'text-sm'}`}>
          <Check size={14} aria-hidden />
        </span>
        <div>
          <p className={`font-semibold text-accent-500 ${large ? 'text-sm' : 'text-[10px]'}`}>
            Complete
          </p>
          <p className={`text-ink-600 ${large ? 'text-xs' : 'text-[9px]'}`}>
            {Math.round(caloriesBurned)} kcal burned
          </p>
        </div>
      </div>
    );
  }

  if (!hasPlan) {
    return (
      <div
        className={`rounded-lg bg-surface2 px-3 py-2 ring-1 ring-ink-200/50 ${className} ${large ? 'py-4' : ''}`}
      >
        <p className={`text-ink-600 ${large ? 'text-sm' : 'text-[10px]'}`}>No workout plan</p>
      </div>
    );
  }

  if (!workout || isRestDay(workout)) {
    return (
      <div
        className={`rounded-lg bg-surface2 px-3 py-2 ring-1 ring-ink-200/50 ${className} ${large ? 'py-4' : ''}`}
      >
        <p className={`flex items-center gap-1.5 text-ink-600 ${large ? 'text-sm' : 'text-[10px]'}`}>
          <Moon size={14} aria-hidden />
          Rest Day
        </p>
      </div>
    );
  }

  const style = focusStyle(workout.focus);

  return (
    <div
      className={`flex items-center gap-2 rounded-lg bg-surface2 px-3 py-2 ring-1 ring-ink-200/50 ${className} ${large ? 'py-3' : ''}`}
    >
      <span
        className={`flex flex-none items-center justify-center rounded-md ${style.color} ${large ? 'h-10 w-10' : 'h-7 w-7'}`}
      >
        <FocusIcon focus={workout.focus} size={large ? 16 : 14} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate font-semibold text-ink-900 ${large ? 'text-sm' : 'text-xs'}`}>
          {workout.focus}
        </p>
        {!large && (
          <p className="text-xs text-ink-600">
            {workout.exercises.length} exercises · ~{workout.estimatedDurationMin}m
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onStart}
        className={`btn-primary flex-none ${large ? 'px-4 py-2 text-sm' : 'px-2.5 py-1 text-[10px]'}`}
      >
        Start
      </button>
    </div>
  );
}

function TrackerContent({
  summary,
  workout,
  hasPlan,
  onLogMeal,
  onStart,
  large,
}: {
  summary: LogSummary;
  workout: DayPlan | null;
  hasPlan: boolean;
  onLogMeal: (meal: TrackerMealSlot) => void;
  onStart: () => void;
  large?: boolean;
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-600">
        Tap a meal to log food, or start today&apos;s workout below.
      </p>
      <div className={`grid grid-cols-3 ${large ? 'gap-3' : 'gap-2'}`}>
        {TRACKER_MEALS.map((meal) => (
          <MealPill
            key={meal}
            meal={meal}
            summary={mealSummary(summary, meal)}
            onLog={(m, e) => {
              e.stopPropagation();
              onLogMeal(m);
            }}
            large={large}
          />
        ))}
      </div>
      <WorkoutStrip
        workout={workout}
        hasPlan={hasPlan}
        caloriesBurned={summary.caloriesBurned}
        onStart={() => onStart()}
        large={large}
      />
      {workout && !isRestDay(workout) && (
        <p className="text-xs text-ink-600">
          {workout.exercises.length} exercises · ~{workout.estimatedDurationMin} min · ~
          {workout.estimatedCaloriesBurned} kcal estimated
        </p>
      )}
    </div>
  );
}
