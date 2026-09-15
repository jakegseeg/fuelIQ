interface MacroRingProps {
  value: number; // consumed
  goal: number;
  label: string;
  unit?: string;
  color: string;
  size?: number;
  strokeWidth?: number;
}

/** Single circular progress ring (filled arc) for a macro or calories. */
export function MacroRing({
  value,
  goal,
  label,
  unit = 'g',
  color,
  size = 84,
  strokeWidth = 9,
}: MacroRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = goal > 0 ? Math.min(1, value / goal) : 0;
  const over = goal > 0 && value > goal;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E5E5EA" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={over ? '#FF453A' : color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${pct * circ} ${circ}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold tabular-nums text-ink-900">{Math.round(value)}</span>
          <span className="text-[10px] text-ink-600">/{Math.round(goal)}{unit}</span>
        </div>
      </div>
      <span className="text-xs font-semibold text-ink-600">{label}</span>
    </div>
  );
}
