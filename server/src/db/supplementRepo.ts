import { db } from './index.js';
import { addDaysISO, todayISO } from '../domain/dates.js';

export interface Supplement {
  id: number;
  name: string;
  dose: string | null;
  notes: string | null;
  createdAt: string;
}

export interface SupplementWithStreak extends Supplement {
  streak: number;
  loggedToday: boolean;
}

export function listSupplements(userId: string, date = todayISO()): SupplementWithStreak[] {
  const rows = db.all<{
    id: number;
    name: string;
    dose: string | null;
    notes: string | null;
    created_at: string;
  }>('SELECT * FROM supplements WHERE user_id = ? ORDER BY name ASC', [userId]);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    dose: r.dose,
    notes: r.notes,
    createdAt: r.created_at,
    loggedToday: !!db.get(
      'SELECT 1 FROM supplement_logs WHERE supplement_id = ? AND log_date = ?',
      [r.id, date]
    ),
    streak: computeStreak(userId, r.id, date),
  }));
}

function computeStreak(userId: string, supplementId: number, endDate: string): number {
  let streak = 0;
  let cursor = endDate;
  for (let i = 0; i < 365; i++) {
    const row = db.get(
      'SELECT 1 FROM supplement_logs WHERE user_id = ? AND supplement_id = ? AND log_date = ?',
      [userId, supplementId, cursor]
    );
    if (!row) break;
    streak++;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

export function addSupplement(
  userId: string,
  name: string,
  dose?: string | null,
  notes?: string | null,
): Supplement {
  db.run(
    'INSERT INTO supplements (user_id, name, dose, notes) VALUES (?, ?, ?, ?)',
    [userId, name.trim(), dose?.trim() || null, notes?.trim() || null]
  );
  const row = db.get<{
    id: number; name: string; dose: string | null; notes: string | null; created_at: string;
  }>(
    'SELECT * FROM supplements WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    [userId]
  );
  return { id: row!.id, name: row!.name, dose: row!.dose, notes: row!.notes, createdAt: row!.created_at };
}

export function getSupplement(userId: string, id: number): Supplement | null {
  const row = db.get<{
    id: number; name: string; dose: string | null; notes: string | null; created_at: string;
  }>(
    'SELECT * FROM supplements WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  if (!row) return null;
  return { id: row.id, name: row.name, dose: row.dose, notes: row.notes, createdAt: row.created_at };
}

export function deleteSupplement(userId: string, id: number): boolean {
  const existing = db.get('SELECT id FROM supplements WHERE id = ? AND user_id = ?', [id, userId]);
  if (!existing) return false;
  db.run('DELETE FROM supplements WHERE id = ? AND user_id = ?', [id, userId]);
  return true;
}

export function logSupplement(
  userId: string,
  supplementId: number,
  date: string,
  notes?: string | null,
): boolean {
  const sup = getSupplement(userId, supplementId);
  if (!sup) return false;
  const existing = db.get(
    'SELECT id FROM supplement_logs WHERE supplement_id = ? AND log_date = ?',
    [supplementId, date]
  );
  if (existing) {
    db.run(
      'UPDATE supplement_logs SET notes = ? WHERE supplement_id = ? AND log_date = ?',
      [notes?.trim() || null, supplementId, date]
    );
  } else {
    db.run(
      'INSERT INTO supplement_logs (user_id, supplement_id, log_date, notes) VALUES (?, ?, ?, ?)',
      [userId, supplementId, date, notes?.trim() || null]
    );
  }
  return true;
}

export function unlogSupplement(userId: string, supplementId: number, date: string): boolean {
  const existing = db.get(
    'SELECT id FROM supplement_logs WHERE user_id = ? AND supplement_id = ? AND log_date = ?',
    [userId, supplementId, date]
  );
  if (!existing) return false;
  db.run(
    'DELETE FROM supplement_logs WHERE user_id = ? AND supplement_id = ? AND log_date = ?',
    [userId, supplementId, date]
  );
  return true;
}