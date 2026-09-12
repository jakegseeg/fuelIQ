import { useState } from 'react';
import { FuelScoreBadge } from './FuelScoreBadge';
import { MEAL_LABELS, type LogEntry, type MealGroup } from '../../lib/foodTypes';

interface Props {
  group: MealGroup;
  onAdd: () => void;
  onDelete: (id: number) => void;
  defaultOpen?: boolean;
}

/** Collapsible meal group with subtotal (spec 6.2). */
export function MealSection({ group, onAdd, onDelete, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <svg
            viewBox="0 0 20 20"
            className={`h-4 w-4 text-ink-600 transition-transform ${open ? 'rotate-90' : ''}`}
            fill="currentColor"
          >
            <path d="M7 5l6 5-6 5z" />
          </svg>
          <h2 className="font-display font-bold">{MEAL_LABELS[group.meal]}</h2>
          <span className="text-xs text-ink-600">({group.entries.length})</span>
        </div>
        <span className="text-sm font-semibold text-ink-600 tabular-nums">
          {group.subtotal.calories} kcal
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {group.entries.length === 0 ? (
            <p className="py-3 text-center text-sm text-ink-600">Nothing logged yet.</p>
          ) : (
            group.entries.map((e) => <EntryRow key={e.id} entry={e} onDelete={onDelete} />)
          )}
          <button
            onClick={onAdd}
            className="mt-1 w-full rounded-xl border-2 border-dashed border-ink-200 py-2.5 text-sm font-semibold text-accent-300 transition hover:border-accent-400/50 hover:bg-accent-400/5"
          >
            + Add food
          </button>
        </div>
      )}
    </section>
  );
}

function EntryRow({ entry, onDelete }: { entry: LogEntry; onDelete: (id: number) => void }) {
  return (
    <div className="group flex items-center gap-3 rounded-xl bg-surface2 p-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-ink-900">{entry.name}</p>
          <FuelScoreBadge score={entry.fuelScore} />
        </div>
        <p className="truncate text-xs text-ink-600">
          {entry.servingLabel} · {entry.calories} kcal
        </p>
      </div>
      <div className="flex flex-none items-center gap-1">
        <span className="rounded-md chip-mint px-1.5 py-0.5 text-[11px] font-bold">
          {entry.protein}P
        </span>
        <span className="rounded-md bg-amber-400/15 px-1.5 py-0.5 text-[11px] font-bold text-amber-300">
          {entry.carbs}C
        </span>
        <span className="rounded-md bg-indigo-400/15 px-1.5 py-0.5 text-[11px] font-bold text-indigo-300">
          {entry.fat}F
        </span>
      </div>
      <button
        onClick={() => onDelete(entry.id)}
        className="flex-none rounded-lg p-1.5 text-ink-600 hover:bg-ink-200 hover:text-coral-400"
        aria-label="Remove entry"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
          <path d="M6.3 6.3a1 1 0 0 1 1.4 0L10 8.6l2.3-2.3a1 1 0 1 1 1.4 1.4L11.4 10l2.3 2.3a1 1 0 0 1-1.4 1.4L10 11.4l-2.3 2.3a1 1 0 0 1-1.4-1.4L8.6 10 6.3 7.7a1 1 0 0 1 0-1.4z" />
        </svg>
      </button>
    </div>
  );
}
