import type { IngredientCatalogEntry } from './grocery.js';

/** Average US ingredient prices — base before regional multiplier. */
export const INGREDIENT_CATALOG: Record<string, IngredientCatalogEntry> = {
  'chicken breast': { displayName: 'Chicken breast', category: 'protein', price: 3.5, unit: 'lb' },
  'ground beef': { displayName: 'Ground beef', category: 'protein', price: 4.0, unit: 'lb' },
  'ground turkey': { displayName: 'Ground turkey', category: 'protein', price: 3.8, unit: 'lb' },
  salmon: { displayName: 'Salmon fillet', category: 'protein', price: 8.0, unit: 'lb' },
  'turkey deli': { displayName: 'Turkey deli meat', category: 'protein', price: 3.5, unit: 'pack' },
  tuna: { displayName: 'Tuna (canned)', category: 'protein', price: 1.2, unit: 'can' },
  eggs: { displayName: 'Eggs', category: 'protein', price: 4.0, unit: 'dozen' },
  'chicken thighs': { displayName: 'Chicken thighs', category: 'protein', price: 2.8, unit: 'lb' },
  'greek yogurt': { displayName: 'Greek yogurt', category: 'dairy', price: 1.5, unit: 'cup' },
  milk: { displayName: 'Milk', category: 'dairy', price: 3.5, unit: 'gallon' },
  bread: { displayName: 'Bread loaf', category: 'grains', price: 2.5, unit: 'loaf' },
  tortilla: { displayName: 'Tortillas', category: 'grains', price: 3.0, unit: 'pack' },
  pasta: { displayName: 'Pasta', category: 'grains', price: 1.5, unit: 'lb' },
  rice: { displayName: 'Rice', category: 'grains', price: 2.5, unit: '2 lb bag' },
  oats: { displayName: 'Oats', category: 'grains', price: 3.0, unit: 'container' },
  'sweet potato': { displayName: 'Sweet potato', category: 'produce', price: 0.8, unit: 'each' },
  broccoli: { displayName: 'Broccoli', category: 'produce', price: 1.5, unit: 'head' },
  carrots: { displayName: 'Carrots', category: 'produce', price: 1.2, unit: 'bag' },
  celery: { displayName: 'Celery', category: 'produce', price: 1.5, unit: 'bunch' },
  onion: { displayName: 'Onion', category: 'produce', price: 0.8, unit: 'each' },
  garlic: { displayName: 'Garlic', category: 'produce', price: 0.5, unit: 'head' },
  lentils: { displayName: 'Lentils', category: 'grains', price: 2.0, unit: 'bag' },
  'black beans': { displayName: 'Black beans (canned)', category: 'grains', price: 1.0, unit: 'can' },
  'tomato sauce': { displayName: 'Tomato sauce', category: 'grains', price: 2.0, unit: 'jar' },
  'soy sauce': { displayName: 'Soy sauce', category: 'grains', price: 2.5, unit: 'bottle' },
  'olive oil': { displayName: 'Olive oil', category: 'grains', price: 5.0, unit: 'bottle' },
  butter: { displayName: 'Butter', category: 'dairy', price: 4.0, unit: 'pack' },
  mayo: { displayName: 'Mayo', category: 'grains', price: 3.5, unit: 'jar' },
  salsa: { displayName: 'Salsa', category: 'grains', price: 3.0, unit: 'jar' },
  'peanut butter': { displayName: 'Peanut butter', category: 'grains', price: 3.5, unit: 'jar' },
  honey: { displayName: 'Honey', category: 'grains', price: 4.0, unit: 'jar' },
  granola: { displayName: 'Granola', category: 'grains', price: 4.0, unit: 'bag' },
  berries: { displayName: 'Berries (frozen)', category: 'produce', price: 3.5, unit: 'bag' },
  banana: { displayName: 'Banana', category: 'produce', price: 0.25, unit: 'each' },
  lemon: { displayName: 'Lemon', category: 'produce', price: 0.5, unit: 'each' },
  cheese: { displayName: 'Cheese (block)', category: 'dairy', price: 4.0, unit: 'block' },
  broth: { displayName: 'Broth', category: 'grains', price: 2.5, unit: 'carton' },
  noodles: { displayName: 'Egg noodles', category: 'grains', price: 2.0, unit: 'bag' },
  lettuce: { displayName: 'Lettuce', category: 'produce', price: 2.0, unit: 'head' },
  salt: { displayName: 'Salt', category: 'grains', price: 1.0, unit: 'container' },
};

export const CATEGORY_META = {
  protein: { label: 'Protein', icon: '🥩' },
  produce: { label: 'Produce', icon: '🥦' },
  dairy: { label: 'Dairy', icon: '🧀' },
  grains: { label: 'Grains & Pantry', icon: '🌾' },
} as const;

export const MEAL_BUDGET_SWAPS: Record<string, string> = {
  'baked-salmon-rice': 'chicken-rice-bowl',
  'beef-rice-stir-fry': 'black-bean-quesadilla',
  'spaghetti-meat-sauce': 'lentil-soup',
  'baked-chicken-thighs': 'chicken-rice-bowl',
  'ground-turkey-sweet-potato': 'black-bean-tacos',
  'turkey-sandwich': 'tuna-wrap',
  'greek-yogurt-parfait': 'peanut-butter-toast',
  'egg-cheese-burrito': 'scrambled-eggs-toast',
};

export function regionalPriceMultiplier(location: string): number {
  const loc = location.toLowerCase();
  if (
    /\but\b|utah|provo|idaho|wyoming|montana|rural|midwest/i.test(loc) &&
    !/california|new york|nyc/i.test(loc)
  ) {
    return 0.95;
  }
  if (/california|\bca\b|new york|\bnyc\b|san francisco|los angeles|brooklyn/i.test(loc)) {
    return 1.15;
  }
  return 1.0;
}

const DEFAULT_INGREDIENT_PRICE = 1.5;

export function priceIngredient(key: string, batchAmount: number, multiplier: number): number {
  const entry = INGREDIENT_CATALOG[key];
  if (!entry) return 0;
  return Math.round(entry.price * batchAmount * multiplier * 100) / 100;
}

/** Price an ingredient using catalog prices or $1.50 default per unit. */
export function estimateIngredientCost(key: string, batchAmount: number, multiplier = 1): number {
  const entry = INGREDIENT_CATALOG[key];
  const price = entry?.price ?? DEFAULT_INGREDIENT_PRICE;
  return Math.round(price * batchAmount * multiplier * 100) / 100;
}

/** Map a free-text ingredient name to a catalog key when possible. */
export function normalizeIngredientKey(name: string): string {
  const n = name.toLowerCase().trim();
  if (INGREDIENT_CATALOG[n]) return n;

  const aliases: Record<string, string> = {
    chicken: 'chicken breast',
    'chicken breasts': 'chicken breast',
    'chicken breast': 'chicken breast',
    'chicken thigh': 'chicken thighs',
    'chicken thighs': 'chicken thighs',
    'minced beef': 'ground beef',
    'beef mince': 'ground beef',
    'ground beef': 'ground beef',
    salmon: 'salmon',
    'salmon fillet': 'salmon',
    tuna: 'tuna',
    egg: 'eggs',
    eggs: 'eggs',
    'greek yoghurt': 'greek yogurt',
    yoghurt: 'greek yogurt',
    yogurt: 'greek yogurt',
    'black bean': 'black beans',
    'black beans': 'black beans',
    spaghetti: 'pasta',
    penne: 'pasta',
    'olive oil': 'olive oil',
    'vegetable oil': 'olive oil',
    onion: 'onion',
    onions: 'onion',
    garlic: 'garlic',
    butter: 'butter',
    cheese: 'cheese',
    milk: 'milk',
    bread: 'bread',
    rice: 'rice',
    potato: 'sweet potato',
    potatoes: 'sweet potato',
    broccoli: 'broccoli',
    carrot: 'carrots',
    carrots: 'carrots',
    celery: 'celery',
    lemon: 'lemon',
    salt: 'salt',
    honey: 'honey',
    oats: 'oats',
    'soy sauce': 'soy sauce',
    salsa: 'salsa',
    mayo: 'mayo',
    mayonnaise: 'mayo',
    tortilla: 'tortilla',
    tortillas: 'tortilla',
    lentil: 'lentils',
    lentils: 'lentils',
    broth: 'broth',
    'chicken stock': 'broth',
    'beef stock': 'broth',
    stock: 'broth',
    noodles: 'noodles',
    pasta: 'pasta',
    tomato: 'tomato sauce',
    'tomato sauce': 'tomato sauce',
    'tomatoes': 'tomato sauce',
    peanut: 'peanut butter',
    'peanut butter': 'peanut butter',
    banana: 'banana',
    berries: 'berries',
    granola: 'granola',
    lettuce: 'lettuce',
    turkey: 'ground turkey',
    'ground turkey': 'ground turkey',
  };

  if (aliases[n]) return aliases[n];

  for (const key of Object.keys(INGREDIENT_CATALOG)) {
    if (n.includes(key) || key.includes(n)) return key;
  }

  return n;
}
