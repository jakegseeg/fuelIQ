import { useEffect, useRef, useState } from 'react';
import { Segmented } from '../fields';
import { WorkoutLogSummary } from './WorkoutLogSummary';
import { api, ApiError } from '../../lib/api';
import {
  CARDIO_ACTIVITIES,
  type CardioActivity,
  type CardioIntensity,
  cardioActivityToWorkoutType,
  estimateCardioCalories,
} from '../../lib/cardioMet';
import type { WorkoutLog } from '../../lib/workoutTypes';

function todayISO(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function useWakeLock(active: boolean) {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return undefined;

    navigator.wakeLock
      .request('screen')
      .then((lock) => {
        lockRef.current = lock;
      })
      .catch(() => undefined);

    return () => {
      lockRef.current?.release().catch(() => undefined);
      lockRef.current = null;
    };
  }, [active]);
}

function useWorkoutTimer(running: boolean) {
  const [elapsedSec, setElapsedSec] = useState(0);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return undefined;
    startedAtRef.current = Date.now() - elapsedSec * 1000;
    const id = window.setInterval(() => {
      if (startedAtRef.current == null) return;
      setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const reset = () => {
    startedAtRef.current = null;
    setElapsedSec(0);
  };

  return { elapsedSec, reset };
}

interface Props {
  onBack: () => void;
}

export function LogCardioWorkout({ onBack }: Props) {
  const [date, setDate] = useState(todayISO());
  const [activity, setActivity] = useState<CardioActivity>('Running');
  const [durationMin, setDurationMin] = useState('');
  const [distance, setDistance] = useState('');
  const [distanceUnit, setDistanceUnit] = useState<'mi' | 'km'>('mi');
  const [intensity, setIntensity] = useState<CardioIntensity>('moderate');
  const [notes, setNotes] = useState('');
  const [weightKg, setWeightKg] = useState(70);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<WorkoutLog | null>(null);

  const { elapsedSec, reset: resetTimer } = useWorkoutTimer(timerRunning);
  useWakeLock(timerRunning);

  useEffect(() => {
    api.getProfile().then((p) => {
      if (p) setWeightKg(p.weightKg);
    });
  }, []);

  useEffect(() => {
    if (timerRunning && elapsedSec > 0) {
      setDurationMin(String(Math.max(1, Math.round(elapsedSec / 60))));
    }
  }, [elapsedSec, timerRunning]);

  const parsedDuration = Math.max(0, Number(durationMin) || 0);
  const estimatedCalories =
    parsedDuration > 0
      ? estimateCardioCalories(activity, intensity, weightKg, parsedDuration)
      : 0;

  const stopTimerAndFill = () => {
    setTimerRunning(false);
    if (elapsedSec > 0) {
      setDurationMin(String(Math.max(1, Math.round(elapsedSec / 60))));
    }
  };

  const buildNotes = (): string | undefined => {
    const parts: string[] = [];
    if (distance.trim()) {
      parts.push(`Distance: ${distance.trim()} ${distanceUnit}`);
    }
    if (notes.trim()) parts.push(notes.trim());
    return parts.length > 0 ? parts.join('. ') : undefined;
  };

  const save = async () => {
    const duration = timerRunning
      ? Math.max(1, Math.round(elapsedSec / 60))
      : Math.max(1, Math.round(Number(durationMin) || 0));

    if (!duration || duration < 1) {
      setError('Enter a duration of at least 1 minute.');
      return;
    }

    if (timerRunning) stopTimerAndFill();

    setSaving(true);
    setError(null);
    try {
      const calories = estimateCardioCalories(activity, intensity, weightKg, duration);
      const { log } = await api.finishWorkout({
        date,
        focus: activity,
        type: cardioActivityToWorkoutType(activity),
        durationMin: duration,
        sets: [],
        caloriesBurned: calories,
        notes: buildNotes(),
        logSource: 'cardio',
      });
      setSummary(log);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save cardio workout.');
      setSaving(false);
    }
  };

  if (summary) {
    return <WorkoutLogSummary log={summary} onDone={onBack} />;
  }

  return (
    <div className="space-y-4 pb-8">
      <button type="button" onClick={onBack} className="text-sm font-semibold text-accent-600 hover:underline">
        ← Back
      </button>

      <div>
        <h2 className="text-xl font-extrabold tracking-tight">Log cardio</h2>
        <p className="mt-1 text-sm text-ink-600">Track duration and intensity — calories update as you type.</p>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-ink-900">Start timer</p>
            <p className="text-xs text-ink-500">Count up and auto-fill duration when you finish</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={timerEnabled}
            onClick={() => {
              setTimerEnabled((v) => {
                if (v) {
                  setTimerRunning(false);
                  resetTimer();
                }
                return !v;
              });
            }}
            className={`relative h-7 w-12 rounded-full transition ${
              timerEnabled ? 'bg-accent-500' : 'bg-ink-200'
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                timerEnabled ? 'left-5' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {timerEnabled && (
          <div className="rounded-xl bg-ink-50 px-4 py-4 text-center">
            <p className="font-display text-4xl font-extrabold tabular-nums tracking-tight text-ink-900">
              {formatTimer(elapsedSec)}
            </p>
            {timerRunning && (
              <p className="mt-2 text-xs text-ink-500">
                Tap to prevent your screen from sleeping during your session
              </p>
            )}
            <div className="mt-3 flex justify-center gap-2">
              {!timerRunning ? (
                <button type="button" className="btn-primary" onClick={() => setTimerRunning(true)}>
                  Start
                </button>
              ) : (
                <button type="button" className="btn-ghost" onClick={stopTimerAndFill}>
                  Finish timer
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="field-label" htmlFor="cardio-date">
          Date
        </label>
        <input
          id="cardio-date"
          type="date"
          className="field-input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div>
        <p className="field-label mb-2">Activity</p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {CARDIO_ACTIVITIES.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setActivity(a)}
              className={`flex-none rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                activity === a
                  ? 'bg-accent-500 text-white'
                  : 'border border-ink-200 bg-surface text-ink-700 hover:border-accent-300'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="cardio-duration">
            Duration (minutes)
          </label>
          <input
            id="cardio-duration"
            type="number"
            min={1}
            className="field-input"
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
            placeholder="30"
          />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <label className="field-label mb-0" htmlFor="cardio-distance">
              Distance (optional)
            </label>
            <Segmented
              value={distanceUnit}
              onChange={(v) => setDistanceUnit(v as 'mi' | 'km')}
              options={[
                { value: 'mi', label: 'mi' },
                { value: 'km', label: 'km' },
              ]}
              size="sm"
            />
          </div>
          <input
            id="cardio-distance"
            type="number"
            min={0}
            step="0.1"
            className="field-input"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="3.1"
          />
        </div>
      </div>

      <div>
        <p className="field-label mb-2">Intensity</p>
        <Segmented
          value={intensity}
          onChange={(v) => setIntensity(v as CardioIntensity)}
          options={[
            { value: 'low', label: 'Low' },
            { value: 'moderate', label: 'Moderate' },
            { value: 'high', label: 'High' },
          ]}
        />
      </div>

      {parsedDuration > 0 && (
        <div className="rounded-xl bg-accent-50 px-4 py-3">
          <p className="text-sm font-semibold text-accent-800">
            Estimated burn: {estimatedCalories} kcal
          </p>
          <p className="mt-0.5 text-xs text-accent-700/80">
            Based on MET × your weight × duration
          </p>
        </div>
      )}

      <div>
        <label className="field-label" htmlFor="cardio-notes">
          Notes (optional)
        </label>
        <textarea
          id="cardio-notes"
          className="field-input min-h-[80px] resize-y"
          placeholder="Easy recovery run, interval training, etc."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <button type="button" className="btn-primary w-full" disabled={saving} onClick={save}>
        {saving ? 'Saving…' : 'Log cardio'}
      </button>
    </div>
  );
}
