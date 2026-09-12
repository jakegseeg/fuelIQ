import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { DayPlan } from '../lib/workoutTypes';

export function SessionOverviewSection({ day }: { day: DayPlan }) {
  const [open, setOpen] = useState(false);
  if (!day.sessionOverview) return null;
  return (
    <div className="mb-4 rounded-xl border border-ink-100 bg-ink-50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="text-sm font-bold text-ink-800">Why this workout?</span>
        <ChevronDown size={16} className={open ? 'rotate-180' : ''} aria-hidden />
      </button>
      {open && (
        <p className="border-t border-ink-100 px-4 pb-3 pt-2 text-sm leading-relaxed text-ink-600">
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
          className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100 disabled:opacity-50"
        >
          Shorter rest periods
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => apply('fewer_sets')}
          className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100 disabled:opacity-50"
        >
          Fewer sets
        </button>
      </div>
    </div>
  );
}
