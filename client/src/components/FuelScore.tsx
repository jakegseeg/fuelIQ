import { useState } from 'react';
import { Modal } from './Modal';
import { RATING_STYLES, type FuelScore } from '../lib/foodTypes';

interface BadgeProps {
  score: FuelScore;
  size?: 'sm' | 'md';
  /** When true, clicking opens the score breakdown drawer. */
  interactive?: boolean;
}

export function FuelScoreBadge({ score, size = 'sm', interactive = true }: BadgeProps) {
  const [open, setOpen] = useState(false);
  const style = RATING_STYLES[score.rating];
  const pad = size === 'sm' ? 'px-2.5 py-0.5 text-xs font-semibold' : 'px-2.5 py-1 text-sm font-semibold';

  const badge = (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${pad} ${style.badge}`}
      title={`FuelScore ${score.score}/10 — ${style.label}`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {score.score.toFixed(1)}
      <span className="font-semibold opacity-80">{style.label}</span>
    </span>
  );

  if (!interactive) return badge;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="focus:outline-none">
        {badge}
      </button>
      <FuelScoreDrawer open={open} onClose={() => setOpen(false)} score={score} />
    </>
  );
}

function FuelScoreDrawer({
  open,
  onClose,
  score,
}: {
  open: boolean;
  onClose: () => void;
  score: FuelScore;
}) {
  const style = RATING_STYLES[score.rating];
  return (
    <Modal open={open} onClose={onClose} title="FuelScore breakdown" maxWidth="max-w-md">
      <div className="mb-5 flex items-center gap-4">
        <div
          className={`flex h-16 w-16 flex-col items-center justify-center rounded-md ${style.badge}`}
        >
          <span className="text-2xl font-bold tabular-nums leading-none">{score.score.toFixed(1)}</span>
          <span className="text-[10px] font-bold uppercase">{style.label}</span>
        </div>
        <p className="text-sm text-ink-600">
          A 1–10 nutritional quality score averaging six factors. Only factors with available
          data are counted.
        </p>
      </div>

      <ul className="space-y-3">
        {score.components.map((c) => (
          <li key={c.key}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-semibold text-ink-800">{c.label}</span>
              <span className="text-ink-600">
                {c.score == null ? 'No data' : `${c.score.toFixed(1)}/10`}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
              <div
                className={`h-full rounded-full ${c.score == null ? 'bg-ink-200' : 'bg-accent-200'}`}
                style={{ width: `${((c.score ?? 0) / 10) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-ink-600">{c.detail}</p>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
