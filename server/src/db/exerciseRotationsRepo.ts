import { db } from './index.js';

interface RotationRow {
  id: number;
  user_id: string;
  rotation_group: string;
  current_index: number;
  last_rotated_date: string;
}

const ROTATION_INTERVAL_DAYS = 14;

function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA.slice(0, 10));
  const b = new Date(isoB.slice(0, 10));
  return Math.floor((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

export function getRotationRow(userId: string, rotationGroup: string): RotationRow | null {
  return (
    db.get<RotationRow>(
      'SELECT * FROM exercise_rotations WHERE user_id = ? AND rotation_group = ?',
      [userId, rotationGroup],
    ) ?? null
  );
}

export function upsertRotationRow(
  userId: string,
  rotationGroup: string,
  currentIndex: number,
  lastRotatedDate: string,
): void {
  const existing = getRotationRow(userId, rotationGroup);
  if (existing) {
    db.run(
      `UPDATE exercise_rotations SET current_index = ?, last_rotated_date = ?
       WHERE user_id = ? AND rotation_group = ?`,
      [currentIndex, lastRotatedDate, userId, rotationGroup],
    );
    return;
  }
  db.run(
    `INSERT INTO exercise_rotations (user_id, rotation_group, current_index, last_rotated_date)
     VALUES (?, ?, ?, ?)`,
    [userId, rotationGroup, currentIndex, lastRotatedDate],
  );
}

/** Advance rotation indices for groups where 14+ days have elapsed. Returns groups that rotated. */
export function advanceRotationsIfDue(userId: string, rotationGroups: string[]): Set<string> {
  const today = new Date().toISOString().slice(0, 10);
  const rotated = new Set<string>();

  for (const group of rotationGroups) {
    const row = getRotationRow(userId, group);
    if (!row) {
      upsertRotationRow(userId, group, 0, today);
      continue;
    }
    if (daysBetween(row.last_rotated_date, today) >= ROTATION_INTERVAL_DAYS) {
      upsertRotationRow(userId, group, row.current_index + 1, today);
      rotated.add(group);
    }
  }

  return rotated;
}

export function getRotationIndex(userId: string, rotationGroup: string): number {
  const row = getRotationRow(userId, rotationGroup);
  return row?.current_index ?? 0;
}

export function listUserRotations(userId: string): RotationRow[] {
  return db.all<RotationRow>(
    'SELECT * FROM exercise_rotations WHERE user_id = ? ORDER BY rotation_group ASC',
    [userId],
  );
}
