import { db } from './index.js';
 
export interface WaterEntry {
  id: number;
  oz: number;
  createdAt: string;
}
 
export interface WaterDay {
  date: string;
  totalOz: number;
  entries: WaterEntry[];
}
 
export function addWater(userId: string, date: string, oz: number): WaterDay {
  db.run('INSERT INTO water_log (user_id, log_date, oz) VALUES (?, ?, ?)', [userId, date, oz]);
  return getWaterDay(userId, date);
}
 
export function getWaterDay(userId: string, date: string): WaterDay {
  const entries = db.all<WaterEntry>(
    'SELECT id, oz, created_at AS createdAt FROM water_log WHERE user_id = ? AND log_date = ? ORDER BY created_at ASC',
    [userId, date]
  );
  const totalOz = entries.reduce((sum, e) => sum + e.oz, 0);
  return { date, totalOz: Math.round(totalOz * 10) / 10, entries };
}
 
export function deleteWater(userId: string, id: number, date: string): WaterDay {
  db.run('DELETE FROM water_log WHERE id = ? AND user_id = ?', [id, userId]);
  return getWaterDay(userId, date);
}

export function dailyWaterTotals(
  userId: string,
  sinceISO: string,
): { date: string; totalOz: number }[] {
  return db.all<{ date: string; totalOz: number }>(
    `SELECT log_date AS date, ROUND(SUM(oz) * 10) / 10 AS totalOz
       FROM water_log
      WHERE user_id = ? AND log_date >= ?
      GROUP BY log_date
      ORDER BY log_date ASC`,
    [userId, sinceISO],
  );
}
 