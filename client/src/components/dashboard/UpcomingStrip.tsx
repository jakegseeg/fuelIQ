import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';
import { Modal } from '../Modal';
import { Spinner } from '../Spinner';
import { api } from '../../lib/api';
import { getMealIngredients, logPlannedMeal } from '../../lib/groceryMealCatalog';
import type {
  GroceryMealSlot,
  GroceryPlanRecord,
  UpcomingIconKind,
  UpcomingItem,
  UpcomingMealDetail,
} from '../../lib/groceryTypes';
import { MEAL_LABELS, type MealSlot } from '../../lib/foodTypes';
import { MealSlotIcon } from '../../lib/mealSlotIcon';
import type { DayPlan, WorkoutPlanRecord } from '../../lib/workoutTypes';

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const DEFAULT_MEAL_TIMES: Record<'breakfast' | 'lunch' | 'dinner', string> = {
  breakfast: '07:00',
  lunch: '12:30',
  dinner: '18:00',
};

function tomorrowISO(): string {
  const now = new Date();
  const d = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function weekdayName(iso: string): string {
  return WEEKDAY_NAMES[new Date(iso + 'T12:00:00').getDay()];
}

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function sortKey(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

function isRestDay(workout: DayPlan): boolean {
  return /rest|recovery|off day/i.test(workout.focus) || workout.exercises.length === 0;
}

function mealDetailFromPlan(
  plan: GroceryPlanRecord,
  date: string,
  slot: GroceryMealSlot,
  fallbackName: string,
): UpcomingMealDetail | undefined {
  const day = plan.mealPlan.find((d) => d.date === date);
  const scheduled = day?.meals[slot];
  if (!scheduled) return undefined;

  return {
    mealId: scheduled.mealId,
    slot,
    date,
    name: scheduled.name || fallbackName,
    macros: scheduled.macros,
    ingredients: getMealIngredients(scheduled.mealId),
  };
}

function mealsFromGroceryPlan(plan: GroceryPlanRecord | null, date: string): UpcomingItem[] {
  if (!plan?.days?.length) return [];
  const day = plan.days.find((d) => d.date === date);
  if (!day?.meals.length) return [];

  return day.meals.map((meal) => {
    const time = meal.scheduledTime || DEFAULT_MEAL_TIMES[meal.slot];
    const name = meal.name || MEAL_LABELS[meal.slot as MealSlot];
    return {
      id: `meal-${meal.slot}-${date}`,
      kind: 'meal' as const,
      iconKind: meal.slot,
      name,
      timeLabel: formatTime(time),
      sortTime: time,
      mealDetail: mealDetailFromPlan(plan, date, meal.slot, name),
    };
  });
}

function workoutFromPlan(plan: WorkoutPlanRecord | null, date: string): UpcomingItem | null {
  if (!plan) return null;
  const name = weekdayName(date);
  const day = plan.plan.weeklySchedule.find((d) => d.day === name);
  if (!day || isRestDay(day)) return null;

  const time = day.preferredTime ?? '17:00';
  return {
    id: `workout-${date}`,
    kind: 'workout',
    iconKind: 'workout',
    name: day.focus,
    timeLabel: formatTime(time),
    sortTime: time,
  };
}

interface Props {
  className?: string;
}

export function UpcomingStrip({ className = '' }: Props) {
  const navigate = useNavigate();
  const [groceryPlan, setGroceryPlan] = useState<GroceryPlanRecord | null>(null);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMeal, setSelectedMeal] = useState<UpcomingMealDetail | null>(null);

  const tomorrow = tomorrowISO();

  const reload = useCallback(async () => {
    const [grocery, workout] = await Promise.all([api.getGroceryPlan(), api.getActivePlan()]);
    setGroceryPlan(grocery);
    setWorkoutPlan(workout);
  }, []);

  useEffect(() => {
    setLoading(true);
    reload().finally(() => setLoading(false));
  }, [reload]);

  const hasGroceryPlan = groceryPlan != null;
  const hasWorkoutPlan = workoutPlan != null;

  const items = useMemo(() => {
    const mealItems = hasGroceryPlan ? mealsFromGroceryPlan(groceryPlan, tomorrow) : [];
    const workoutItem = hasWorkoutPlan ? workoutFromPlan(workoutPlan, tomorrow) : null;
    const all = workoutItem ? [...mealItems, workoutItem] : mealItems;
    return all.sort((a, b) => sortKey(a.sortTime) - sortKey(b.sortTime));
  }, [groceryPlan, workoutPlan, hasGroceryPlan, hasWorkoutPlan, tomorrow]);

  const showEmptyState = !hasGroceryPlan && !hasWorkoutPlan;

  return (
    <>
      <div
        className={`flex min-h-[140px] flex-col surface-card p-3 ${className}`}
      >
        <header className="mb-3 flex flex-none items-center justify-between gap-2">
          <p className="section-label">Upcoming</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-700">Tomorrow</p>
        </header>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner label="Loading upcoming…" />
          </div>
        ) : showEmptyState ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-ink-600">Nothing scheduled yet</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link
                to="/grocery"
                className="rounded-full bg-surface2 px-3 py-1.5 text-xs font-semibold text-ink-700 ring-1 ring-ink-200 transition hover:bg-ink-200/50"
              >
                Set up Grocery Plan
              </Link>
              <Link
                to="/workouts"
                className="rounded-full bg-surface2 px-3 py-1.5 text-xs font-semibold text-ink-700 ring-1 ring-ink-200 transition hover:bg-ink-200/50"
              >
                Generate Workout Plan
              </Link>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-ink-600">Nothing scheduled for tomorrow</p>
          </div>
        ) : (
          <div className="-mx-1 flex min-h-0 flex-1 items-center justify-center gap-3 overflow-x-auto px-1">
            {items.map((item) => (
              <UpcomingCard
                key={item.id}
                item={item}
                onMealClick={setSelectedMeal}
                onWorkoutClick={() => navigate('/workouts')}
              />
            ))}
          </div>
        )}
      </div>

      <MealDetailModal
        open={selectedMeal !== null}
        detail={selectedMeal}
        onClose={() => setSelectedMeal(null)}
      />
    </>
  );
}

function UpcomingItemIcon({ iconKind, size = 20 }: { iconKind: UpcomingIconKind; size?: number }) {
  if (iconKind === 'workout') return <Dumbbell size={size} aria-hidden />;
  return <MealSlotIcon slot={iconKind} size={size} />;
}

function UpcomingCard({
  item,
  onMealClick,
  onWorkoutClick,
}: {
  item: UpcomingItem;
  onMealClick: (detail: UpcomingMealDetail) => void;
  onWorkoutClick: () => void;
}) {
  const isMeal = item.kind === 'meal' && item.mealDetail;
  const isWorkout = item.kind === 'workout';

  const handleClick = () => {
    if (isMeal && item.mealDetail) onMealClick(item.mealDetail);
    else if (isWorkout) onWorkoutClick();
  };

  const interactive = isMeal || isWorkout;

  return (
    <button
      type="button"
      onClick={interactive ? handleClick : undefined}
      disabled={!interactive}
      className={`flex w-[88px] flex-none flex-col items-center justify-center rounded-[10px] bg-surface px-2 py-3 ring-1 ring-ink-200/70 ${
        interactive
          ? 'cursor-pointer transition hover:bg-surface2 hover:ring-accent-400/40 active:scale-[0.98]'
          : 'cursor-default opacity-80'
      }`}
    >
      <span className="flex items-center justify-center leading-none" aria-hidden>
        <UpcomingItemIcon iconKind={item.iconKind} size={20} />
      </span>
      <p className="mt-2 line-clamp-2 w-full text-center text-[11px] font-semibold leading-tight text-ink-900">
        {item.name}
      </p>
      <p className="mt-1 text-[10px] text-ink-600">{item.timeLabel}</p>
    </button>
  );
}

function MealDetailModal({
  open,
  detail,
  onClose,
}: {
  open: boolean;
  detail: UpcomingMealDetail | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
      setLogging(false);
    }
  }, [open]);

  if (!detail) return null;

  const slotLabel = MEAL_LABELS[detail.slot as MealSlot];
  const { macros } = detail;

  const handleLog = async () => {
    setLogging(true);
    setError(null);
    try {
      await logPlannedMeal(detail);
      onClose();
      navigate('/log');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not log meal');
    } finally {
      setLogging(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={detail.name} maxWidth="max-w-sm">
      <div className="space-y-4">
        <p className="text-sm font-semibold text-accent-300">{slotLabel}</p>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-600">Per serving</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <MacroPill label="Calories" value={`${Math.round(macros.calories)} kcal`} />
            <MacroPill label="Protein" value={`${Math.round(macros.protein)} g`} />
            <MacroPill label="Carbs" value={`${Math.round(macros.carbs)} g`} />
            <MacroPill label="Fat" value={`${Math.round(macros.fat)} g`} />
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-600">Ingredients</p>
          {detail.ingredients.length === 0 ? (
            <p className="mt-2 text-sm text-ink-600">No ingredient list available</p>
          ) : (
            <ul className="mt-2 divide-y divide-ink-200 overflow-hidden rounded-xl ring-1 ring-ink-200/60">
              {detail.ingredients.map((ing) => (
                <li
                  key={ing.displayName}
                  className="flex items-center justify-between gap-3 bg-surface2 px-3 py-2.5 text-sm"
                >
                  <span className="font-medium text-ink-900">{ing.displayName}</span>
                  <span className="text-xs text-ink-600">{ing.quantity}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <p className="text-sm text-coral-300">{error}</p>}

        <button
          type="button"
          onClick={() => void handleLog()}
          disabled={logging}
          className="btn-primary w-full"
        >
          {logging ? 'Logging…' : 'Log this meal'}
        </button>
      </div>
    </Modal>
  );
}

function MacroPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface2 px-3 py-2 ring-1 ring-ink-200/50">
      <p className="text-[10px] font-semibold uppercase text-ink-600">{label}</p>
      <p className="font-semibold tabular-nums text-ink-900">{value}</p>
    </div>
  );
}
