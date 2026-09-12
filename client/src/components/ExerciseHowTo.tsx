import { useState } from 'react';
import { getExerciseDescription, hasExerciseDescription } from '../lib/exerciseDescriptions';

interface Props {
  name: string;
  defaultOpen?: boolean;
}

export function ExerciseHowTo({ name, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const info = getExerciseDescription(name);
  const isGeneric = !hasExerciseDescription(name);

  return (
    <div className="mt-2 border-t border-ink-200/60 pt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left text-xs font-semibold text-accent-300 transition hover:text-accent-400"
        aria-expanded={open}
      >
        <span>How to do this</span>
        <span className="text-ink-600" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && (
        <div className="mt-2 space-y-2 text-sm leading-relaxed text-ink-600">
          <p>{info.description}</p>
          <p>
            <span className="font-semibold text-ink-800">Key tip: </span>
            {info.keyTip}
          </p>
          {isGeneric && (
            <p className="text-xs text-ink-600">
              No specific guide for this exercise yet — focus on controlled reps and full range of motion.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
