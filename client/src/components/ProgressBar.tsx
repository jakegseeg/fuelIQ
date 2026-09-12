interface ProgressBarProps {
  current: number; // 1-based current step
  total: number;
  labels?: string[];
}

export function ProgressBar({ current, total, labels }: ProgressBarProps) {
  const pct = Math.round(((current - 1) / (total - 1)) * 100);
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-ink-600">
        <span>
          Step {current} of {total}
          {labels?.[current - 1] ? ` · ${labels[current - 1]}` : ''}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
        <div
          className="h-full rounded-full bg-accent-200 transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
