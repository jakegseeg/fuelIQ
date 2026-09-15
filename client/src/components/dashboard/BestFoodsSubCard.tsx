import { useEffect, useState, type MouseEvent } from 'react';
import { Modal } from '../Modal';
import { FuelScoreBadge } from '../ui/FuelScoreBadge';
import { api } from '../../lib/api';
import type { LogSummary, Suggestion } from '../../lib/foodTypes';

function macrosOnTrack(remaining: LogSummary['remaining']): boolean {
  if (!remaining) return false;
  return remaining.protein <= 0 && remaining.carbs <= 0 && remaining.fat <= 0;
}

function fuelScoreExplanation(s: Suggestion): string {
  const highlights = s.fuelScore.components
    .filter((c) => c.score != null && c.score >= 5)
    .map((c) => c.detail.replace(/\.$/, ''))
    .slice(0, 3);
  if (highlights.length > 0) return highlights.join(', ');
  return s.reason.replace(/\s*— fills your .*$/i, '').replace(/\(\d+ g\)\.$/, '');
}

function ingredientList(s: Suggestion): string[] | null {
  if (s.food.source === 'recipe') {
    if (s.food.brand?.includes(',')) {
      return s.food.brand.split(',').map((x) => x.trim()).filter(Boolean);
    }
    return null;
  }
  return null;
}

function fiberForServing(s: Suggestion): number | null {
  const fiber = s.food.per100.fiber;
  if (fiber == null) return null;
  return Math.round(((fiber * s.suggestedServingG) / 100) * 10) / 10;
}

interface Props {
  date: string;
  remaining: LogSummary['remaining'];
  goal: string | null;
  onLogged: () => void | Promise<void>;
}

export function BestFoodsSubCard({ date, remaining, goal, onLogged }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [addingKey, setAddingKey] = useState<string | null>(null);

  const key = remaining
    ? `${Math.round(remaining.protein / 5)}-${Math.round(remaining.carbs / 10)}-${Math.round(
        remaining.fat / 5,
      )}-${goal}`
    : 'none';

  useEffect(() => {
    if (!remaining || macrosOnTrack(remaining)) {
      setSuggestions([]);
      return;
    }
    let active = true;
    setLoading(true);
    api
      .getSuggestions(remaining, goal ?? 'maintain')
      .then((res) => active && setSuggestions(res.suggestions))
      .catch(() => active && setSuggestions([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const onTrack = macrosOnTrack(remaining);
  const preview = suggestions.slice(0, 3);

  const addSuggestion = async (s: Suggestion, e?: MouseEvent) => {
    e?.stopPropagation();
    const itemKey = `${s.food.name}-${s.suggestedServingG}`;
    if (addingKey) return;
    setAddingKey(itemKey);
    try {
      await api.addEntry(date, 'snacks', s.food, s.suggestedServingG);
      await onLogged();
    } finally {
      setAddingKey(null);
    }
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !onTrack && suggestions.length > 0 && setDetailOpen(true)}
        onKeyDown={(e) =>
          e.key === 'Enter' && !onTrack && suggestions.length > 0 && setDetailOpen(true)
        }
        className={`flex min-h-[140px] flex-col rounded-lg bg-surface2 p-3 ring-1 ring-ink-200/50 ${
          !onTrack && suggestions.length > 0
            ? 'cursor-pointer transition hover:ring-ink-300/70'
            : ''
        }`}
      >
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink-700">Best Foods</h3>
          {!onTrack && (
            <span className="chip-status uppercase tracking-wide">
              Smart picks
            </span>
          )}
        </div>

        <div className="min-h-0 flex-1">
          {onTrack ? (
            <p className="text-sm font-semibold text-accent-400">You&apos;re on track!</p>
          ) : loading && preview.length === 0 ? (
            <p className="text-xs text-ink-600">Finding picks…</p>
          ) : preview.length === 0 ? (
            <p className="text-xs text-ink-600">No suggestions yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {preview.map((s, i) => (
                <li
                  key={`${s.food.name}-${i}`}
                  className="flex items-start justify-between gap-2"
                >
                  <p className="min-w-0 flex-1 text-xs font-semibold leading-snug text-ink-900">
                    {s.food.name}
                  </p>
                  <button
                    type="button"
                    disabled={addingKey !== null}
                    onClick={(e) => addSuggestion(s, e)}
                    className="btn-add flex-none disabled:opacity-50"
                  >
                    {addingKey === `${s.food.name}-${s.suggestedServingG}` ? '…' : '+ Add'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <BestFoodsDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        suggestions={suggestions}
        addingKey={addingKey}
        onAdd={addSuggestion}
      />
    </>
  );
}

function BestFoodsDetailModal({
  open,
  onClose,
  suggestions,
  addingKey,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  suggestions: Suggestion[];
  addingKey: string | null;
  onAdd: (s: Suggestion, e?: MouseEvent) => void;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    if (!open) setExpanded(null);
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Best Foods for Today" maxWidth="max-w-md">
      <div className="space-y-2">
        {suggestions.map((s, i) => {
          const isOpen = expanded === i;
          const itemKey = `${s.food.name}-${s.suggestedServingG}`;
          const est = s.estimated;
          const fiber = fiberForServing(s);
          const ingredients = ingredientList(s);

          return (
            <div
              key={itemKey}
              className="card-item overflow-hidden border border-ink-200 bg-surface2 ring-1 ring-ink-200/40"
            >
              <div className="flex items-center gap-2 p-3">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : i)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900">
                    {s.food.name}
                  </p>
                  <FuelScoreBadge score={s.fuelScore} interactive={false} size="sm" />
                </button>
                <button
                  type="button"
                  disabled={addingKey !== null}
                  onClick={(e) => onAdd(s, e)}
                  className="btn-add flex-none disabled:opacity-50"
                >
                  + Add
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  aria-label={isOpen ? 'Collapse' : 'Expand'}
                  className="flex-none rounded-md p-1 text-ink-600 hover:bg-ink-200/50 hover:text-ink-700"
                >
                  <svg
                    viewBox="0 0 20 20"
                    className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="currentColor"
                  >
                    <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z" />
                  </svg>
                </button>
              </div>

              {isOpen && (
                <div className="border-t border-ink-200 px-3 pb-3 pt-2">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div>
                      <dt className="text-ink-600">Calories</dt>
                      <dd className="font-semibold tabular-nums text-ink-900">{est.calories} kcal</dd>
                    </div>
                    <div>
                      <dt className="text-ink-600">Protein</dt>
                      <dd className="font-semibold tabular-nums text-ink-900">{est.protein}g</dd>
                    </div>
                    <div>
                      <dt className="text-ink-600">Carbs</dt>
                      <dd className="font-semibold tabular-nums text-ink-900">{est.carbs}g</dd>
                    </div>
                    <div>
                      <dt className="text-ink-600">Fat</dt>
                      <dd className="font-semibold tabular-nums text-ink-900">{est.fat}g</dd>
                    </div>
                    {fiber != null && (
                      <div>
                        <dt className="text-ink-600">Fiber</dt>
                        <dd className="font-semibold tabular-nums text-ink-900">{fiber}g</dd>
                      </div>
                    )}
                  </dl>

                  <p className="mt-3 text-xs leading-relaxed text-ink-600">
                    {fuelScoreExplanation(s)}
                  </p>

                  {ingredients && ingredients.length > 0 && (
                    <p className="mt-2 text-xs text-ink-600">
                      <span className="font-semibold text-ink-600">Ingredients:</span>{' '}
                      {ingredients.join(', ')}
                    </p>
                  )}

                  <p className="mt-1 text-[11px] text-ink-600">
                    Per suggested serving ({Math.round(s.suggestedServingG)} g)
                  </p>

                  <button
                    type="button"
                    disabled={addingKey !== null}
                    onClick={(e) => onAdd(s, e)}
                    className="btn-primary mt-3 w-full py-2.5 text-sm disabled:opacity-50"
                  >
                    {addingKey === itemKey ? 'Adding…' : '+ Add to log'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-ink-600">
        Suggestions update as you log meals
      </p>
    </Modal>
  );
}
