import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import type { MacroTotals } from '../../lib/foodTypes';

interface Props {
  totals: MacroTotals;
  target: MacroTotals | null;
  size?: number;
  strokeWidth?: number;
}

const PROTEIN_COLOR = '#30D158';
const CARBS_COLOR = '#FF9F0A';
const FAT_COLOR = '#FF453A';
const TRACK_COLOR = '#E5E5EA';

function arcLengths(totals: MacroTotals, targetCal: number, circ: number) {
  if (targetCal <= 0) return { protein: 0, carbs: 0, fat: 0 };

  const proteinFrac = (totals.protein * 4) / targetCal;
  const carbsFrac = (totals.carbs * 4) / targetCal;
  const fatFrac = (totals.fat * 9) / targetCal;

  const protein = Math.min(proteinFrac, 1) * circ;
  const carbs = Math.min(carbsFrac, Math.max(0, 1 - proteinFrac)) * circ;
  const fat = Math.min(fatFrac, Math.max(0, 1 - proteinFrac - carbsFrac)) * circ;

  return { protein, carbs, fat };
}

function MacroArc({
  size,
  radius,
  circ,
  length,
  offset,
  color,
  strokeWidth,
}: {
  size: number;
  radius: number;
  circ: number;
  length: number;
  offset: number;
  color: string;
  strokeWidth: number;
}) {
  if (length <= 0) return null;
  return (
    <circle
      cx={size / 2}
      cy={size / 2}
      r={radius}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeDasharray={`${length} ${circ - length}`}
      strokeDashoffset={-offset}
    />
  );
}

/** Compounding macro calorie ring — protein, carbs, fat arcs fill clockwise from 12 o'clock. */
export function MacroCalorieRing({ totals, target, size = 240, strokeWidth = 18 }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const targetCal = target?.calories ?? 0;
  const { protein, carbs, fat } = arcLengths(totals, targetCal, circ);
  const animatedProtein = useAnimatedNumber(protein);
  const animatedCarbs = useAnimatedNumber(carbs);
  const animatedFat = useAnimatedNumber(fat);
  const animatedConsumed = useAnimatedNumber(Math.round(totals.calories));

  return (
    <div className="relative flex-none rounded-xl" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={TRACK_COLOR}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <MacroArc
          size={size}
          radius={radius}
          circ={circ}
          length={animatedProtein}
          offset={0}
          color={PROTEIN_COLOR}
          strokeWidth={strokeWidth}
        />
        <MacroArc
          size={size}
          radius={radius}
          circ={circ}
          length={animatedCarbs}
          offset={animatedProtein}
          color={CARBS_COLOR}
          strokeWidth={strokeWidth}
        />
        <MacroArc
          size={size}
          radius={radius}
          circ={circ}
          length={animatedFat}
          offset={animatedProtein + animatedCarbs}
          color={FAT_COLOR}
          strokeWidth={strokeWidth}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="display-num">
          {Math.round(animatedConsumed).toLocaleString()}
        </span>
        {targetCal > 0 && (
          <span className="mt-1 text-sm text-ink-600">
            of {Math.round(targetCal).toLocaleString()} kcal
          </span>
        )}
      </div>
    </div>
  );
}

interface LegendProps {
  totals: MacroTotals;
  target: MacroTotals | null;
  layout?: 'vertical' | 'horizontal';
}

export function MacroRingLegend({ totals, target, layout = 'vertical' }: LegendProps) {
  const rows = [
    { color: PROTEIN_COLOR, label: 'Protein', current: totals.protein, goal: target?.protein ?? 0 },
    { color: CARBS_COLOR, label: 'Carbs', current: totals.carbs, goal: target?.carbs ?? 0 },
    { color: FAT_COLOR, label: 'Fat', current: totals.fat, goal: target?.fat ?? 0 },
  ];

  if (layout === 'horizontal') {
    return (
      <div className="grid w-full max-w-lg grid-cols-3 gap-4 px-2">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col items-center text-center">
            <span
              className="mb-1.5 inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: row.color }}
            />
            <span className="text-xs font-medium text-ink-500">{row.label}</span>
            <span className="mt-0.5 text-sm font-semibold tabular-nums text-ink-900">
              {Math.round(row.current)}
              {row.goal > 0 && (
                <span className="font-normal text-ink-500">/{Math.round(row.goal)}g</span>
              )}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 text-xs">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-2 whitespace-nowrap">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: row.color }}
          />
          <span className="text-ink-600">{row.label}</span>
          <span className="text-ink-600">—</span>
          <span className="font-semibold tabular-nums text-ink-900">
            {Math.round(row.current)} / {Math.round(row.goal)}g
          </span>
        </div>
      ))}
    </div>
  );
}
