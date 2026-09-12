import type { EnergyUnit } from './types';

export const KG_PER_LB = 0.45359237;
export const CM_PER_INCH = 2.54;
export const KJ_PER_KCAL = 4.184;

export const lbsToKg = (lbs: number) => lbs * KG_PER_LB;
export const kgToLbs = (kg: number) => kg / KG_PER_LB;
export const inchesToCm = (inches: number) => inches * CM_PER_INCH;
export const cmToInches = (cm: number) => cm / CM_PER_INCH;

/** Split total cm into feet + inches for imperial display. */
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cmToInches(cm);
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - feet * 12);
  if (inches === 12) return { feet: feet + 1, inches: 0 };
  return { feet, inches };
}

export const feetInchesToCm = (feet: number, inches: number) =>
  inchesToCm(feet * 12 + inches);

/** Format an energy value (stored in kcal) in the user's preferred unit. */
export function formatEnergy(kcal: number, unit: EnergyUnit): string {
  if (unit === 'kj') return `${Math.round(kcal * KJ_PER_KCAL).toLocaleString()} kJ`;
  return `${Math.round(kcal).toLocaleString()} kcal`;
}

export function energyValue(kcal: number, unit: EnergyUnit): number {
  return unit === 'kj' ? Math.round(kcal * KJ_PER_KCAL) : Math.round(kcal);
}

export const energyLabel = (unit: EnergyUnit) => (unit === 'kj' ? 'kJ' : 'kcal');

/** Format a weight (stored in kg) in the preferred unit. */
export function formatWeight(kg: number, unit: 'lbs' | 'kg', decimals = 1): string {
  const value = unit === 'lbs' ? kgToLbs(kg) : kg;
  return `${value.toFixed(decimals)} ${unit}`;
}
