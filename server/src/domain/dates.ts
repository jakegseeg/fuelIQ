/** Pure date helpers operating on YYYY-MM-DD strings (UTC-safe). */

export function isoOf(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

export function parseISO(iso: string): Date {
  return new Date(iso + 'T00:00:00Z');
}

export function addDaysISO(iso: string, delta: number): string {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + delta);
  return isoOf(d);
}

export function todayISO(now: Date = new Date()): string {
  // Use local calendar date.
  const tz = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tz).toISOString().slice(0, 10);
}

/** Inclusive list of the last `n` ISO dates ending at `endISO` (chronological). */
export function lastNDates(n: number, endISO: string): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDaysISO(endISO, -i));
  return out;
}

/** Monday of the ISO week containing `iso`. */
export function weekStartISO(iso: string): string {
  const d = parseISO(iso);
  const day = d.getUTCDay() || 7; // Sun=7
  d.setUTCDate(d.getUTCDate() - (day - 1));
  return isoOf(d);
}

export function daysBetween(aISO: string, bISO: string): number {
  return Math.round((parseISO(bISO).getTime() - parseISO(aISO).getTime()) / 86400000);
}
