import { INGREDIENT_CATALOG } from './groceryCatalog.js';

export function normalizePantryTerm(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

/** True when a catalog ingredient key matches something in the user's pantry. */
export function ingredientOwnedByPantry(ingredientKey: string, pantry: string[]): boolean {
  if (pantry.length === 0) return false;
  const catalog = INGREDIENT_CATALOG[ingredientKey];
  const keyNorm = normalizePantryTerm(ingredientKey);
  const nameNorm = catalog ? normalizePantryTerm(catalog.displayName) : keyNorm;
  const pantryNorm = pantry.map(normalizePantryTerm).filter(Boolean);

  return pantryNorm.some((p) => p === keyNorm || p === nameNorm);
}
