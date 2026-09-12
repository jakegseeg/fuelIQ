import { useEffect, useState } from 'react';
import { ChevronDown, RefreshCw, Dumbbell, Activity, CircleDot } from 'lucide-react';
import { api } from '../lib/api';
import type { PlanExercise } from '../lib/workoutTypes';
import { exerciseIconKind } from '../lib/exerciseIconKind';
import { resolveMuscleTargetLabel } from '../lib/exerciseMuscleTargets';
import { ExerciseHowTo } from './ExerciseHowTo';
import { ExerciseWhySection } from './ExerciseWhySection';

const demoCache = new Map<string, string | null>();

function useDemo(name: string): string | null | undefined {
  const [url, setUrl] = useState<string | null | undefined>(
    demoCache.has(name) ? demoCache.get(name) : undefined,
  );
  useEffect(() => {
    if (demoCache.has(name)) {
      setUrl(demoCache.get(name));
      return;
    }
    let active = true;
    api
      .exerciseDemo(name)
      .then((r) => {
        demoCache.set(name, r.imageUrl);
        if (active) setUrl(r.imageUrl);
      })
      .catch(() => active && setUrl(null));
    return () => {
      active = false;
    };
  }, [name]);
  return url;
}

interface Props {
  exercise: PlanExercise;
  onSwap?: () => void;
}

export function ExerciseCard({ exercise, onSwap }: Props) {
  const demo = useDemo(exercise.name);
  const target = resolveMuscleTargetLabel(exercise);
  const iconKind = exerciseIconKind(exercise);
  const TypeIcon =
    iconKind === 'cardio' ? Activity : iconKind === 'core' ? CircleDot : Dumbbell;

  return (
    <div className="flex gap-3 rounded-2xl border border-ink-200 bg-surface p-3">
      <div className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-xl bg-surface2">
        {demo ? (
          <img src={demo} alt={exercise.name} className="h-full w-full object-cover" />
        ) : (
          <Dumbbell size={20} aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <TypeIcon size={16} className="flex-none text-accent-500" aria-hidden />
              <p className="font-semibold text-ink-900">{exercise.name}</p>
              {exercise.isNewRotation && (
                <span className="inline-flex items-center gap-1 rounded-md bg-accent-100 px-1.5 py-0.5 text-[10px] font-bold text-accent-600">
                  <RefreshCw size={12} aria-hidden />
                  New this rotation
                </span>
              )}
            </div>
            {target && (
              <p className="mt-0.5 text-xs text-ink-600">Targeting: {target}</p>
            )}
          </div>
          {onSwap && (
            <button
              type="button"
              onClick={onSwap}
              className="flex-none rounded-lg px-2.5 py-1 text-xs font-bold text-accent-300 ring-1 ring-accent-400/35 transition hover:bg-accent-400/10 hover:text-accent-400"
            >
              Swap
            </button>
          )}
        </div>
        <p className="mt-1 text-sm font-medium text-ink-800">
          {exercise.sets} sets × {exercise.reps} reps
          {exercise.restSeconds > 0 && (
            <span className="font-normal text-ink-600"> · {exercise.restSeconds}s rest</span>
          )}
        </p>
        {exercise.repExplanation && (
          <p className="mt-1 text-[11px] leading-snug text-ink-500">{exercise.repExplanation}</p>
        )}
        <ExerciseWhySection exercise={exercise} />
        {exercise.notes && !exercise.sessionReason && (
          <p className="mt-1.5 text-xs text-ink-600">{exercise.notes}</p>
        )}
        <ExerciseHowTo name={exercise.name} />
      </div>
    </div>
  );
}

export function DayTimeEstimate({
  estimatedMinLow,
  estimatedMinHigh,
  estimatedMin,
  breakdown,
}: {
  estimatedMinLow?: number;
  estimatedMinHigh?: number;
  estimatedMin?: number;
  breakdown?: { exerciseName: string; minutes: number }[];
}) {
  const [open, setOpen] = useState(false);
  const low = estimatedMinLow ?? estimatedMin;
  const high = estimatedMinHigh ?? estimatedMin;
  if (low == null || high == null) return null;
  const label =
    low === high ? `${low} min` : `${low}-${high} min`;
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => breakdown?.length && setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-sm font-semibold text-ink-700"
      >
        Estimated time: {label}
        {breakdown && breakdown.length > 0 && (
          <ChevronDown size={14} className={open ? 'rotate-180' : ''} aria-hidden />
        )}
      </button>
      <p className="mt-0.5 text-xs text-ink-500">Includes warm-up and setup time</p>
      {open && breakdown && (
        <ul className="mt-2 space-y-1 rounded-xl bg-ink-50 px-3 py-2 text-xs text-ink-600">
          {breakdown.map((row) => (
            <li key={row.exerciseName} className="flex justify-between gap-2">
              <span>{row.exerciseName}</span>
              <span>{row.minutes} min</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
