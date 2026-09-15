import { FuelScoreBadge } from './FuelScoreBadge';
import type { ScoredFood } from '../../lib/foodTypes';

interface Props {
  food: ScoredFood;
  onSelect?: (food: ScoredFood) => void;
  onQuickAdd?: (food: ScoredFood) => void;
}

/** Food search result card (spec 6.2). */
export function FoodCard({ food, onSelect, onQuickAdd }: Props) {
  return (
    <div
      className={`group flex items-center gap-3 rounded-xl border border-ink-200 bg-surface2 p-3 transition ${
        onSelect ? 'cursor-pointer hover:border-accent-400/40 hover:shadow-glow' : ''
      }`}
      onClick={onSelect ? () => onSelect(food) : undefined}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold text-ink-900">{food.name}</p>
          <FuelScoreBadge score={food.fuelScore} interactive={false} />
        </div>
        <p className="truncate text-xs text-ink-600">
          {food.brand ? `${food.brand} · ` : ''}
          {Math.round(food.per100.calories)} kcal / 100g · {Math.round(food.per100.protein)}P{' '}
          {Math.round(food.per100.carbs)}C {Math.round(food.per100.fat)}F
        </p>
      </div>
      {onQuickAdd && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuickAdd(food);
          }}
          className="btn-ghost flex-none text-xs"
        >
          + Add
        </button>
      )}
    </div>
  );
}
