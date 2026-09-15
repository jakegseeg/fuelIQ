import { useState } from 'react';
import type { DaySummary } from '../../lib/foodTypes';

interface Props {
  water: DaySummary['water'];
  onAdd: (oz: number) => Promise<void>;
}

const QUICK = [8, 16, 32];

/** Water tracker with an animated wave fill (spec 6.2). */
export function WaterWidget({ water, onAdd }: Props) {
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  const pct = water.goalOz > 0 ? Math.min(100, Math.round((water.totalOz / water.goalOz) * 100)) : 0;

  const add = async (oz: number) => {
    if (oz <= 0 || busy) return;
    setBusy(true);
    try {
      await onAdd(oz);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold">Water</h3>
        <span className="text-sm font-semibold text-ink-600 tabular-nums">
          {water.totalOz} / {water.goalOz} oz
        </span>
      </div>

      <div className="mt-4 flex items-center gap-4">
        {/* Wave fill cylinder */}
        <div className="relative h-24 w-24 flex-none overflow-hidden rounded-2xl bg-surface2 ring-1 ring-ink-200">
          <div
            className="absolute inset-x-0 bottom-0 transition-[height] duration-500"
            style={{ height: `${pct}%` }}
          >
            <svg
              className="absolute -top-3 left-0 h-4 w-[200%] animate-wave"
              viewBox="0 0 120 20"
              preserveAspectRatio="none"
              fill="#3A8FA8"
            >
              <path d="M0 10 Q15 0 30 10 T60 10 T90 10 T120 10 V20 H0 Z" />
              <path d="M0 10 Q15 0 30 10 T60 10 T90 10 T120 10 V20 H0 Z" transform="translate(60 0)" />
            </svg>
            <div className="h-full w-full bg-sky-400/80" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-lg font-extrabold text-ink-900 mix-blend-difference tabular-nums">
              {pct}%
            </span>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap gap-2">
            {QUICK.map((oz) => (
              <button
                key={oz}
                onClick={() => add(oz)}
                disabled={busy}
                className="btn-pill disabled:opacity-50"
              >
                +{oz} oz
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              className="w-20 rounded-lg border border-ink-200 bg-surface2 px-2 py-1.5 text-sm text-ink-900"
              type="number"
              min="0"
              placeholder="oz"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
            <button
              onClick={() => {
                const oz = Number(custom);
                if (oz > 0) {
                  void add(oz);
                  setCustom('');
                }
              }}
              disabled={busy || !custom}
              className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
