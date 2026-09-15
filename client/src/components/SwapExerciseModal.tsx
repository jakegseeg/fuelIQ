import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { api } from '../lib/api';
import type { PlanExercise } from '../lib/workoutTypes';

interface Props {
  open: boolean;
  onClose: () => void;
  exercise: PlanExercise | null;
  sessionExerciseNames?: string[];
  onChoose: (swapped: PlanExercise, permanent: boolean) => void | Promise<void>;
  saving?: boolean;
}

export function SwapExerciseModal({
  open,
  onClose,
  exercise,
  sessionExerciseNames = [],
  onChoose,
  saving,
}: Props) {
  const [permanent, setPermanent] = useState(false);
  const [alternatives, setAlternatives] = useState<PlanExercise[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !exercise?.rotationGroup) {
      setAlternatives([]);
      return;
    }
    setLoading(true);
    const exclude = [...sessionExerciseNames, exercise.name];
    api
      .getExerciseSwapAlternatives(exercise.rotationGroup, exclude)
      .then((alts) => {
        setAlternatives(
          alts.map((alt) => ({
            ...alt,
            sets: exercise.sets,
            reps: exercise.reps,
            restSeconds: exercise.restSeconds,
            repExplanation: exercise.repExplanation,
          })),
        );
      })
      .catch(() => setAlternatives([]))
      .finally(() => setLoading(false));
  }, [open, exercise, sessionExerciseNames]);

  if (!exercise) return null;

  const choose = async (alt: PlanExercise) => {
    await onChoose(alt, permanent);
    setPermanent(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={`Swap: ${exercise.name}`} maxWidth="max-w-md">
      <p className="text-sm text-ink-600">
        Same rotation group — pick an alternative not already in this session.
      </p>

      <div className="mt-4 space-y-3">
        {loading && <p className="text-sm text-ink-500">Loading alternatives…</p>}
        {!loading && alternatives.length === 0 && (
          <p className="text-sm text-ink-500">No other exercises available in this rotation group.</p>
        )}
        {alternatives.map((alt) => (
          <div
            key={alt.name}
            className="rounded-xl border border-ink-200 bg-surface2 p-3 ring-1 ring-ink-200/50"
          >
            <p className="font-semibold text-ink-900">{alt.name}</p>
            {alt.primaryMuscle && (
              <p className="mt-0.5 text-xs text-ink-600">Targets: {alt.primaryMuscle}</p>
            )}
            <p className="mt-1 text-sm text-ink-600">
              {alt.sets} × {alt.reps} · {alt.restSeconds}s rest
            </p>
            <button
              type="button"
              disabled={saving}
              onClick={() => choose(alt)}
              className="btn-primary mt-3 w-full py-2 text-sm disabled:opacity-50"
            >
              Choose this
            </button>
          </div>
        ))}
      </div>

      <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-ink-600">
        <input
          type="checkbox"
          checked={permanent}
          onChange={(e) => setPermanent(e.target.checked)}
          className="h-4 w-4 rounded border-ink-300 text-accent-400"
        />
        Save as permanent swap in my workout plan
      </label>
    </Modal>
  );
}
