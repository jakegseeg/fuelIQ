import { useCallback, useEffect, useState } from 'react';
import { Spinner } from '../Spinner';
import { api } from '../../lib/api';
import type { LoggingStreakDay } from '../../lib/progressTypes';

function coachStreakMessage(streak: number): string {
  if (streak === 0) return "Coach is waiting. Don't make Coach wait.";
  if (streak <= 3) return "You're just getting started. Don't quit on Coach now.";
  if (streak <= 6) return 'Coach sees you showing up. Keep going.';
  return "FIRED UP. You're locked in. Shut it down!";
}

interface Props {
  className?: string;
  refreshKey?: number;
}

export function LoggingStreakCard({ className = '', refreshKey = 0 }: Props) {
  const [streak, setStreak] = useState(0);
  const [week, setWeek] = useState<LoggingStreakDay[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const data = await api.getLoggingStreak();
    setStreak(data.streak);
    setWeek(data.week);
    return data;
  }, []);

  useEffect(() => {
    setLoading(true);
    reload().finally(() => setLoading(false));
  }, [reload, refreshKey]);

  return (
    <div
      className={`flex flex-col surface-card ${className}`}
    >
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner label="Loading streak…" />
        </div>
      ) : (
        <>
          <p className="section-label">Logging Streak</p>

          <div className="flex flex-1 flex-col items-center justify-center py-2">
            <p className="display-num">
              {streak}
            </p>
            <p className="mt-1 text-xs text-ink-600">days</p>
          </div>

          <div className="flex items-center justify-center gap-2 py-2">
            {week.map((d) => (
              <div key={d.date} className="flex flex-col items-center gap-1">
                <span
                  title={`${d.day}${d.logged ? ' — logged' : ''}`}
                  className={`block h-2.5 w-2.5 rounded-full ${
                    d.logged ? 'bg-accent-400' : 'bg-line-streak'
                  } ${d.isToday ? 'ring-2 ring-accent-400 ring-offset-2 ring-offset-surface' : ''}`}
                />
              </div>
            ))}
          </div>

          <p className="text-center text-xs italic text-accent-500">
            {coachStreakMessage(streak)}
          </p>
        </>
      )}
    </div>
  );
}
