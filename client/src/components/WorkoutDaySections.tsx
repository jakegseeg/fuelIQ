import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { DayPlan } from '../lib/workoutTypes';

export function SessionOverviewSection({ day }: { day: DayPlan }) {
  const [open, setOpen] = useState(false);
  if (!day.sessionOverview) return null;
  return (
    <div className="mb-4 rounded-xl border border-line-card bg-surface2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="text-sm font-bold text-ink-800">Why this workout?</span>
        <ChevronDown size={16} className={open ? 'rotate-180' : ''} aria-hidden />
      </button>
      {open && (
        <p className="border-t border-line-card px-4 pb-3 pt-2 text-sm leading-relaxed text-ink-600">
          {day.sessionOverview}
        </p>
      )}
    </div>
  );
}

export function TimeTradeoffBanner({
  onApply,
}: {
  onApply: (mode: 'shorter_rest' | 'fewer_sets') => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const apply = async (mode: 'shorter_rest' | 'fewer_sets') => {
    setBusy(true);
    try {
      await onApply(mode);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-semibold">Short on time?</p>
      <p className="mt-1 text-amber-800/90">
        We defaulted to fewer exercises. Want to instead:
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => apply('shorter_rest')}
          className="btn-secondary text-xs disabled:opacity-50"
        >
          Shorter rest periods
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => apply('fewer_sets')}
          className="btn-secondary text-xs disabled:opacity-50"
        >
          Fewer sets
        </button>
      </div>
    </div>
  );
}
