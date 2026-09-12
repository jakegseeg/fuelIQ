import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';

type MacroKey = 'protein' | 'carbs' | 'fat';

const COLORS: Record<MacroKey, string> = {
  protein: 'rgb(var(--macro-protein))',
  carbs: 'rgb(var(--macro-carbs))',
  fat: 'rgb(var(--macro-fat))',
};
const LABELS: Record<MacroKey, string> = {
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fat',
};

interface Props {
  macro: MacroKey;
  value: number;
  goal: number;
}

/** Animated macro progress bar with label (spec 6.2). Turns coral when over. */
export function MacroBar({ macro, value, goal }: Props) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  const over = goal > 0 && value > goal;
  const animatedPct = useAnimatedNumber(pct);
  const animatedValue = useAnimatedNumber(value);
  const color = over ? '#ff453a' : COLORS[macro];

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-semibold">
        <span style={{ color }}>{LABELS[macro]}</span>
        <span className="text-ink-600 tabular-nums">
          {Math.round(animatedValue)} / {Math.round(goal)} g
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-200">
        <div
          className="h-full rounded-full transition-[width]"
          style={{
            width: `${animatedPct}%`,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}`,
          }}
        />
      </div>
    </div>
  );
}
