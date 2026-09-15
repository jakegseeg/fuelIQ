import { useId } from 'react';

export interface MacroSlice {
  label: string;
  grams: number;
  kcal: number;
  color: string;
}

interface MacroDonutProps {
  slices: MacroSlice[];
  centerValue: string;
  centerLabel: string;
  size?: number;
  strokeWidth?: number;
}

/** Lightweight dependency-free SVG donut chart for the macro breakdown. */
export function MacroDonut({
  slices,
  centerValue,
  centerLabel,
  size = 200,
  strokeWidth = 22,
}: MacroDonutProps) {
  const id = useId();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const totalKcal = slices.reduce((sum, s) => sum + s.kcal, 0) || 1;

  let offsetAcc = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Macro breakdown: ${slices
          .map((s) => `${s.label} ${s.grams}g`)
          .join(', ')}`}
      >
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E5E5EA"
            strokeWidth={strokeWidth}
          />
          {slices.map((slice, i) => {
            const fraction = slice.kcal / totalKcal;
            const dash = fraction * circumference;
            const circle = (
              <circle
                key={`${id}-${i}`}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${Math.max(0, dash - 2)} ${circumference}`}
                strokeDashoffset={-offsetAcc}
              />
            );
            offsetAcc += dash;
            return circle;
          })}
        </g>
        <text
          x="50%"
          y="46%"
          textAnchor="middle"
          className="fill-ink-900 font-bold"
          style={{ fontSize: size * 0.16 }}
        >
          {centerValue}
        </text>
        <text
          x="50%"
          y="60%"
          textAnchor="middle"
          className="fill-ink-400 font-medium"
          style={{ fontSize: size * 0.07 }}
        >
          {centerLabel}
        </text>
      </svg>

      <ul className="w-full max-w-xs space-y-2">
        {slices.map((slice) => {
          const pct = Math.round((slice.kcal / totalKcal) * 100);
          return (
            <li key={slice.label} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-medium text-ink-700">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: slice.color }}
                />
                {slice.label}
              </span>
              <span className="text-sm text-ink-600">
                <span className="font-semibold text-ink-900">{slice.grams} g</span>
                {' · '}
                {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export const MACRO_COLORS = {
  protein: '#30D158',
  carbs: '#FF9F0A',
  fat: '#FF453A',
};
