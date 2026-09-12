import type { FoodItem } from './foodTypes';

export interface ManualFoodForm {
  name: string;
  servingG: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

export const EMPTY_MANUAL_FOOD_FORM: ManualFoodForm = {
  name: '',
  servingG: '100',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
};

/** Build a loggable custom FoodItem from per-serving macro inputs. */
export function buildCustomFoodFromForm(form: ManualFoodForm): FoodItem | null {
  const name = form.name.trim();
  if (!name || form.calories === '') return null;

  const servingG = Number(form.servingG) || 100;
  if (servingG <= 0) return null;
  const scale = 100 / servingG;

  const scaleMacro = (v: string) => (v === '' ? 0 : Number(v) * scale);

  return {
    source: 'custom',
    name,
    brand: null,
    barcode: null,
    per100: {
      calories: scaleMacro(form.calories),
      protein: scaleMacro(form.protein),
      carbs: scaleMacro(form.carbs),
      fat: scaleMacro(form.fat),
      fiber: null,
      sugars: null,
      addedSugars: null,
      satFat: null,
      sodium: null,
    },
    novaGroup: null,
    micronutrientCount: 0,
    servingOptions: [{ label: `1 serving (${servingG} g)`, grams: servingG }, { label: '100 g', grams: 100 }],
    defaultServingG: servingG,
  };
}
