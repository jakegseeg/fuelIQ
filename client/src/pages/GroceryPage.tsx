import { useCallback, useEffect, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../components/Modal';
import { AppShell } from '../components/layout/AppShell';
import { Spinner } from '../components/Spinner';
import { api } from '../lib/api';
import { getGroceryMealDetail, fetchGroceryMealDetail, logMealNutrition } from '../lib/groceryMealCatalog';
import type {
  GenerateGroceryInput,
  GroceryCategory,
  GroceryListCategory,
  GroceryMealSlot,
  GroceryPlanRecord,
  MealPlanDay,
  MealSwapAlternative,
  PantryExcludedItem,
  ScheduledMeal,
} from '../lib/groceryTypes';

const PANTRY_STAPLES: { label: string; value: string }[] = [
  { label: 'Salt', value: 'salt' },
  { label: 'Pepper', value: 'pepper' },
  { label: 'Olive oil', value: 'olive oil' },
  { label: 'Butter', value: 'butter' },
  { label: 'Garlic', value: 'garlic' },
  { label: 'Onion', value: 'onion' },
  { label: 'Soy sauce', value: 'soy sauce' },
  { label: 'Mayo', value: 'mayo' },
  { label: 'Honey', value: 'honey' },
  { label: 'Peanut butter', value: 'peanut butter' },
  { label: 'Salsa', value: 'salsa' },
  { label: 'Hot sauce', value: 'hot sauce' },
  { label: 'Cumin', value: 'cumin' },
  { label: 'Paprika', value: 'paprika' },
  { label: 'Cinnamon', value: 'cinnamon' },
];

function normalizePantryTerm(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

function pantryDisplayLabel(value: string): string {
  const staple = PANTRY_STAPLES.find((s) => s.value === value);
  if (staple) return staple.label;
  return value
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const SLOTS: GroceryMealSlot[] = ['breakfast', 'lunch', 'dinner'];
const SLOT_LABELS: Record<GroceryMealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

const CATEGORY_HEADINGS: Record<GroceryCategory, string> = {
  protein: 'PROTEIN',
  produce: 'PRODUCE',
  dairy: 'DAIRY',
  grains: 'GRAINS & PANTRY',
};

export function GroceryPage() {
  const [plan, setPlan] = useState<GroceryPlanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState<'meals' | 'list'>('meals');
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const p = await api.getGroceryPlan();
    setPlan(p);
    return p;
  }, []);

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);

  const generate = async (input: GenerateGroceryInput) => {
    setError(null);
    setGenerating(true);
    try {
      const p = await api.generateGroceryPlan(input);
      setPlan({ ...p, alreadyHave: p.alreadyHave ?? [] });
      setTab('meals');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate plan');
    } finally {
      setGenerating(false);
    }
  };

  const regenerate = async () => {
    await api.deleteGroceryPlan();
    setPlan(null);
    setTab('meals');
  };

  const actions = plan ? (
    <button type="button" onClick={() => void regenerate()} className="btn-ghost py-2 text-sm">
      Regenerate plan
    </button>
  ) : undefined;

  return (
    <AppShell
      title="Grocery Plan"
      subtitle="What to buy this week"
      maxWidth="max-w-6xl"
      actions={actions}
    >
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner label="Loading grocery plan…" />
        </div>
      ) : !plan ? (
        <SetupForm onGenerate={generate} generating={generating} error={error} />
      ) : (
        <PlanView plan={plan} tab={tab} onTab={setTab} onPlanUpdated={setPlan} />
      )}
    </AppShell>
  );
}

function SetupForm({
  onGenerate,
  generating,
  error,
}: {
  onGenerate: (input: GenerateGroceryInput) => Promise<void>;
  generating: boolean;
  error: string | null;
}) {
  const [budget, setBudget] = useState('75');
  const [householdSize, setHouseholdSize] = useState(1);
  const [location, setLocation] = useState('');
  const [pantry, setPantry] = useState<string[]>([]);
  const [pantryLoading, setPantryLoading] = useState(true);

  useEffect(() => {
    api
      .getPantry()
      .then(setPantry)
      .catch(() => setPantry([]))
      .finally(() => setPantryLoading(false));
  }, []);

  const updatePantry = useCallback(async (next: string[]) => {
    setPantry(next);
    try {
      await api.savePantry(next);
    } catch {
      /* keep local state; user can still generate */
    }
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const b = Number(budget);
    if (!Number.isFinite(b) || b <= 0) return;
    try {
      await api.savePantry(pantry);
    } catch {
      /* pantry save is best-effort; plan generation should still explain any blocking issue */
    }
    await onGenerate({
      budget: b,
      householdSize,
      location: location.trim() || 'United States',
    });
  };

  return (
    <div className="mx-auto max-w-lg">
      <form onSubmit={(e) => void submit(e)} className="card space-y-5">
        <div>
          <label className="field-label" htmlFor="budget">
            Weekly budget
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-600">
              $
            </span>
            <input
              id="budget"
              type="number"
              min={15}
              step={5}
              required
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="field-input pl-8"
            />
          </div>
        </div>

        <div>
          <label className="field-label">How many people is this budget for?</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setHouseholdSize((n) => Math.max(1, n - 1))}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface2 text-lg font-bold text-ink-700 ring-1 ring-ink-200"
            >
              −
            </button>
            <span className="min-w-[2rem] text-center font-display text-2xl font-bold tabular-nums text-ink-900">
              {householdSize}
            </span>
            <button
              type="button"
              onClick={() => setHouseholdSize((n) => Math.min(10, n + 1))}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface2 text-lg font-bold text-ink-700 ring-1 ring-ink-200"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="location">
            General location
          </label>
          <input
            id="location"
            type="text"
            placeholder="Provo, UT"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="field-input"
          />
          <p className="mt-1 text-xs text-ink-600">Used for minor regional price adjustments</p>
        </div>

        <PantrySection
          items={pantry}
          loading={pantryLoading}
          onChange={(items) => void updatePantry(items)}
        />

        <div className="rounded-xl bg-surface2 px-3 py-2.5 text-sm text-ink-600 ring-1 ring-ink-200/60">
          <span className="font-semibold text-ink-700">Meals per day:</span> 3 — Breakfast, Lunch,
          Dinner
        </div>

        {error && <p className="text-sm text-coral-300">{error}</p>}

        <button type="submit" disabled={generating} className="btn-primary w-full">
          {generating ? 'Generating…' : 'Generate my grocery plan'}
        </button>
      </form>
    </div>
  );
}

function PantrySection({
  items,
  loading,
  onChange,
}: {
  items: string[];
  loading: boolean;
  onChange: (items: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  const addItem = (raw: string) => {
    const norm = normalizePantryTerm(raw);
    if (!norm || items.includes(norm)) return;
    onChange([...items, norm].sort((a, b) => a.localeCompare(b)));
  };

  const removeItem = (item: string) => {
    onChange(items.filter((i) => i !== item));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem(draft);
      setDraft('');
    }
  };

  return (
    <div>
      <label className="field-label" htmlFor="pantry-input">
        What I already have
      </label>
      <p className="mb-2 text-xs text-ink-600">
        Items you own won&apos;t appear on your grocery list or count toward the total.
      </p>

      {loading ? (
        <p className="text-xs text-ink-600">Loading pantry…</p>
      ) : (
        <>
          {items.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {items.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 rounded-full bg-accent-400/12 px-2.5 py-1 text-xs font-semibold text-accent-300 ring-1 ring-accent-400/25"
                >
                  {pantryDisplayLabel(item)}
                  <button
                    type="button"
                    onClick={() => removeItem(item)}
                    className="rounded-full p-0.5 text-accent-500/80 hover:bg-accent-100 hover:text-accent-500"
                    aria-label={`Remove ${pantryDisplayLabel(item)}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <input
            id="pantry-input"
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder='Type an ingredient and press Enter (e.g. "salt")'
            className="field-input"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {PANTRY_STAPLES.map((staple) => {
              const owned = items.includes(staple.value);
              return (
                <button
                  key={staple.value}
                  type="button"
                  disabled={owned}
                  onClick={() => addItem(staple.value)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition ${
                    owned
                      ? 'cursor-default bg-surface2 text-ink-600 ring-ink-200/40'
                      : 'bg-surface2 text-ink-700 ring-ink-200 hover:bg-ink-200/50 hover:text-ink-900'
                  }`}
                >
                  {staple.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function PlanView({
  plan,
  tab,
  onTab,
  onPlanUpdated,
}: {
  plan: GroceryPlanRecord;
  tab: 'meals' | 'list';
  onTab: (t: 'meals' | 'list') => void;
  onPlanUpdated: (plan: GroceryPlanRecord) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex gap-2 border-b border-ink-200 pb-2">
        <TabButton active={tab === 'meals'} onClick={() => onTab('meals')}>
          Meal Plan
        </TabButton>
        <TabButton active={tab === 'list'} onClick={() => onTab('list')}>
          Grocery List
        </TabButton>
      </div>

      {tab === 'meals' ? (
        <MealPlanTab plan={plan} onPlanUpdated={onPlanUpdated} />
      ) : (
        <GroceryListTab plan={plan} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
        active
          ? 'bg-accent-400/12 text-accent-300 ring-1 ring-accent-400/30'
          : 'text-ink-600 hover:bg-surface2 hover:text-ink-800'
      }`}
    >
      {children}
    </button>
  );
}

function MealPlanTab({
  plan,
  onPlanUpdated,
}: {
  plan: GroceryPlanRecord;
  onPlanUpdated: (plan: GroceryPlanRecord) => void;
}) {
  const [selected, setSelected] = useState<{
    date: string;
    day: string;
    slot: GroceryMealSlot;
    meal: ScheduledMeal;
  } | null>(null);
  const [swapTarget, setSwapTarget] = useState<{
    date: string;
    day: string;
    slot: GroceryMealSlot;
    meal: ScheduledMeal;
  } | null>(null);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {plan.mealPlan.map((day) => (
          <DayColumn
            key={day.date}
            day={day}
            onMealClick={setSelected}
            onSwapClick={setSwapTarget}
          />
        ))}
      </div>

      <div className="rounded-xl bg-surface2 p-4 ring-1 ring-ink-200/60">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-600">
          Daily average vs targets
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <MacroCompare label="Calories" actual={plan.avgDailyMacros.calories} target={plan.targets.calories} unit="kcal" />
          <MacroCompare label="Protein" actual={plan.avgDailyMacros.protein} target={plan.targets.protein} unit="g" />
          <MacroCompare label="Carbs" actual={plan.avgDailyMacros.carbs} target={plan.targets.carbs} unit="g" />
          <MacroCompare label="Fat" actual={plan.avgDailyMacros.fat} target={plan.targets.fat} unit="g" />
        </div>
      </div>

      <PlanMealModal selected={selected} onClose={() => setSelected(null)} />
      <SwapMealModal
        target={swapTarget}
        onClose={() => setSwapTarget(null)}
        onSwapped={(updated) => {
          onPlanUpdated({ ...updated, alreadyHave: updated.alreadyHave ?? [] });
          setSwapTarget(null);
        }}
      />
    </div>
  );
}

function DayColumn({
  day,
  onMealClick,
  onSwapClick,
}: {
  day: MealPlanDay;
  onMealClick: (sel: { date: string; day: string; slot: GroceryMealSlot; meal: ScheduledMeal }) => void;
  onSwapClick: (sel: { date: string; day: string; slot: GroceryMealSlot; meal: ScheduledMeal }) => void;
}) {
  return (
    <div className="rounded-xl bg-surface2 p-3 ring-1 ring-ink-200/50">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-600">{day.day}</p>
      <div className="mt-2 space-y-2">
        {SLOTS.map((slot) => (
          <MealCard
            key={slot}
            slot={slot}
            meal={day.meals[slot]}
            onClick={() =>
              onMealClick({ date: day.date, day: day.day, slot, meal: day.meals[slot] })
            }
            onSwap={() =>
              onSwapClick({ date: day.date, day: day.day, slot, meal: day.meals[slot] })
            }
          />
        ))}
      </div>
    </div>
  );
}

function MealCard({
  slot,
  meal,
  onClick,
  onSwap,
}: {
  slot: GroceryMealSlot;
  meal: MealPlanDay['meals'][GroceryMealSlot];
  onClick: () => void;
  onSwap: () => void;
}) {
  return (
    <div className="rounded-lg bg-surface ring-1 ring-ink-200/40 transition hover:ring-accent-400/20">
      <div className="flex items-start justify-between gap-1 px-2.5 pt-2">
        <p className="text-[10px] font-semibold uppercase text-ink-600">{SLOT_LABELS[slot]}</p>
        <div className="flex items-center gap-1">
          {meal.isLeftover && (
            <span className="chip-neutral text-[10px]">
              Leftover
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSwap();
            }}
            className="btn-secondary px-2 py-0.5 text-[10px]"
          >
            Swap
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={onClick}
        className="w-full px-2.5 pb-2.5 pt-1 text-left transition active:scale-[0.99]"
      >
        <p className="text-xs font-semibold leading-snug text-ink-900">{meal.name}</p>
        <p className="mt-1 text-[10px] text-ink-600">${meal.costPerServing.toFixed(2)}/serving</p>
        <p className="text-[10px] tabular-nums text-ink-600">
          {Math.round(meal.macros.protein)}P · {Math.round(meal.macros.carbs)}C ·{' '}
          {Math.round(meal.macros.fat)}F
        </p>
      </button>
    </div>
  );
}

function SwapMealModal({
  target,
  onClose,
  onSwapped,
}: {
  target: {
    date: string;
    day: string;
    slot: GroceryMealSlot;
    meal: ScheduledMeal;
  } | null;
  onClose: () => void;
  onSwapped: (plan: GroceryPlanRecord) => void;
}) {
  const [alternatives, setAlternatives] = useState<MealSwapAlternative[]>([]);
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) {
      setAlternatives([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    api
      .getGrocerySwapAlternatives(target.date, target.slot)
      .then(setAlternatives)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load alternatives'))
      .finally(() => setLoading(false));
  }, [target]);

  if (!target) return null;

  const choose = async (mealId: string) => {
    setSwapping(mealId);
    setError(null);
    try {
      const updated = await api.swapGroceryMeal({
        date: target.date,
        slot: target.slot,
        mealId,
      });
      onSwapped(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not swap meal');
    } finally {
      setSwapping(null);
    }
  };

  return (
    <Modal
      open={target !== null}
      onClose={onClose}
      title={`Swap · ${target.day} ${SLOT_LABELS[target.slot]}`}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <p className="text-sm text-ink-600">
          Currently: <span className="font-semibold text-ink-800">{target.meal.name}</span>
        </p>

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner label="Finding alternatives…" />
          </div>
        ) : alternatives.length === 0 ? (
          <p className="rounded-xl bg-surface2 px-3 py-4 text-sm text-ink-600 ring-1 ring-ink-200/60">
            No swap options available for this slot right now.
          </p>
        ) : (
          <ul className="space-y-3">
            {alternatives.map((alt) => (
              <li
                key={alt.mealId}
                className="rounded-xl bg-surface2 p-3 ring-1 ring-ink-200/60"
              >
                <p className="font-semibold text-ink-900">{alt.name}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-ink-600">{alt.description}</p>
                <p className="mt-1 text-[10px] text-ink-600">
                  ${alt.costPerServing.toFixed(2)}/serving ·{' '}
                  {Math.round(alt.macros.protein)}P · {Math.round(alt.macros.carbs)}C ·{' '}
                  {Math.round(alt.macros.fat)}F
                </p>
                <button
                  type="button"
                  disabled={swapping !== null}
                  onClick={() => void choose(alt.mealId)}
                  className="btn-primary mt-2 w-full py-2 text-sm"
                >
                  {swapping === alt.mealId ? 'Updating…' : 'Choose this meal'}
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="text-sm text-coral-300">{error}</p>}

        <button type="button" onClick={onClose} className="btn-ghost w-full">
          Keep original
        </button>
      </div>
    </Modal>
  );
}

function PlanMealModal({
  selected,
  onClose,
}: {
  selected: {
    date: string;
    day: string;
    slot: GroceryMealSlot;
    meal: ScheduledMeal;
  } | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ReturnType<typeof getGroceryMealDetail>>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!selected) {
      setError(null);
      setLogging(false);
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    void fetchGroceryMealDetail(selected.meal.mealId)
      .then(setDetail)
      .finally(() => setDetailLoading(false));
  }, [selected]);

  if (!selected) return null;

  const { meal, slot, day, date } = selected;
  const slotLabel = SLOT_LABELS[slot];
  const thumbnailUrl = meal.thumbnailUrl ?? detail?.thumbnailUrl;

  const handleLog = async () => {
    setLogging(true);
    setError(null);
    try {
      await logMealNutrition(date, slot, meal.name, meal.macros);
      onClose();
      navigate('/log');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not log meal');
    } finally {
      setLogging(false);
    }
  };

  return (
    <Modal open={selected !== null} onClose={onClose} title={meal.name} maxWidth="max-w-md">
      <div className="space-y-5">
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt={meal.name}
            className="h-40 w-full rounded-xl object-cover ring-1 ring-ink-200/60"
          />
        )}

        <p className="text-sm font-semibold text-accent-300">
          {day} {slotLabel}
        </p>

        <div className="flex flex-wrap gap-3 text-sm tabular-nums">
          <span className="font-semibold text-ink-900">{Math.round(meal.macros.calories)} kcal</span>
          <span className="text-ink-600">·</span>
          <span className="text-ink-700">{Math.round(meal.macros.protein)}g protein</span>
          <span className="text-ink-600">·</span>
          <span className="text-ink-700">{Math.round(meal.macros.carbs)}g carbs</span>
          <span className="text-ink-600">·</span>
          <span className="text-ink-700">{Math.round(meal.macros.fat)}g fat</span>
        </div>

        <p className="text-sm text-ink-600">
          <span className="font-semibold text-ink-800">Estimated cost:</span> $
          {meal.costPerServing.toFixed(2)}/serving
        </p>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-600">Ingredients</p>
          {detailLoading ? (
            <div className="mt-2 flex justify-center py-4">
              <Spinner label="Loading recipe…" />
            </div>
          ) : detail && detail.ingredients.length > 0 ? (
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
          ) : (
            <p className="mt-2 text-sm text-ink-600">No ingredient list available</p>
          )}
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-600">Instructions</p>
          {detailLoading ? null : detail && detail.instructions.length > 0 ? (
            detail.instructions.length === 1 ? (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
                {detail.instructions[0]}
              </p>
            ) : (
              <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-700">
                {detail.instructions.map((step, i) => (
                  <li key={`${i}-${step.slice(0, 24)}`}>{step}</li>
                ))}
              </ol>
            )
          ) : (
            !detailLoading && <p className="mt-2 text-sm text-ink-600">No instructions available</p>
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

function MacroCompare({
  label,
  actual,
  target,
  unit,
}: {
  label: string;
  actual: number;
  target: number;
  unit: string;
}) {
  return (
    <div>
      <p className="text-ink-600">{label}</p>
      <p className="font-semibold tabular-nums text-ink-900">
        {Math.round(actual)} {unit}
        <span className="text-ink-600"> / {Math.round(target)}</span>
      </p>
    </div>
  );
}

function GroceryListTab({ plan }: { plan: GroceryPlanRecord }) {
  const underBudget = plan.totalCost <= plan.budget;
  const alreadyHave = plan.alreadyHave ?? [];

  return (
    <div className="space-y-5">
      {plan.groceryList.map((cat) => (
        <CategorySection key={cat.category} category={cat} />
      ))}

      {alreadyHave.length > 0 && <AlreadyHaveSection items={alreadyHave} />}

      <div
        className={`rounded-xl p-4 ring-1 ${
          underBudget
            ? 'bg-accent-400/10 ring-accent-400/30'
            : 'bg-coral-400/10 ring-coral-400/30'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-ink-900">Estimated total</p>
          <p className={`font-display text-xl font-bold tabular-nums ${underBudget ? 'text-accent-300' : 'text-coral-300'}`}>
            ${plan.totalCost.toFixed(2)}
            <span className="text-sm font-semibold text-ink-600"> / ${plan.budget.toFixed(0)} budget</span>
          </p>
        </div>
        <p className={`mt-1 text-sm ${underBudget ? 'text-accent-400/90' : 'text-coral-300'}`}>
          {underBudget ? 'Within your weekly budget' : 'Over budget — regenerate with a higher budget or review swaps'}
        </p>
      </div>
    </div>
  );
}

function AlreadyHaveSection({ items }: { items: PantryExcludedItem[] }) {
  return (
    <section className="rounded-xl bg-surface2 p-4 ring-1 ring-ink-200/60">
      <h3 className="text-sm font-bold text-ink-800">Already have</h3>
      <p className="mt-0.5 text-xs text-ink-600">
        Excluded from your grocery list and cost estimate
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <li
            key={item.key}
            className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-ink-700 ring-1 ring-ink-200/60"
          >
            {item.name}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CategorySection({ category }: { category: GroceryListCategory }) {
  if (category.items.length === 0) return null;
  return (
    <section>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-600">
        {CATEGORY_HEADINGS[category.category]}
      </h3>
      <ul className="divide-y divide-ink-200 overflow-hidden rounded-xl ring-1 ring-ink-200/60">
        {category.items.map((item) => (
          <li key={item.key} className="flex items-center justify-between gap-3 bg-surface2 px-4 py-3">
            <div>
              <p className="font-semibold text-ink-900">{item.name}</p>
              <p className="text-xs text-ink-600">{item.quantity}</p>
            </div>
            <p className="flex-none font-semibold tabular-nums text-ink-800">
              ${item.estimatedPrice.toFixed(2)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
