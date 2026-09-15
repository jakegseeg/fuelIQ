import { useState } from 'react';
import type { CheckinRecord } from '../lib/progressTypes';

interface Props {
  checkin: CheckinRecord | null;
  onGenerate: (force: boolean) => Promise<void>;
}

function formatWeek(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function CheckinCard({ checkin, onGenerate }: Props) {
  const [busy, setBusy] = useState(false);

  const run = async (force: boolean) => {
    setBusy(true);
    try {
      await onGenerate(force);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">Weekly check-in</h3>
          {checkin && (
            <p className="text-xs text-ink-600">
              Week of {formatWeek(checkin.weekStart)}
              {checkin.source === 'claude' ? ' · Coach summary' : ' · Weekly summary'}
            </p>
          )}
        </div>
        {checkin && (
          <button
            onClick={() => run(true)}
            disabled={busy}
            className="btn-ghost flex-none px-2 py-1 text-xs disabled:opacity-50"
          >
            {busy ? '…' : 'Refresh'}
          </button>
        )}
      </div>

      {checkin ? (
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-ink-700">
          {checkin.content.split(/\n\n+/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-sm text-ink-600">
            Get a personalized 3-paragraph review of your week — what went well, what to improve, and a
            plan for next week.
          </p>
          <button
            onClick={() => run(false)}
            disabled={busy}
            className="btn-primary mt-3 w-full"
          >
            {busy ? 'Writing your review…' : 'Generate weekly check-in'}
          </button>
        </div>
      )}
    </div>
  );
}
