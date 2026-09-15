import { useEffect, useState } from 'react';
import { RecipeBuilder } from './RecipeBuilder';
import { api } from '../lib/api';
import {
  entryToFood,
  type DaySummary,
  type FoodItem,
  type MealTemplate,
  type Recipe,
  type TemplateItem,
} from '../lib/foodTypes';

interface Props {
  day: DaySummary;
  date: string;
  onChanged: (day: DaySummary) => void;
}

export function MealsPanel({ day, date, onChanged }: Props) {
  const [tab, setTab] = useState<'templates' | 'recipes'>('templates');
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [building, setBuilding] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadTemplates = () => api.listTemplates().then(setTemplates).catch(() => undefined);
  const loadRecipes = () => api.listRecipes().then(setRecipes).catch(() => undefined);

  useEffect(() => {
    void loadTemplates();
    void loadRecipes();
  }, []);

  const entries = day.meals.flatMap((m) => m.entries);

  const saveDayAsTemplate = async () => {
    if (entries.length === 0) return;
    const name = window.prompt('Name this meal template:');
    if (!name) return;
    const items: TemplateItem[] = entries.map((e) => ({
      food: entryToFood(e),
      quantityG: e.quantityG,
      meal: e.meal,
    }));
    setBusy(true);
    try {
      await api.createTemplate(name, items);
      await loadTemplates();
    } finally {
      setBusy(false);
    }
  };

  const logTemplate = async (id: number) => {
    setBusy(true);
    try {
      onChanged(await api.logTemplate(id, date));
    } finally {
      setBusy(false);
    }
  };

  const logRecipe = async (r: Recipe) => {
    // Log one serving: treat "1 serving" as 100 g with per-100g = per-serving macros.
    const food: FoodItem = {
      source: 'recipe',
      name: r.name,
      brand: null,
      barcode: null,
      per100: {
        calories: r.perServing.calories,
        protein: r.perServing.protein,
        carbs: r.perServing.carbs,
        fat: r.perServing.fat,
        fiber: null,
        sugars: null,
        addedSugars: null,
        satFat: null,
        sodium: null,
      },
      novaGroup: null,
      micronutrientCount: 0,
      servingOptions: [{ label: '1 serving', grams: 100 }],
      defaultServingG: 100,
    };
    setBusy(true);
    try {
      const { day: updated } = await api.addEntry(date, 'dinner', food, 100, '1 serving');
      onChanged(updated);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-1 rounded-xl bg-ink-100 p-1">
          {(['templates', 'recipes'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-[10px] px-3 py-1.5 text-sm font-semibold capitalize transition ${
                tab === t ? 'bg-accent-500 text-white shadow-sm' : 'text-ink-600'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === 'templates' ? (
          <button
            onClick={saveDayAsTemplate}
            disabled={busy || entries.length === 0}
            className="btn-ghost px-3 py-1.5 text-sm"
          >
            Save today
          </button>
        ) : (
          <button onClick={() => setBuilding(true)} className="btn-ghost px-3 py-1.5 text-sm">
            New recipe
          </button>
        )}
      </div>

      {tab === 'templates' &&
        (templates.length === 0 ? (
          <Empty text="Save a day's foods as a template to quick-log it later." />
        ) : (
          <ul className="space-y-2">
            {templates.map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-xl border border-ink-100 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink-900">{t.name}</p>
                  <p className="text-xs text-ink-600">
                    {t.items.length} items · {t.totals.calories} kcal
                  </p>
                </div>
                <button
                  onClick={() => logTemplate(t.id)}
                  disabled={busy}
                  className="btn-primary text-xs disabled:opacity-50"
                >
                  Quick-log
                </button>
                <DeleteBtn onClick={async () => { await api.deleteTemplate(t.id); void loadTemplates(); }} />
              </li>
            ))}
          </ul>
        ))}

      {tab === 'recipes' &&
        (recipes.length === 0 ? (
          <Empty text="Build a recipe to auto-calculate per-serving macros." />
        ) : (
          <ul className="space-y-2">
            {recipes.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-xl border border-ink-100 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink-900">{r.name}</p>
                  <p className="text-xs text-ink-600">
                    {r.perServing.calories} kcal · {r.perServing.protein}P / {r.perServing.carbs}C /{' '}
                    {r.perServing.fat}F per serving
                  </p>
                </div>
                <button
                  onClick={() => logRecipe(r)}
                  disabled={busy}
                  className="btn-primary text-xs disabled:opacity-50"
                >
                  Log serving
                </button>
                <DeleteBtn onClick={async () => { await api.deleteRecipe(r.id); void loadRecipes(); }} />
              </li>
            ))}
          </ul>
        ))}

      <RecipeBuilder open={building} onClose={() => setBuilding(false)} onSaved={loadRecipes} />
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-5 text-center text-sm text-ink-600">{text}</p>;
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-none rounded-[10px] p-1.5 text-ink-600 hover:bg-ink-100 hover:text-red-500"
      aria-label="Delete"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
        <path d="M8 2h4a1 1 0 0 1 1 1v1h3a1 1 0 1 1 0 2h-1v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6H3a1 1 0 0 1 0-2h3V3a1 1 0 0 1 1-1zm1 2h2V4H9v0zM7 6v10h6V6H7z" />
      </svg>
    </button>
  );
}
