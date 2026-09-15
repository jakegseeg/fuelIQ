import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Check, Dumbbell, Activity, CircleDot } from 'lucide-react';
import { Logo } from '../components/Logo';
import { RestTimer } from '../components/RestTimer';
import { Modal } from '../components/Modal';
import { Segmented } from '../components/fields';
import { ExerciseHowTo } from '../components/ExerciseHowTo';
import { ExerciseWhySection } from '../components/ExerciseWhySection';
import { SwapExerciseModal } from '../components/SwapExerciseModal';
import { api } from '../lib/api';
import { notifyPersonalRecord } from '../hooks/useSmartNotifications';
import { exerciseIconKind } from '../lib/exerciseIconKind';
import { resolveMuscleTargetLabel } from '../lib/exerciseMuscleTargets';
import { focusToTypeClient } from '../lib/workoutClient';
import type { DayPlan, LoggedSet, PlanExercise, WorkoutLog } from '../lib/workoutTypes';

interface SetEntry {
  weight: string;
  reps: string;
  done: boolean;
}

interface ActivePayload {
  date: string;
  day: DayPlan;
  dayIndex?: number;
  planId?: number;
}

const LBS_PER_KG = 2.2046226218;

function loadPayload(stateUnknown: unknown): ActivePayload | null {
  const fromState = stateUnknown as ActivePayload | null;
  if (fromState?.day) return fromState;
  try {
    const raw = sessionStorage.getItem('fueliq.activeWorkout');
    return raw ? (JSON.parse(raw) as ActivePayload) : null;
  } catch {
    return null;
  }
}

export function ActiveWorkoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const payload = useMemo(() => loadPayload(location.state), [location.state]);

  if (!payload) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-bg text-ink-600">
        <p>No active workout.</p>
        <Link to="/workouts" className="btn-primary">Back to plan</Link>
      </div>
    );
  }
  return <ActiveSession payload={payload} onExit={() => navigate('/workouts')} />;
}

function ActiveSession({ payload, onExit }: { payload: ActivePayload; onExit: () => void }) {
  const navigate = useNavigate();
  const { day, date, dayIndex, planId } = payload;

  const [sessionExercises, setSessionExercises] = useState<PlanExercise[]>(() => day.exercises);
  const [idx, setIdx] = useState(0);
  const [unit, setUnit] = useState<'lbs' | 'kg'>('lbs');
  const [progress, setProgress] = useState<SetEntry[][]>(() =>
    day.exercises.map((ex) =>
      Array.from({ length: Math.max(1, ex.sets) }, () => ({ weight: '', reps: '', done: false })),
    ),
  );
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapSaving, setSwapSaving] = useState(false);
  const [restKey, setRestKey] = useState(0);
  const [restSeconds, setRestSeconds] = useState(60);
  const [finishing, setFinishing] = useState(false);
  const [summary, setSummary] = useState<WorkoutLog | null>(null);
  const startRef = useRef(Date.now());
  const prRef = useRef<Map<string, number>>(new Map());

  const ex = sessionExercises[idx];
  const sets = progress[idx];
  const targetLabel = ex ? resolveMuscleTargetLabel(ex) : undefined;
  const iconKind = exerciseIconKind(ex);
  const TypeIcon =
    iconKind === 'cardio' ? Activity : iconKind === 'core' ? CircleDot : Dumbbell;

  useEffect(() => {
    api
      .workoutHistory()
      .then((stats) => {
        const m = new Map<string, number>();
        for (const pr of stats.personalRecords) {
          m.set(pr.exercise.toLowerCase(), pr.weightKg);
        }
        prRef.current = m;
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (ex) setRestSeconds(ex.restSeconds || 60);
  }, [idx, ex?.name, ex?.restSeconds]);

  const persistSession = (exercises: PlanExercise[]) => {
    const nextPayload = { ...payload, day: { ...day, exercises } };
    sessionStorage.setItem('fueliq.activeWorkout', JSON.stringify(nextPayload));
  };

  const handleSwap = async (swapped: PlanExercise, permanent: boolean) => {
    const nextExercises = sessionExercises.map((e, i) => (i === idx ? swapped : e));
    setSessionExercises(nextExercises);
    setProgress((prev) =>
      prev.map((arr, i) => {
        if (i !== idx) return arr;
        const targetSets = Math.max(1, swapped.sets);
        return Array.from({ length: targetSets }, (_, j) =>
          arr[j] ?? { weight: '', reps: '', done: false },
        );
      }),
    );
    persistSession(nextExercises);

    if (permanent && dayIndex != null && planId != null) {
      setSwapSaving(true);
      try {
        await api.swapPlanExercise({
          dayIndex,
          exerciseIndex: idx,
          exercise: swapped,
        });
      } finally {
        setSwapSaving(false);
      }
    }
  };

  const updateSet = (setIdx: number, patch: Partial<SetEntry>) => {
    setProgress((prev) =>
      prev.map((arr, i) =>
        i === idx ? arr.map((s, j) => (j === setIdx ? { ...s, ...patch } : s)) : arr,
      ),
    );
  };

  const completeSet = (setIdx: number) => {
    const wasDone = sets[setIdx].done;
    updateSet(setIdx, { done: !wasDone });
    if (!wasDone) {
      const w = Number(sets[setIdx].weight) || 0;
      const weightKg = unit === 'lbs' ? Math.round((w / LBS_PER_KG) * 10) / 10 : w;
      const key = ex.name.toLowerCase();
      const prev = prRef.current.get(key) ?? 0;
      if (weightKg > prev && weightKg > 0) {
        prRef.current.set(key, weightKg);
        notifyPersonalRecord(ex.name, weightKg, unit);
      }
      setRestSeconds(ex.restSeconds || 60);
      setRestKey((k) => k + 1);
    }
  };

  const totalSetsDone = progress.reduce(
    (sum, arr) => sum + arr.filter((s) => s.done).length,
    0,
  );

  const finish = async () => {
    setFinishing(true);
    const loggedSets: LoggedSet[] = [];
    progress.forEach((arr, exIdx) => {
      const exercise = sessionExercises[exIdx];
      arr.forEach((s) => {
        if (!s.done) return;
        const w = Number(s.weight) || 0;
        loggedSets.push({
          exercise: exercise.name,
          muscleGroups: exercise.muscleGroups,
          weightKg: unit === 'lbs' ? Math.round((w / LBS_PER_KG) * 10) / 10 : w,
          reps: Number(s.reps) || 0,
        });
      });
    });
    const durationMin = Math.max(1, Math.round((Date.now() - startRef.current) / 60000));
    try {
      const { log } = await api.finishWorkout({
        date,
        focus: day.focus,
        type: focusToTypeClient(day.focus),
        durationMin,
        sets: loggedSets,
      });
      sessionStorage.removeItem('fueliq.activeWorkout');
      setSummary(log);
    } catch {
      setFinishing(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink-900">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3">
        <Logo />
        <button
          onClick={onExit}
          className="btn-ghost text-xs"
        >
          Quit
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-6">
        {/* Progress */}
        <div className="mb-2 flex items-center justify-between text-sm text-ink-600">
          <span>Exercise {idx + 1} of {sessionExercises.length}</span>
          <span>{day.focus}</span>
        </div>
        <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-ink-200">
          <div
            className="h-full rounded-full bg-accent-400 transition-all"
            style={{ width: `${((idx + 1) / sessionExercises.length) * 100}%` }}
          />
        </div>

        {/* Current exercise */}
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <TypeIcon size={16} className="flex-none text-accent-500" aria-hidden />
                <h1 className="font-display text-3xl font-extrabold tracking-tight">{ex.name}</h1>
              </div>
              {targetLabel && (
                <p className="mt-1 text-sm text-ink-600">Targeting: {targetLabel}</p>
              )}
            </div>
            <button type="button" onClick={() => setSwapOpen(true)} className="btn-secondary flex-none text-xs">
              Swap
            </button>
          </div>
          <p className="mt-1 text-ink-600">
            {ex.sets} sets × {ex.reps} reps
            {ex.restSeconds > 0 && ` · ${ex.restSeconds}s rest`}
          </p>
          {ex.repExplanation && (
            <p className="mt-1 text-xs text-ink-500">{ex.repExplanation}</p>
          )}
          <ExerciseWhySection exercise={ex} compact />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ex.muscleGroups.map((mg) => (
              <span
                key={mg}
                className="rounded-md bg-surface2 px-2 py-0.5 text-[11px] font-semibold text-accent-300 ring-1 ring-accent-400/25"
              >
                {mg}
              </span>
            ))}
          </div>

          <ExerciseHowTo name={ex.name} />

          <div className="mt-5 flex justify-end">
            <Segmented
              size="sm"
              value={unit}
              onChange={setUnit}
              options={[
                { value: 'lbs', label: 'lbs' },
                { value: 'kg', label: 'kg' },
              ]}
            />
          </div>

          {/* Set tracker */}
          <div className="mt-3 space-y-2">
            {sets.map((s, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-xl p-2.5 ring-1 transition ${
                  s.done
                    ? 'bg-surface ring-accent-400/45'
                    : 'bg-surface ring-ink-200'
                }`}
              >
                <span
                  className={`w-12 text-sm font-bold ${s.done ? 'text-accent-300' : 'text-ink-700'}`}
                >
                  Set {i + 1}
                </span>
                <input
                  className="min-h-11 w-full rounded-lg border border-ink-200 bg-surface2 px-3 py-2 text-ink-900 outline-none placeholder:text-ink-600 focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20"
                  type="number"
                  inputMode="decimal"
                  placeholder={unit}
                  aria-label={`Weight for set ${i + 1} in ${unit}`}
                  value={s.weight}
                  onChange={(e) => updateSet(i, { weight: e.target.value })}
                />
                <input
                  className="min-h-11 w-full rounded-lg border border-ink-200 bg-surface2 px-3 py-2 text-ink-900 outline-none placeholder:text-ink-600 focus:border-accent-400 focus:ring-2 focus:ring-accent-400/20"
                  type="number"
                  inputMode="numeric"
                  placeholder="reps"
                  aria-label={`Repetitions for set ${i + 1}`}
                  value={s.reps}
                  onChange={(e) => updateSet(i, { reps: e.target.value })}
                />
                <button
                  onClick={() => completeSet(i)}
                  className={`flex h-11 w-11 flex-none items-center justify-center rounded-lg font-bold transition ${
                    s.done
                      ? 'bg-accent-500 text-white'
                      : 'bg-ink-200 text-ink-600 hover:bg-ink-300 hover:text-ink-800'
                  }`}
                  aria-label="Complete set"
                >
                  <Check size={14} aria-hidden />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Rest timer */}
        <div className="mt-6">
          <RestTimer triggerKey={restKey} seconds={restSeconds} />
        </div>

        {/* Nav buttons */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="btn-ghost disabled:opacity-50"
          >
            Previous
          </button>
          {idx < sessionExercises.length - 1 ? (
            <button
              onClick={() => setIdx((i) => Math.min(sessionExercises.length - 1, i + 1))}
              className="btn-secondary flex-1"
            >
              Next exercise
            </button>
          ) : (
            <button
              onClick={finish}
              disabled={finishing}
              className="btn-primary flex-1"
            >
              {finishing ? 'Saving…' : 'Finish workout'}
            </button>
          )}
        </div>
        <button
          onClick={finish}
          disabled={finishing}
          className="mt-3 text-center text-sm font-semibold text-ink-600 transition hover:text-accent-300 disabled:opacity-50"
        >
          Finish early ({totalSetsDone} sets done)
        </button>
      </div>

      <SwapExerciseModal
        open={swapOpen}
        onClose={() => setSwapOpen(false)}
        exercise={ex}
        sessionExerciseNames={sessionExercises.map((e) => e.name)}
        onChoose={handleSwap}
        saving={swapSaving}
      />

      <Modal open={summary !== null} onClose={() => navigate('/log')} title="Workout complete">
        {summary && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <SummaryStat label="Duration" value={`${summary.durationMin}m`} />
              <SummaryStat label="Sets" value={String(summary.totalSets)} />
              <SummaryStat label="Burned" value={`${summary.caloriesBurned}`} unit="kcal" />
            </div>
            <p className="text-center text-sm text-ink-600">
              {summary.caloriesBurned} kcal were added to today’s net calories.
            </p>
            <div className="flex gap-3">
              <button onClick={() => navigate('/workouts/history')} className="btn-ghost flex-1">
                View history
              </button>
              <button onClick={() => navigate('/log')} className="btn-primary flex-1">
                Back to log
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function SummaryStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-2xl bg-surface2 p-4 ring-1 ring-ink-200">
      <p className="text-2xl font-extrabold text-ink-900">
        {value}
        {unit && <span className="text-sm font-semibold text-ink-600"> {unit}</span>}
      </p>
      <p className="text-xs text-ink-600">{label}</p>
    </div>
  );
}
