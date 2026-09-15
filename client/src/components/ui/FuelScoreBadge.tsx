import { useState } from 'react';
import { Modal } from '../Modal';
import type { FuelRating, FuelScore } from '../../lib/foodTypes';

const STYLES: Record<FuelRating, { label: string; bg: string }> = {
  excellent: { label: 'Excellent', bg: 'bg-accent-400 text-white' },
  good: { label: 'Good', bg: 'bg-warning text-white' },
  fair: { label: 'Fair', bg: 'bg-warning text-white' },
  poor: { label: 'Poor', bg: 'bg-error text-white' },
};

interface Props {
  score: FuelScore;
  size?: 'sm' | 'md';
  interactive?: boolean;
}

/** Color-coded FuelScore badge with an optional breakdown drawer (spec 6.2). */
export function FuelScoreBadge({ score, size = 'sm', interactive = true }: Props) {
  const [open, setOpen] = useState(false);
  const s = STYLES[score.rating];
  const pad = size === 'sm' ? 'px-2.5 py-0.5 text-xs font-semibold' : 'px-2.5 py-1 text-sm font-semibold';

  const badge = (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${pad} ${s.bg}`}
      title={`FuelScore ${score.score}/10 — ${s.label}`}
    >
      {score.score.toFixed(1)}
      <span className="font-semibold opacity-90">{s.label}</span>
    </span>
  );

  if (!interactive) return badge;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="focus:outline-none">
        {badge}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`FuelScore ${score.score.toFixed(1)} / 10`}>
        <p className={`mb-3 inline-flex rounded-full px-2.5 py-0.5 text-sm font-semibold ${s.bg}`}>
          {s.label} quality
        </p>
        <ul className="space-y-2">
          {score.components.map((c) => (
            <li key={c.key} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-ink-800">{c.label}</p>
                <p className="truncate text-xs text-ink-600">{c.detail}</p>
              </div>
              <span className="flex-none font-bold tabular-nums text-ink-700">
                {c.score == null ? '—' : `${c.score.toFixed(1)}`}
              </span>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
