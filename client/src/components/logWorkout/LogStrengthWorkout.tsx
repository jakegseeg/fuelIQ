import { useEffect, useRef, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { Segmented } from '../fields';
import { ExercisePickerModal } from './ExercisePickerModal';
import { WorkoutLogSummary } from './WorkoutLogSummary';
import { api, ApiError } from '../../lib/api';
import { estimateStrengthCalories } from '../../lib/cardioMet';
import type { LoggedSet, WorkoutLog } from '../../lib/workoutTypes';

const LBS_PER_KG = 2.2046226218;

function todayISO(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

interface SetRow {
  id: string;
  weight: string;
  reps: string;
  done: boolean;
}

interface ManualExercise {
  id: string;
  name: string;
  muscleGroups: string[];
  sets: SetRow[];
}

function newSet(): SetRow {
  return { id: crypto.randomUUID(), weight: '', reps: '', done: false };
}

function newExercise(name: string, muscleGroups: string[]): ManualExercise {
  return {
    id: crypto.randomUUID(),
    name,
    muscleGroups,
    sets: [newSet(), newSet(), newSet()],
  };
}

interface Props {
  onBack: () => void;
}

export function LogStrengthWorkout({ onBack }: Props) {
  const startRef = useRef(Date.now());
  const [date, setDate] = useState(todayISO());
  const [exercises, setExercises] = useState<ManualExercise[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [unit, setUnit] = useState<'lbs' | 'kg'>('lbs');
  const [weightKg, setWeightKg] = useState(70);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<WorkoutLog | null>(null);

  useEffect(() => {
    api.getProfile().then((p) => {
      if (p) {
        setWeightKg(p.weightKg);
        setUnit(p.units.weight === 'kg' ? 'kg' : 'lbs');
      }
    });
  }, []);

  const addExercise = (picked: { name: string; muscleGroups: string[] }) => {
    setExercises((list) => [...list, newExercise(picked.name, picked.muscleGroups)]);
  };

  const removeExercise = (id: string) => {
    setExercises((list) => list.filter((e) => e.id !== id));
  };

  const updateSet = (exId: string, setId: string, patch: Partial<SetRow>) => {
    setExercises((list) =>
      list.map((ex) =>
        ex.id !== exId
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
            },
      ),
    );
  };

  const addSetRow = (exId: string) => {
    setExercises((list) =>
      list.map((ex) => (ex.id === exId ? { ...ex, sets: [...ex.sets, newSet()] } : ex)),
    );
  };

  const finish = async () => {
    const loggedSets: LoggedSet[] = [];
    for (const ex of exercises) {
      for (const s of ex.sets) {
        if (!s.done) continue;
        const w = Number(s.weight) || 0;
        loggedSets.push({
          exercise: ex.name,
          muscleGroups: ex.muscleGroups,
          weightKg: unit === 'lbs' ? Math.round((w / LBS_PER_KG) * 10) / 10 : w,
          reps: Number(s.reps) || 0,
        });
      }
    }
    if (loggedSets.length === 0) {
      setError('Complete at least one set before finishing.');
      return;
    }

    const durationMin = Math.max(1, Math.round((Date.now() - startRef.current) / 60000));
    const names = exercises.map((e) => e.name);
    const focus =
      names.length <= 2 ? `Custom · ${names.join(', ')}` : `Custom · ${names.slice(0, 2).join(', ')} +${names.length - 2}`;

    setFinishing(true);
    setError(null);
    try {
      const { log } = await api.finishWorkout({
        date,
        focus,
        type: 'weight_training',
        durationMin,
        sets: loggedSets,
        caloriesBurned: estimateStrengthCalories(weightKg, durationMin),
        logSource: 'custom',
      });
      setSummary(log);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save workout.');
      setFinishing(false);
    }
  };

  if (summary) {
    return (
      <WorkoutLogSummary
        log={summary}
        exerciseNames={exercises.map((e) => e.name)}
        onDone={onBack}
      />
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <button type="button" onClick={onBack} className="text-sm font-semibold text-accent-600 hover:underline">
        ← Back
      </button>

      <div>
        <h2 className="section-header">Strength / Exercises</h2>
        <p className="mt-1 text-sm text-ink-600">Log sets as you go, then finish when done.</p>
      </div>

      <div>
        <label className="field-label" htmlFor="strength-date">
          Date
        </label>
        <input
          id="strength-date"
          type="date"
          className="field-input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div>
        <p className="field-label mb-2">Weight unit</p>
        <Segmented
          value={unit}
          onChange={(v) => setUnit(v as 'lbs' | 'kg')}
          options={[
            { value: 'lbs', label: 'lbs' },
            { value: 'kg', label: 'kg' },
          ]}
          size="sm"
        />
      </div>

      <div className="space-y-3">
        {exercises.map((ex) => (
          <div key={ex.id} className="card relative space-y-3">
            <button
              type="button"
              onClick={() => removeExercise(ex.id)}
              className="absolute right-3 top-3 rounded-lg p-1 text-ink-400 hover:bg-ink-100 hover:text-red-500"
              aria-label={`Remove ${ex.name}`}
            >
              <X size={16} aria-hidden />
            </button>
            <p className="pr-8 font-bold text-ink-900">{ex.name}</p>

            <div className="space-y-2">
              {ex.sets.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="w-12 flex-none text-xs font-semibold text-ink-500">
                    Set {i + 1}
                  </span>
                  <input
                    className="field-input flex-1 py-2 text-sm"
                    type="number"
                    inputMode="decimal"
                    placeholder={unit}
                    value={s.weight}
                    onChange={(e) => updateSet(ex.id, s.id, { weight: e.target.value })}
                  />
                  <input
                    className="field-input w-16 py-2 text-sm"
                    type="number"
                    inputMode="numeric"
                    placeholder="Reps"
                    value={s.reps}
                    onChange={(e) => updateSet(ex.id, s.id, { reps: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => updateSet(ex.id, s.id, { done: !s.done })}
                    className={`flex h-9 w-9 flex-none items-center justify-center rounded-md border transition ${
                      s.done
                        ? 'border-accent-400 bg-accent-500 text-white'
                        : 'border-ink-200 text-ink-400 hover:border-accent-400'
                    }`}
                    aria-label={s.done ? 'Set complete' : 'Mark set complete'}
                  >
                    <Check size={16} aria-hidden />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => addSetRow(ex.id)}
              className="btn-ghost inline-flex items-center gap-1 px-2 py-1 text-xs"
            >
              <Plus size={14} aria-hidden />
              Add set
            </button>
          </div>
        ))}
      </div>

      <button type="button" className="btn-ghost w-full" onClick={() => setPickerOpen(true)}>
        + Add exercise
      </button>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <div className="fixed bottom-0 left-0 right-0 border-t border-ink-100 bg-bg/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-7xl">
          <button
            type="button"
            className="btn-primary w-full"
            disabled={finishing || exercises.length === 0}
            onClick={finish}
          >
            {finishing ? 'Saving…' : 'Finish workout'}
          </button>
        </div>
      </div>

      <ExercisePickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={addExercise}
      />
    </div>
  );
}
