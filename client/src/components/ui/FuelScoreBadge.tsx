import { useState } from 'react';
import { Modal } from '../Modal';
import type { FuelRating, FuelScore } from '../../lib/foodTypes';

const STYLES: Record<FuelRating, { label: string; text: string; bg: string; dot: string }> = {
  excellent: {
    label: 'Excellent',
    text: 'text-accent-600',
    bg: 'bg-accent-100 ring-accent-400/30',
    dot: 'bg-accent-400',
  },
  good: {
    label: 'Good',
    text: 'text-accent-500',
    bg: 'bg-accent-50 ring-accent-200/40',
    dot: 'bg-accent-200',
  },
  fair: {
    label: 'Fair',
    text: 'text-amber-600',
    bg: 'bg-amber-100 ring-amber-400/30',
    dot: 'bg-amber-400',
  },
  poor: {
    label: 'Poor',
    text: 'text-coral-500',
    bg: 'bg-coral-100 ring-coral-400/30',
    dot: 'bg-coral-400',
  },
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
  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  const badge = (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold ring-1 ${pad} ${s.bg} ${s.text}`}
      title={`FuelScore ${score.score}/10 — ${s.label}`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {score.score.toFixed(1)}
      <span className="font-semibold opacity-80">{s.label}</span>
    </span>
  );

  if (!interactive) return badge;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="focus:outline-none">
        {badge}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`FuelScore ${score.score.toFixed(1)} / 10`}>
        <p className={`mb-3 text-sm font-semibold ${s.text}`}>{s.label} quality</p>
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
