export type WorkoutMode = 'plan' | 'split' | 'log';

const OPTIONS: { value: WorkoutMode; label: string }[] = [
  { value: 'plan', label: 'My Plan' },
  { value: 'split', label: 'My Split' },
  { value: 'log', label: 'Log Workout' },
];

interface Props {
  value: WorkoutMode;
  onChange: (mode: WorkoutMode) => void;
}

export function WorkoutModeSelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-[10px] px-3 py-2.5 text-sm font-semibold transition ${
            value === opt.value
              ? 'bg-accent-500 text-white shadow-sm'
              : 'border border-ink-200 bg-surface text-ink-700 hover:border-ink-300'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
