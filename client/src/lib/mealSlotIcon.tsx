import { Coffee, Salad, UtensilsCrossed } from 'lucide-react';
import type { GroceryMealSlot } from './groceryTypes';

/** Meal slot icon for upcoming items and meal UI. */
export function MealSlotIcon({ slot, size = 20 }: { slot: GroceryMealSlot; size?: number }) {
  if (slot === 'breakfast') return <Coffee size={size} aria-hidden />;
  if (slot === 'lunch') return <Salad size={size} aria-hidden />;
  return <UtensilsCrossed size={size} aria-hidden />;
}
