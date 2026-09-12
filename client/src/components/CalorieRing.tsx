interface Props {
  consumed: number;
  target: number;
  burned?: number;
  size?: number;
  strokeWidth?: number;
}

/** Large calorie ring showing remaining calories in the center (spec 4.1). */
export function CalorieRing({ consumed, target, burned = 0, size = 200, strokeWidth = 18 }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const allowance = target + burned;
  const remaining = Math.round(allowance - consumed);
  const pct = allowance > 0 ? Math.min(1, consumed / allowance) : 0;
  const over = allowance > 0 && consumed > allowance;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#D4C4B0" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={over ? '#C85A3A' : '#1E7A40'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${pct * circ} ${circ}`}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-extrabold leading-none text-ink-900 ${over ? 'text-coral-400' : ''}`}>
          {Math.abs(remaining).toLocaleString()}
        </span>
        <span className="mt-1 text-sm font-medium text-ink-600">
          {target > 0 ? (over ? 'calories over' : 'calories left') : 'calories eaten'}
        </span>
        {target > 0 && (
          <span className="mt-1 text-[11px] text-ink-600">
            {Math.round(consumed).toLocaleString()} / {allowance.toLocaleString()} kcal
            {burned > 0 ? ` (+${Math.round(burned)} burned)` : ''}
          </span>
        )}
      </div>
    </div>
  );
}
