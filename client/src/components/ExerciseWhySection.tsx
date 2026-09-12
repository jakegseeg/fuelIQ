import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { PlanExercise } from '../lib/workoutTypes';

interface Props {
  exercise: PlanExercise;
  compact?: boolean;
}

export function ExerciseWhySection({ exercise, compact }: Props) {
  const [open, setOpen] = useState(false);
  if (!exercise.sessionReason && !exercise.repExplanation) return null;

  return (
    <div className={compact ? 'mt-2' : 'mt-3'}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg bg-ink-50 px-3 py-2 text-left text-xs font-semibold text-ink-700 transition hover:bg-ink-100"
      >
        <span>Why this exercise?</span>
        <ChevronDown
          size={14}
          className={`flex-none transition ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-lg border border-ink-100 bg-surface px-3 py-2.5 text-xs leading-relaxed text-ink-600">
          {exercise.sessionReason && <p>{exercise.sessionReason}</p>}
          {exercise.repExplanation && (
            <p className="text-[11px] text-ink-500">{exercise.repExplanation}</p>
          )}
        </div>
      )}
    </div>
  );
}
