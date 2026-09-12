import type { NutritionPer100g } from '../../lib/foodTypes';

interface Props {
  per100: NutritionPer100g;
  servingG: number;
  servingLabel?: string;
}

function scale(value: number | null, grams: number): number | null {
  if (value == null) return null;
  return Math.round(value * (grams / 100) * 10) / 10;
}

function Row({
  label,
  value,
  unit = 'g',
  bold,
  indent,
}: {
  label: string;
  value: number | null;
  unit?: string;
  bold?: boolean;
  indent?: boolean;
}) {
  if (value == null) return null;
  return (
    <div
      className={`flex items-center justify-between border-b border-ink-200 py-1 ${
        bold ? 'font-bold text-ink-900' : 'text-ink-700'
      } ${indent ? 'pl-4' : ''}`}
    >
      <span>{label}</span>
      <span className="tabular-nums">
        {value}
        {unit}
      </span>
    </div>
  );
}

/** FDA-style nutrition facts panel (spec 6.2). */
export function NutritionLabel({ per100, servingG, servingLabel }: Props) {
  const cals = Math.round(per100.calories * (servingG / 100));
  return (
    <div className="rounded-xl border-2 border-ink-300 bg-surface p-4 text-sm">
      <h4 className="font-display text-xl font-extrabold tracking-tight">Nutrition Facts</h4>
      <div className="border-b-8 border-ink-300 pb-1 text-xs text-ink-600">
        Serving size {servingLabel ?? `${Math.round(servingG)} g`}
      </div>
      <div className="flex items-end justify-between border-b-4 border-ink-300 py-1">
        <span className="font-bold">Calories</span>
        <span className="font-display text-2xl font-extrabold tabular-nums">{cals}</span>
      </div>
      <Row label="Total Fat" value={scale(per100.fat, servingG)} bold />
      <Row label="Saturated Fat" value={scale(per100.satFat, servingG)} indent />
      <Row label="Sodium" value={scale(per100.sodium, servingG)} unit="mg" bold />
      <Row label="Total Carbohydrate" value={scale(per100.carbs, servingG)} bold />
      <Row label="Dietary Fiber" value={scale(per100.fiber, servingG)} indent />
      <Row label="Total Sugars" value={scale(per100.sugars, servingG)} indent />
      <Row label="Added Sugars" value={scale(per100.addedSugars, servingG)} indent />
      <Row label="Protein" value={scale(per100.protein, servingG)} bold />
    </div>
  );
}
