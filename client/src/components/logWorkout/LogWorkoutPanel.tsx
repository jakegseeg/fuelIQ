import { useState } from 'react';
import { Dumbbell, HeartPulse } from 'lucide-react';
import { LogStrengthWorkout } from './LogStrengthWorkout';
import { LogCardioWorkout } from './LogCardioWorkout';

type LogMode = 'pick' | 'strength' | 'cardio';

export function LogWorkoutPanel() {
  const [mode, setMode] = useState<LogMode>('pick');

  if (mode === 'strength') {
    return <LogStrengthWorkout onBack={() => setMode('pick')} />;
  }

  if (mode === 'cardio') {
    return <LogCardioWorkout onBack={() => setMode('pick')} />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight">Log a workout</h2>
        <p className="mt-1 text-sm text-ink-600">
          Record a strength session or cardio activity — it&apos;ll show up in your history and daily calories.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setMode('strength')}
          className="card flex min-h-[140px] flex-col items-start gap-3 text-left transition hover:border-accent-300 hover:shadow-card"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-100 text-accent-600">
            <Dumbbell size={24} aria-hidden />
          </span>
          <div>
            <p className="text-lg font-bold text-ink-900">Strength / Exercises</p>
            <p className="mt-1 text-sm text-ink-600">
              Log specific exercises with sets, reps, and weight.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setMode('cardio')}
          className="card flex min-h-[140px] flex-col items-start gap-3 text-left transition hover:border-accent-300 hover:shadow-card"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <HeartPulse size={24} aria-hidden />
          </span>
          <div>
            <p className="text-lg font-bold text-ink-900">Cardio</p>
            <p className="mt-1 text-sm text-ink-600">
              Log a run, bike ride, swim, or other cardio activity.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
