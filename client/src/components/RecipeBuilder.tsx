import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Modal } from './Modal';
import { Spinner } from './Spinner';
import { api } from '../lib/api';
import {
  totalsForQuantity,
  type MacroTotals,
  type RecipeIngredient,
  type ScoredFood,
} from '../lib/foodTypes';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const ZERO: MacroTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

export function RecipeBuilder({ open, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [servings, setServings] = useState('1');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setServings('1');
      setIngredients([]);
      setError(null);
    }
  }, [open]);

  const div = Math.max(1, Number(servings) || 1);
  const total = ingredients.reduce<MacroTotals>((acc, ing) => {
    const t = totalsForQuantity(ing.food.per100, ing.quantityG);
    return {
      calories: acc.calories + t.calories,
      protein: acc.protein + t.protein,
      carbs: acc.carbs + t.carbs,
      fat: acc.fat + t.fat,
    };
  }, { ...ZERO });
  const perServing = {
    calories: Math.round(total.calories / div),
    protein: Math.round((total.protein / div) * 10) / 10,
    carbs: Math.round((total.carbs / div) * 10) / 10,
    fat: Math.round((total.fat / div) * 10) / 10,
  };

  const save = async () => {
    if (!name.trim() || ingredients.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await api.createRecipe(name.trim(), div, ingredients);
      onSaved();
      onClose();
    } catch {
      setError('Could not save recipe.');
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New recipe" maxWidth="max-w-xl">
      <div className="space-y-4">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div>
            <label className="field-label">Recipe name</label>
            <input
              className="field-input"
              value={name}
              placeholder="Overnight oats"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="w-28">
            <label className="field-label">Servings</label>
            <input
              className="field-input"
              type="number"
              min="1"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
            />
          </div>
        </div>

        <IngredientSearch
          onAdd={(food) =>
            setIngredients((list) => [...list, { food, quantityG: food.defaultServingG || 100 }])
          }
        />

        {ingredients.length > 0 && (
          <ul className="space-y-2">
            {ingredients.map((ing, i) => (
              <li key={i} className="flex items-center gap-2 rounded-xl border border-ink-100 p-2.5">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-800">
                  {ing.food.name}
                </span>
                <input
                  className="w-20 rounded-lg border border-ink-200 px-2 py-1 text-sm"
                  type="number"
                  min="1"
                  value={ing.quantityG}
                  onChange={(e) =>
                    setIngredients((list) =>
                      list.map((it, idx) =>
                        idx === i ? { ...it, quantityG: Number(e.target.value) || 0 } : it,
                      ),
                    )
                  }
                />
                <span className="text-xs text-ink-600">g</span>
                <button
                  onClick={() => setIngredients((list) => list.filter((_, idx) => idx !== i))}
                  className="rounded-lg p-1 text-ink-600 hover:bg-ink-100 hover:text-red-500"
                  aria-label="Remove ingredient"
                >
                  <X size={14} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-4 gap-2 rounded-2xl bg-ink-50 p-4 text-center">
          <PerServ label="Calories" value={perServing.calories} />
          <PerServ label="Protein" value={perServing.protein} unit="g" />
          <PerServ label="Carbs" value={perServing.carbs} unit="g" />
          <PerServ label="Fat" value={perServing.fat} unit="g" />
        </div>
        <p className="text-center text-xs text-ink-600">Macros shown per serving.</p>

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        <button
          className="btn-primary w-full"
          disabled={saving || !name.trim() || ingredients.length === 0}
          onClick={save}
        >
          {saving ? 'Saving…' : 'Save recipe'}
        </button>
      </div>
    </Modal>
  );
}

function IngredientSearch({ onAdd }: { onAdd: (food: ScoredFood) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ScoredFood[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      api
        .searchFoods(q, 8)
        .then((foods) => active && setResults(foods))
        .catch(() => active && setResults([]))
        .finally(() => active && setLoading(false));
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <div>
      <label className="field-label">Add ingredients</label>
      <input
        className="field-input"
        placeholder="Search a food to add…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {loading && <div className="py-3"><Spinner /></div>}
      {results.length > 0 && (
        <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">
          {results.map((f, i) => (
            <button
              key={`${f.name}-${i}`}
              onClick={() => {
                onAdd(f);
                setQuery('');
                setResults([]);
              }}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-ink-100 px-3 py-2 text-left text-sm hover:bg-accent-100 hover:text-accent-500"
            >
              <span className="min-w-0 truncate">{f.name}</span>
              <span className="flex-none text-xs text-ink-600">
                {Math.round(f.per100.calories)} kcal/100g
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PerServ({ label, value, unit = '' }: { label: string; value: number; unit?: string }) {
  return (
    <div>
      <p className="text-base font-extrabold text-ink-900">
        {value}
        <span className="text-xs font-semibold text-ink-600">{unit}</span>
      </p>
      <p className="text-[11px] text-ink-600">{label}</p>
    </div>
  );
}
