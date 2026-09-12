import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { Spinner } from '../components/Spinner';
import { MacroBar } from '../components/ui/MacroBar';
import { MealSection } from '../components/ui/MealSection';
import { WaterWidget } from '../components/ui/WaterWidget';
import { FoodSearchModal } from '../components/modals/FoodSearchModal';
import { SuggestionsSection } from '../components/SuggestionsSection';
import { MealsPanel } from '../components/MealsPanel';
import { api } from '../lib/api';
import { type DaySummary, type MealSlot, type Suggestion } from '../lib/foodTypes';

function todayISO(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function LogPage() {
  const [date, setDate] = useState(todayISO);
  const [day, setDay] = useState<DaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalMeal, setModalMeal] = useState<MealSlot | null>(null);

  const reload = useCallback(async () => {
    const d = await api.getDay(date);
    setDay(d);
    return d;
  }, [date]);

  useEffect(() => {
    setLoading(true);
    reload().finally(() => setLoading(false));
  }, [reload]);

  const shiftDay = (delta: number) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  };

  const deleteEntry = async (id: number) => setDay(await api.deleteEntry(id, date));

  const addWater = async (oz: number) => {
    await api.addWater(date, oz);
    await reload();
  };

  const quickAddSuggestion = async (s: Suggestion) => {
    const { day: updated } = await api.addEntry(date, 'snacks', s.food, s.suggestedServingG);
    setDay(updated);
  };

  const actions = (
    <div className="flex items-center gap-1">
      <button onClick={() => shiftDay(-1)} className="rounded-lg p-2 hover:bg-surface2" aria-label="Previous day">
        ‹
      </button>
      <input
        type="date"
        value={date}
        max={todayISO()}
        onChange={(e) => setDate(e.target.value)}
        className="rounded-lg border border-ink-200 bg-surface px-2 py-1 text-sm font-medium text-ink-800"
      />
      <button onClick={() => shiftDay(1)} className="rounded-lg p-2 hover:bg-surface2" aria-label="Next day">
        ›
      </button>
      <button
        onClick={() => setDate(todayISO())}
        className="ml-1 rounded-lg px-2 py-1 text-sm font-semibold text-accent-300 hover:bg-accent-400/10"
      >
        Today
      </button>
    </div>
  );

  return (
    <AppShell title="Log Food" actions={actions}>
      {loading || !day ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner label="Loading your day…" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {!day.target && (
              <div className="rounded-card bg-amber-400/10 p-4 text-sm text-amber-300 ring-1 ring-amber-400/30">
                Finish your{' '}
                <Link to="/onboarding" className="font-bold underline">
                  profile setup
                </Link>{' '}
                to unlock calorie targets and smart suggestions.
              </div>
            )}
            {day.meals.map((group) => (
              <MealSection
                key={group.meal}
                group={group}
                onAdd={() => setModalMeal(group.meal)}
                onDelete={deleteEntry}
              />
            ))}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <DailySummaryCard day={day} />
            <WaterWidget water={day.water} onAdd={addWater} />
            <SuggestionsSection
              remaining={day.remaining}
              goal={day.goal}
              onQuickAdd={quickAddSuggestion}
            />
            <MealsPanel day={day} date={date} onChanged={setDay} />
          </aside>
        </div>
      )}

      <FoodSearchModal
        open={modalMeal !== null}
        meal={modalMeal ?? 'breakfast'}
        date={date}
        onClose={() => setModalMeal(null)}
        onAdded={setDay}
      />
    </AppShell>
  );
}

function DailySummaryCard({ day }: { day: DaySummary }) {
  const { totals, target, remaining } = day;
  const calGoal = target?.calories ?? 0;
  const remainingCal = remaining?.calories ?? 0;

  return (
    <div className="card">
      <h3 className="font-display font-bold">Daily summary</h3>
      <div className="mt-2 flex items-end justify-between">
        <div>
          <p className="font-display text-3xl font-extrabold leading-none text-ink-900">
            {target ? remainingCal.toLocaleString() : totals.calories.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-ink-600">{target ? 'calories remaining' : 'calories consumed'}</p>
        </div>
        {target && (
          <p className="text-right text-xs text-ink-600">
            {totals.calories.toLocaleString()} / {calGoal.toLocaleString()} kcal
          </p>
        )}
      </div>

      {target && (
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface2">
          <div
            className={`h-full rounded-full ${totals.calories > calGoal ? 'bg-coral-400' : 'bg-accent-400'}`}
            style={{ width: `${calGoal > 0 ? Math.min(100, (totals.calories / calGoal) * 100) : 0}%` }}
          />
        </div>
      )}

      <div className="mt-5 space-y-3">
        <MacroBar macro="protein" value={totals.protein} goal={target?.protein ?? 0} />
        <MacroBar macro="carbs" value={totals.carbs} goal={target?.carbs ?? 0} />
        <MacroBar macro="fat" value={totals.fat} goal={target?.fat ?? 0} />
      </div>

      <div className="mt-4 border-t border-ink-200 pt-3 text-xs text-ink-600">
        {day.caloriesBurned > 0 ? (
          <p>
            Net calories:{' '}
            <span className="font-bold text-ink-800">{day.netCalories.toLocaleString()}</span> kcal (
            {totals.calories.toLocaleString()} eaten − {day.caloriesBurned.toLocaleString()} burned{' '}
            <Flame size={14} className="inline" aria-hidden />)
          </p>
        ) : (
          <p>
            Net calories: {totals.calories.toLocaleString()} kcal —{' '}
            <Link to="/workouts" className="font-semibold text-accent-300">
              log a workout
            </Link>{' '}
            to bank more.
          </p>
        )}
      </div>
    </div>
  );
}
