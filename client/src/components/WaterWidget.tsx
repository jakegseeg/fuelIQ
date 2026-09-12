import { useState } from 'react';
import type { DaySummary } from '../lib/foodTypes';

interface Props {
  water: DaySummary['water'];
  onAdd: (oz: number) => Promise<void>;
}

const QUICK = [8, 16, 32];

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
        <h3 className="font-bold">Water</h3>
        <span className="text-sm font-semibold text-ink-600">
          {water.totalOz} / {water.goalOz} oz
        </span>
      </div>
      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-sky-100">
        <div
          className="h-full rounded-full bg-sky-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {QUICK.map((oz) => (
          <button
            key={oz}
            onClick={() => add(oz)}
            disabled={busy}
            className="rounded-lg bg-sky-50 px-3 py-1.5 text-sm font-semibold text-ink-800 hover:bg-sky-100 disabled:opacity-50"
          >
            +{oz} oz
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <input
            className="w-20 rounded-lg border border-ink-200 px-2 py-1.5 text-sm"
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
            className="rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
