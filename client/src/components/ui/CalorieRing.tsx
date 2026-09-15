import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';

interface Props {
  consumed: number;
  target: number;
  burned?: number;
  size?: number;
  strokeWidth?: number;
}

/** Animated SVG donut with a counting center value (spec 6.2). */
export function CalorieRing({ consumed, target, burned = 0, size = 200, strokeWidth = 16 }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const allowance = target + burned;
  const remaining = Math.round(allowance - consumed);
  const pct = allowance > 0 ? Math.min(1, consumed / allowance) : 0;
  const over = allowance > 0 && consumed > allowance;

  const animatedRemaining = useAnimatedNumber(Math.abs(remaining));
  const animatedDash = useAnimatedNumber(pct * circ);
  const stroke = over ? '#FF453A' : '#30D158';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E5E5EA" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${animatedDash} ${circ}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="display-num"
          style={{ color: over ? '#FF453A' : undefined }}
        >
          {Math.round(animatedRemaining).toLocaleString()}
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
