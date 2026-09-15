import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { FuelScoreBadge } from './FuelScoreBadge';
import { MEAL_LABELS, type LogEntry, type MealGroup } from '../../lib/foodTypes';

interface Props {
  group: MealGroup;
  onAdd: () => void;
  onDelete: (id: number) => void;
  defaultOpen?: boolean;
}

/** Collapsible meal group — inset grouped list style (iOS / HIG). */
export function MealSection({ group, onAdd, onDelete, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="grouped-section">
      <h2 className="grouped-header">{MEAL_LABELS[group.meal]}</h2>
      <div className="grouped-inset">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="grouped-row w-full justify-between text-left"
          aria-expanded={open}
        >
          <span className="text-sm font-medium text-ink-900">
            {group.entries.length} {group.entries.length === 1 ? 'item' : 'items'}
          </span>
          <span className="flex items-center gap-2 text-sm font-semibold tabular-nums text-ink-600">
            {group.subtotal.calories} kcal
            <ChevronRight
              size={16}
              className={`text-ink-400 transition-transform ${open ? 'rotate-90' : ''}`}
              aria-hidden
            />
          </span>
        </button>

        {open && (
          <>
            {group.entries.length === 0 ? (
              <p className="border-t border-line-card px-4 py-4 text-center text-sm text-ink-500">
                Nothing logged yet.
              </p>
            ) : (
              group.entries.map((e) => <EntryRow key={e.id} entry={e} onDelete={onDelete} />)
            )}
            <div className="border-t border-line-card p-3">
              <button type="button" onClick={onAdd} className="btn-add w-full">
                + Add food
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function EntryRow({ entry, onDelete }: { entry: LogEntry; onDelete: (id: number) => void }) {
  return (
    <div className="grouped-row items-start gap-3 border-t border-line-card py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-ink-900">{entry.name}</p>
          <FuelScoreBadge score={entry.fuelScore} />
        </div>
        <p className="truncate text-xs text-ink-500">
          {entry.servingLabel} · {entry.calories} kcal
        </p>
      </div>
      <div className="flex flex-none items-center gap-1">
        <span className="rounded-full bg-accent-50 px-1.5 py-0.5 text-[11px] font-semibold text-accent-600">
          {entry.protein}P
        </span>
        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-500">
          {entry.carbs}C
        </span>
        <span className="rounded-full bg-coral-100 px-1.5 py-0.5 text-[11px] font-semibold text-error">
          {entry.fat}F
        </span>
      </div>
      <button
        type="button"
        onClick={() => onDelete(entry.id)}
        className="flex h-11 w-11 flex-none items-center justify-center rounded-btn text-ink-500 hover:bg-ink-100 hover:text-error"
        aria-label="Remove entry"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M6.3 6.3a1 1 0 0 1 1.4 0L10 8.6l2.3-2.3a1 1 0 1 1 1.4 1.4L11.4 10l2.3 2.3a1 1 0 0 1-1.4 1.4L10 11.4l-2.3 2.3a1 1 0 0 1-1.4-1.4L8.6 10 6.3 7.7a1 1 0 0 1 0-1.4z" />
        </svg>
      </button>
    </div>
  );
}
