import { useEffect, useState } from 'react';
import { FuelScoreBadge } from './FuelScore';
import { api } from '../lib/api';
import type { MacroTotals, Suggestion } from '../lib/foodTypes';

interface Props {
  remaining: MacroTotals | null;
  goal: string | null;
  onQuickAdd: (suggestion: Suggestion) => Promise<void>;
}

export function SuggestionsSection({ remaining, goal, onQuickAdd }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [source, setSource] = useState<'claude' | 'local' | null>(null);
  const [loading, setLoading] = useState(false);
  const [addingIdx, setAddingIdx] = useState<number | null>(null);

  // Bucket the remaining macros so we don't refetch on every gram change.
  const key = remaining
    ? `${Math.round(remaining.protein / 5)}-${Math.round(remaining.carbs / 10)}-${Math.round(
        remaining.fat / 5,
      )}-${goal}`
    : 'none';

  useEffect(() => {
    if (!remaining) return;
    let active = true;
    setLoading(true);
    api
      .getSuggestions(remaining, goal ?? 'maintain')
      .then((res) => {
        if (!active) return;
        setSuggestions(res.suggestions);
        setSource(res.source);
      })
      .catch(() => active && setSuggestions([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!remaining) return null;

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">Best foods for today</h3>
        {source && (
          <span className="rounded-full chip-mint px-2 py-0.5 text-[11px] font-semibold">
            {source === 'claude' ? 'AI picks' : 'Smart picks'}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-sm text-ink-600">
        Fills your remaining {Math.max(0, Math.round(remaining.protein))}g protein ·{' '}
        {Math.max(0, Math.round(remaining.carbs))}g carbs · {Math.max(0, Math.round(remaining.fat))}g fat.
      </p>

      <div className="mt-4 space-y-2">
        {loading && suggestions.length === 0 && (
          <p className="py-4 text-center text-sm text-ink-600">Finding great options…</p>
        )}
        {suggestions.map((s, i) => (
          <div
            key={`${s.food.name}-${i}`}
            className="flex items-center gap-3 rounded-xl border border-ink-100 p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold text-ink-900">{s.food.name}</p>
                <FuelScoreBadge score={s.fuelScore} interactive={false} />
              </div>
              <p className="truncate text-xs text-ink-600">{s.reason}</p>
              <p className="mt-0.5 text-[11px] text-ink-600">
                ~{s.estimated.calories} kcal · {s.estimated.protein}P / {s.estimated.carbs}C /{' '}
                {s.estimated.fat}F per serving
              </p>
            </div>
            <button
              onClick={async () => {
                setAddingIdx(i);
                try {
                  await onQuickAdd(s);
                } finally {
                  setAddingIdx(null);
                }
              }}
              disabled={addingIdx !== null}
              className="btn-ghost flex-none text-xs disabled:opacity-50"
            >
              {addingIdx === i ? 'Adding…' : '+ Add'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
