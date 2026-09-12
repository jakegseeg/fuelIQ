import type { WorkoutLog } from '../../lib/workoutTypes';

interface Props {
  log: WorkoutLog;
  exerciseNames?: string[];
  onDone: () => void;
}

export function WorkoutLogSummary({ log, exerciseNames, onDone }: Props) {
  const names =
    exerciseNames ??
    [...new Set(log.sets.map((s) => s.exercise))];

  return (
    <div className="card mx-auto max-w-lg space-y-5 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-accent-600">Workout logged</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight">{log.focus}</h2>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <SummaryStat label="Duration" value={`${log.durationMin}`} unit="min" />
        <SummaryStat label="Calories" value={`${log.caloriesBurned}`} unit="kcal" />
        {log.logSource !== 'cardio' && (
          <SummaryStat label="Sets" value={`${log.totalSets}`} unit="logged" />
        )}
      </div>

      {names.length > 0 && log.logSource !== 'cardio' && (
        <div className="rounded-xl bg-ink-50 px-4 py-3 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Exercises</p>
          <ul className="mt-2 space-y-1 text-sm text-ink-700">
            {names.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      )}

      {log.notes && (
        <p className="text-sm text-ink-600">{log.notes}</p>
      )}

      <p className="text-xs text-ink-500">
        Your dashboard calorie ring has been updated for this day.
      </p>

      <button type="button" className="btn-primary w-full" onClick={onDone}>
        Done
      </button>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-xl bg-surface2 px-2 py-3">
      <p className="text-xl font-extrabold text-ink-900">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">{unit}</p>
      <p className="mt-0.5 text-xs text-ink-600">{label}</p>
    </div>
  );
}
