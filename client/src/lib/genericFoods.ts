/** Client helper to recognize generic staple foods returned by the API. */
export function isGenericFood(barcode: string | null | undefined): boolean {
  return !!barcode && barcode.startsWith('generic:');
}
