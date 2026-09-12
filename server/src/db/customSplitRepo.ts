import { db } from './index.js';
import type { CustomSplitData, CustomSplitRecord } from '../domain/customSplit.js';

interface CustomSplitRow {
  id: number;
  user_id: string;
  split_json: string;
  created_at: string;
}

function rowToRecord(row: CustomSplitRow): CustomSplitRecord {
  return {
    id: row.id,
    split: JSON.parse(row.split_json) as CustomSplitData,
    createdAt: row.created_at,
  };
}

export function getCustomSplit(userId: string): CustomSplitRecord | null {
  const row = db.get<CustomSplitRow>(
    'SELECT * FROM custom_splits WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    [userId],
  );
  return row ? rowToRecord(row) : null;
}

export function saveCustomSplit(userId: string, split: CustomSplitData): CustomSplitRecord {
  const existing = db.get<{ id: number }>(
    'SELECT id FROM custom_splits WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    [userId],
  );
  const json = JSON.stringify(split);
  if (existing) {
    db.run('UPDATE custom_splits SET split_json = ?, created_at = datetime(\'now\') WHERE id = ? AND user_id = ?', [
      json,
      existing.id,
      userId,
    ]);
    return getCustomSplit(userId)!;
  }
  db.run('INSERT INTO custom_splits (user_id, split_json) VALUES (?, ?)', [userId, json]);
  return getCustomSplit(userId)!;
}

export function updateCustomSplitPlan(userId: string, plan: CustomSplitData['generatedPlan']): CustomSplitRecord | null {
  const record = getCustomSplit(userId);
  if (!record) return null;
  return saveCustomSplit(userId, { ...record.split, generatedPlan: plan });
}
