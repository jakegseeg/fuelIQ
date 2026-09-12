import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Zap } from 'lucide-react';
import { Modal } from './Modal';
import { BarcodeScanner } from './BarcodeScanner';
import { FuelScoreBadge } from './FuelScore';
import { Spinner } from './Spinner';
import { api } from '../lib/api';
import {
  buildSuggestedMeal,
  logMealNutrition,
  type SuggestedGroceryMeal,
} from '../lib/groceryMealCatalog';
import type { GroceryMealSlot } from '../lib/groceryTypes';
import {
  buildCustomFoodFromForm,
  EMPTY_MANUAL_FOOD_FORM,
  type ManualFoodForm,
} from '../lib/buildCustomFood';
import { isGenericFood } from '../lib/genericFoods';
import {
  MEAL_LABELS,
  totalsForQuantity,
  type DaySummary,
  type FoodItem,
  type FuelScore,
  type MealSlot,
  type ScoredFood,
} from '../lib/foodTypes';

type Tab = 'search' | 'recent' | 'frequent' | 'custom';
const OZ_TO_G = 28.3495;
const TRACKER_SLOTS: GroceryMealSlot[] = ['breakfast', 'lunch', 'dinner'];

function isTrackerSlot(meal: MealSlot): meal is GroceryMealSlot {
  return TRACKER_SLOTS.includes(meal as GroceryMealSlot);
}

interface Props {
  open: boolean;
  onClose: () => void;
  date: string;
  meal: MealSlot;
  onAdded: (day: DaySummary) => void;
  /** Skip search and open serving config for this food when the modal opens. */
  initialPick?: { food: FoodItem; fuelScore?: FuelScore } | null;
}

export function FoodSearchModal({ open, onClose, date, meal, onAdded, initialPick = null }: Props) {
  const [tab, setTab] = useState<Tab>('search');
  const [selected, setSelected] = useState<{ food: FoodItem; fuelScore?: FuelScore } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [searchPrefill, setSearchPrefill] = useState('');
  const [suggested, setSuggested] = useState<SuggestedGroceryMeal | null>(null);
  const [suggestedLoading, setSuggestedLoading] = useState(false);
  const [loggingSuggested, setLoggingSuggested] = useState(false);
  const [suggestedError, setSuggestedError] = useState<string | null>(null);

  // Reset transient state whenever the modal opens.
  useEffect(() => {
    if (open) {
      setTab('search');
      setSelected(initialPick ?? null);
      setScanning(false);
      setSearchPrefill('');
      setSuggestedError(null);
      setLoggingSuggested(false);
    }
  }, [open, initialPick]);

  useEffect(() => {
    if (!open || !isTrackerSlot(meal)) {
      setSuggested(null);
      setSuggestedLoading(false);
      return;
    }

    let cancelled = false;
    setSuggestedLoading(true);
    api
      .getGroceryPlan()
      .then((plan) => {
        if (cancelled) return;
        setSuggested(buildSuggestedMeal(plan, date, meal));
      })
      .catch(() => {
        if (!cancelled) setSuggested(null);
      })
      .finally(() => {
        if (!cancelled) setSuggestedLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, date, meal]);

  const handleLogSuggested = async () => {
    if (!suggested || !isTrackerSlot(meal)) return;
    setLoggingSuggested(true);
    setSuggestedError(null);
    try {
      const day = await logMealNutrition(
        date,
        meal,
        suggested.name,
        suggested.macros,
        suggested.householdSize,
      );
      onAdded(day);
      onClose();
    } catch (e) {
      setSuggestedError(e instanceof Error ? e.message : 'Could not log meal');
    } finally {
      setLoggingSuggested(false);
    }
  };

  const title = selected
    ? `Add to ${MEAL_LABELS[meal]}`
    : `Add food · ${MEAL_LABELS[meal]}`;

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-xl">
      {selected ? (
        <ServingConfig
          food={selected.food}
          fuelScore={selected.fuelScore}
          date={date}
          meal={meal}
          onBack={() => setSelected(null)}
          onAdded={(day) => {
            onAdded(day);
            onClose();
          }}
        />
      ) : scanning ? (
        <BarcodeView
          onBack={() => setScanning(false)}
          onFound={(food) => {
            setScanning(false);
            setSelected({ food, fuelScore: food.fuelScore });
          }}
          onSearchInstead={(code) => {
            setScanning(false);
            setTab('search');
            setSearchPrefill(code);
          }}
        />
      ) : (
        <div>
          {isTrackerSlot(meal) && suggestedLoading && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-surface2 px-3 py-2.5 text-sm text-ink-600 ring-1 ring-ink-200/60">
              <Spinner label="" />
              Checking grocery plan…
            </div>
          )}
          {isTrackerSlot(meal) && suggested && !suggestedLoading && (
            <SuggestedMealCard
              suggestion={suggested}
              logging={loggingSuggested}
              error={suggestedError}
              onLog={() => void handleLogSuggested()}
            />
          )}
          <Browse
            tab={tab}
            setTab={setTab}
            searchPrefill={searchPrefill}
            onScan={() => setScanning(true)}
            onPick={(f) => setSelected({ food: f, fuelScore: f.fuelScore })}
            onPickCustom={(f) => setSelected({ food: f })}
          />
        </div>
      )}
    </Modal>
  );
}

function SuggestedMealCard({
  suggestion,
  logging,
  error,
  onLog,
}: {
  suggestion: SuggestedGroceryMeal;
  logging: boolean;
  error: string | null;
  onLog: () => void;
}) {
  const { macros } = suggestion;
  return (
    <div className="mb-4 rounded-xl bg-accent-400/8 p-4 ring-1 ring-accent-400/25">
      <div className="flex items-start gap-2">
        <span className="flex items-center leading-none" aria-hidden>
          <Zap size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-accent-300">
            Suggested for today
          </p>
          <p className="mt-1 font-semibold text-ink-900">{suggestion.name}</p>
          {suggestion.ingredientSummary && (
            <p className="mt-0.5 truncate text-xs text-ink-600">{suggestion.ingredientSummary}</p>
          )}
          <p className="mt-2 text-xs tabular-nums text-ink-600">
            {Math.round(macros.calories)} kcal · {Math.round(macros.protein)}P ·{' '}
            {Math.round(macros.carbs)}C · {Math.round(macros.fat)}F
          </p>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-coral-300">{error}</p>}
      <button
        type="button"
        onClick={onLog}
        disabled={logging}
        className="btn-accent mt-3 w-full py-2 text-sm"
      >
        {logging ? 'Logging…' : 'Log this meal'}
      </button>
    </div>
  );
}

// --- Browse (tabs: search / recent / frequent / custom) --------------------

function Browse({
  tab,
  setTab,
  searchPrefill,
  onScan,
  onPick,
  onPickCustom,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  searchPrefill?: string;
  onScan: () => void;
  onPick: (food: ScoredFood) => void;
  onPickCustom: (food: FoodItem) => void;
}) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'search', label: 'Search' },
    { id: 'recent', label: 'Recent' },
    { id: 'frequent', label: 'Frequent' },
    { id: 'custom', label: 'Custom' },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <div className="flex flex-1 gap-1 overflow-x-auto rounded-xl bg-ink-100 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                tab === t.id ? 'bg-accent-500 text-white shadow-sm' : 'text-ink-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={onScan}
          className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-brand-500 text-white hover:bg-brand-600"
          title="Scan barcode"
          aria-label="Scan barcode"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 5v14M7 5v14M11 5v14M15 5v14M19 5v14M21 5v14" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {tab === 'search' && (
        <SearchTab onPick={onPick} onPickCustom={onPickCustom} initialQuery={searchPrefill} />
      )}
      {tab === 'recent' && <ListTab loader={() => api.recentFoods()} empty="Nothing logged yet." onPick={onPick} />}
      {tab === 'frequent' && (
        <ListTab loader={() => api.frequentFoods()} empty="Log foods to see your favorites." onPick={onPick} />
      )}
      {tab === 'custom' && <CustomTab onSubmit={onPickCustom} />}
    </div>
  );
}

function SearchTab({
  onPick,
  onPickCustom,
  initialQuery = '',
}: {
  onPick: (f: ScoredFood) => void;
  onPickCustom: (food: FoodItem) => void;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    if (initialQuery) setQuery(initialQuery);
  }, [initialQuery]);
  const [results, setResults] = useState<ScoredFood[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setShowManual(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      api
        .searchFoods(q)
        .then((foods) => active && setResults(foods))
        .catch(() => active && setError('Search failed. Check your connection.'))
        .finally(() => active && setLoading(false));
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  const genericResults = useMemo(
    () => results.filter((f) => isGenericFood(f.barcode)),
    [results],
  );
  const packagedResults = useMemo(
    () => results.filter((f) => !isGenericFood(f.barcode)),
    [results],
  );
  const q = query.trim();
  const searched = q.length >= 2;
  const noResults = searched && !loading && !error && results.length === 0;

  return (
    <div>
      <div className="flex gap-2">
        <input
          autoFocus
          className="field-input flex-1"
          placeholder="Search foods (e.g. chicken breast, rice)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setShowManual((v) => !v)}
          className="btn-ghost flex-none whitespace-nowrap px-3 text-xs"
        >
          Custom food
        </button>
      </div>

      {showManual && (
        <div className="mt-4 rounded-xl border border-accent-400/30 bg-accent-400/5 p-4">
          <ManualFoodFormPanel
            title="Add custom food"
            onSubmit={(food) => {
              onPickCustom(food);
              setShowManual(false);
            }}
            onCancel={() => setShowManual(false)}
          />
        </div>
      )}

      <div className="mt-3 space-y-4">
        {loading && (
          <div className="py-8">
            <Spinner label="Searching foods…" />
          </div>
        )}
        {error && <p className="text-sm font-medium text-coral-300">{error}</p>}

        {noResults && !showManual && (
          <div className="rounded-xl border border-dashed border-ink-200 bg-surface2 p-4">
            <p className="text-center text-sm font-medium text-ink-600">
              Can&apos;t find it? Add it manually
            </p>
            <p className="mt-1 text-center text-xs text-ink-600">
              Enter the name and macros for a quick one-off entry.
            </p>
            <div className="mt-4">
              <ManualFoodFormPanel
                compact
                onSubmit={(food) => onPickCustom(food)}
              />
            </div>
          </div>
        )}

        {searched && !loading && !error && genericResults.length > 0 && (
          <ResultSection title="Generic foods" subtitle="Common whole foods & staples">
            {genericResults.map((f, i) => (
              <FoodRow key={`g-${f.barcode ?? f.name}-${i}`} food={f} onClick={() => onPick(f)} />
            ))}
          </ResultSection>
        )}

        {searched && !loading && !error && packagedResults.length > 0 && (
          <ResultSection
            title={genericResults.length > 0 ? 'Packaged & branded' : 'Search results'}
            subtitle="From Open Food Facts"
          >
            {packagedResults.map((f, i) => (
              <FoodRow key={`p-${f.barcode ?? f.name}-${i}`} food={f} onClick={() => onPick(f)} />
            ))}
          </ResultSection>
        )}

        {searched && !loading && !error && results.length > 0 && (
          <p className="text-center text-xs text-ink-600">
            Not what you need?{' '}
            <button
              type="button"
              className="font-semibold text-accent-300 hover:underline"
              onClick={() => setShowManual(true)}
            >
              Add it manually
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

function ResultSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-accent-300">{title}</h3>
        {subtitle && <p className="text-[11px] text-ink-600">{subtitle}</p>}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ListTab({
  loader,
  empty,
  onPick,
}: {
  loader: () => Promise<ScoredFood[]>;
  empty: string;
  onPick: (f: ScoredFood) => void;
}) {
  const [foods, setFoods] = useState<ScoredFood[] | null>(null);
  useEffect(() => {
    loader()
      .then(setFoods)
      .catch(() => setFoods([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!foods) return <div className="py-8"><Spinner /></div>;
  if (foods.length === 0) return <p className="py-6 text-center text-sm text-ink-600">{empty}</p>;
  return (
    <div className="space-y-2">
      {foods.map((f, i) => (
        <FoodRow key={`${f.name}-${i}`} food={f} onClick={() => onPick(f)} />
      ))}
    </div>
  );
}

function FoodRow({ food, onClick }: { food: ScoredFood; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-ink-200 bg-surface2 p-3 text-left transition hover:border-accent-400/40 hover:shadow-glow"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink-900">{food.name}</p>
        <p className="truncate text-xs text-ink-600">
          {food.brand ? `${food.brand} · ` : ''}
          {Math.round(food.per100.calories)} kcal / 100 g
        </p>
      </div>
      <FuelScoreBadge score={food.fuelScore} interactive={false} />
    </button>
  );
}

// --- Manual / custom food entry --------------------------------------------

function ManualFoodFormPanel({
  title = "Can't find it? Add it manually",
  compact,
  onSubmit,
  onCancel,
}: {
  title?: string;
  compact?: boolean;
  onSubmit: (food: FoodItem) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<ManualFoodForm>({ ...EMPTY_MANUAL_FOOD_FORM });
  const set = (k: keyof ManualFoodForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    const food = buildCustomFoodFromForm(form);
    if (food) onSubmit(food);
  };

  const valid = !!buildCustomFoodFromForm(form);

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {!compact && <p className="text-sm font-semibold text-ink-800">{title}</p>}
      {!compact && (
        <p className="text-sm text-ink-600">Enter macros for one serving. We&apos;ll compute its FuelScore.</p>
      )}
      <div>
        <label className="field-label">Food name</label>
        <input
          className="field-input"
          type="text"
          placeholder="e.g. Homemade chili"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Serving size (g)</label>
          <input
            className="field-input"
            type="number"
            min="1"
            value={form.servingG}
            onChange={(e) => set('servingG', e.target.value)}
          />
        </div>
        <div>
          <label className="field-label">Calories (kcal)</label>
          <input
            className="field-input"
            type="number"
            min="0"
            value={form.calories}
            onChange={(e) => set('calories', e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="field-label">Protein (g)</label>
          <input
            className="field-input"
            type="number"
            min="0"
            value={form.protein}
            onChange={(e) => set('protein', e.target.value)}
          />
        </div>
        <div>
          <label className="field-label">Carbs (g)</label>
          <input
            className="field-input"
            type="number"
            min="0"
            value={form.carbs}
            onChange={(e) => set('carbs', e.target.value)}
          />
        </div>
        <div>
          <label className="field-label">Fat (g)</label>
          <input
            className="field-input"
            type="number"
            min="0"
            value={form.fat}
            onChange={(e) => set('fat', e.target.value)}
          />
        </div>
      </div>
      <div className={`flex gap-2 ${compact ? '' : 'pt-1'}`}>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-ghost flex-1">
            Cancel
          </button>
        )}
        <button
          type="button"
          className={`btn-accent ${onCancel ? 'flex-1' : 'w-full'}`}
          disabled={!valid}
          onClick={submit}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function CustomTab({ onSubmit }: { onSubmit: (food: FoodItem) => void }) {
  return (
    <ManualFoodFormPanel
      title="Custom food"
      onSubmit={onSubmit}
    />
  );
}

// --- Barcode ---------------------------------------------------------------

function BarcodeView({
  onBack,
  onFound,
  onSearchInstead,
}: {
  onBack: () => void;
  onFound: (food: ScoredFood) => void;
  onSearchInstead: (query: string) => void;
}) {
  const [looking, setLooking] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const handled = useRef(false);

  const onDetected = async (code: string) => {
    if (handled.current) return;
    handled.current = true;
    setLooking(true);
    setLastCode(code);
    setMsg(`Looking up ${code} in Open Food Facts…`);
    try {
      const food = await api.lookupBarcode(code);
      if (food) {
        onFound(food);
      } else {
        setMsg(`No product found for barcode ${code}.`);
        handled.current = false;
      }
    } catch {
      setMsg('Lookup failed. Check your connection or search manually.');
      handled.current = false;
    } finally {
      setLooking(false);
    }
  };

  const retry = () => {
    handled.current = false;
    setMsg(null);
    setLastCode(null);
  };

  return (
    <div>
      <button onClick={onBack} className="mb-3 text-sm font-semibold text-accent-300">
        ← Back to search
      </button>
      <BarcodeScanner onDetected={onDetected} onError={(m) => setMsg(m)} />
      {looking && (
        <div className="mt-3">
          <Spinner />
        </div>
      )}
      {msg && (
        <div className="mt-4 rounded-xl bg-surface2 p-4 text-center text-sm text-ink-600 ring-1 ring-ink-200">
          <p>{msg}</p>
          {lastCode && !looking && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={retry} className="btn-ghost text-xs">
                Scan again
              </button>
              <button
                type="button"
                onClick={() => onSearchInstead(lastCode)}
                className="btn-accent text-xs"
              >
                Search manually
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Serving configuration -------------------------------------------------

function ServingConfig({
  food,
  fuelScore,
  date,
  meal,
  onBack,
  onAdded,
}: {
  food: FoodItem;
  fuelScore?: FuelScore;
  date: string;
  meal: MealSlot;
  onBack: () => void;
  onAdded: (day: DaySummary) => void;
}) {
  const options = food.servingOptions.length
    ? food.servingOptions
    : [{ label: '100 g', grams: 100 }];
  const [optionIndex, setOptionIndex] = useState(0);
  const [count, setCount] = useState('1');
  const [customMode, setCustomMode] = useState(false);
  const [customAmount, setCustomAmount] = useState(String(food.defaultServingG || 100));
  const [customUnit, setCustomUnit] = useState<'g' | 'oz'>('g');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { grams, servingLabel } = useMemo(() => {
    if (customMode) {
      const amount = Number(customAmount) || 0;
      const g = customUnit === 'oz' ? amount * OZ_TO_G : amount;
      return { grams: g, servingLabel: `${amount} ${customUnit}` };
    }
    const opt = options[optionIndex];
    const n = Number(count) || 0;
    return { grams: opt.grams * n, servingLabel: n === 1 ? opt.label : `${n} × ${opt.label}` };
  }, [customMode, customAmount, customUnit, options, optionIndex, count]);

  const totals = totalsForQuantity(food.per100, grams);

  const add = async () => {
    if (grams <= 0) return;
    setSaving(true);
    setError(null);
    try {
      const { day } = await api.addEntry(date, meal, food, Math.round(grams * 100) / 100, servingLabel);
      onAdded(day);
    } catch {
      setError('Could not add this food. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div>
      <button onClick={onBack} className="mb-3 text-sm font-semibold text-brand-600">
        ← Back to results
      </button>

      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold leading-tight">{food.name}</h3>
          {food.brand && <p className="text-sm text-ink-600">{food.brand}</p>}
        </div>
        {fuelScore && <FuelScoreBadge score={fuelScore} size="md" />}
      </div>

      <div className="space-y-3">
        {!customMode ? (
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div>
              <label className="field-label">Serving</label>
              <select
                className="field-input"
                value={optionIndex}
                onChange={(e) => setOptionIndex(Number(e.target.value))}
              >
                {options.map((o, i) => (
                  <option key={i} value={i}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <label className="field-label">Qty</label>
              <input
                className="field-input"
                type="number"
                min="0"
                step="0.5"
                value={count}
                onChange={(e) => setCount(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div>
              <label className="field-label">Amount</label>
              <input
                className="field-input"
                type="number"
                min="0"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
              />
            </div>
            <div className="w-28">
              <label className="field-label">Unit</label>
              <select
                className="field-input"
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value as 'g' | 'oz')}
              >
                <option value="g">grams</option>
                <option value="oz">oz</option>
              </select>
            </div>
          </div>
        )}

        <button
          onClick={() => setCustomMode((m) => !m)}
          className="text-sm font-semibold text-brand-600"
        >
          {customMode ? 'Use serving sizes' : 'Enter custom grams / oz'}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2 rounded-2xl bg-ink-50 p-4 text-center">
        <Macro label="Calories" value={totals.calories} unit="" />
        <Macro label="Protein" value={totals.protein} unit="g" />
        <Macro label="Carbs" value={totals.carbs} unit="g" />
        <Macro label="Fat" value={totals.fat} unit="g" />
      </div>

      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}

      <button className="btn-primary mt-5 w-full" onClick={add} disabled={saving || grams <= 0}>
        {saving ? 'Adding…' : `Add ${Math.round(grams)} g to ${MEAL_LABELS[meal]}`}
      </button>
    </div>
  );
}

function Macro({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div>
      <p className="text-base font-extrabold text-ink-900">
        {Math.round(value)}
        <span className="text-xs font-semibold text-ink-600">{unit}</span>
      </p>
      <p className="text-[11px] text-ink-600">{label}</p>
    </div>
  );
}
