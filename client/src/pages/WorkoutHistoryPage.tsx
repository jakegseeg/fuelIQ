import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { Spinner } from '../components/Spinner';
import { api } from '../lib/api';
import { logSourceBadge } from '../lib/cardioMet';
import { kgToLbs } from '../lib/units';
import { focusStyle, type WorkoutLog, type WorkoutStats } from '../lib/workoutTypes';
import { FocusIcon } from '../lib/focusIcon';

export function WorkoutHistoryPage() {
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const [s, l] = await Promise.all([api.workoutHistory(), api.listWorkoutLogs()]);
    setStats(s);
    setLogs(l);
  };

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  const remove = async (log: WorkoutLog) => {
    await api.deleteWorkoutLog(log.id, log.date);
    await reload();
  };

  return (
    <AppShell
      title="Workout History"
      maxWidth="max-w-5xl"
      actions={
        <Link to="/workouts" className="text-sm font-semibold text-accent-300 hover:underline">
          Plan
        </Link>
      }
    >
      {loading || !stats ? (
          <div className="flex h-64 items-center justify-center"><Spinner label="Loading history…" /></div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Weekly streak" value={`${stats.weeklyStreak}`} unit="wk" accent />
              <StatCard label="This week" value={`${stats.thisWeekSessions}`} unit="sessions" />
              <StatCard label="Total sessions" value={`${stats.totalSessions}`} />
              <StatCard
                label="Total burned"
                value={logs.reduce((s, l) => s + l.caloriesBurned, 0).toLocaleString()}
                unit="kcal"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <VolumeChart stats={stats} />
              <PersonalRecords stats={stats} />
            </div>

            <section className="card">
              <h3 className="font-bold">Recent sessions</h3>
              {logs.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-600">
                  No workouts logged yet.{' '}
                  <Link to="/workouts" className="font-semibold text-brand-600">Start one →</Link>
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {logs.map((log) => {
                    const style = focusStyle(log.focus);
                    const badge = logSourceBadge(log);
                    return (
                      <li key={log.id} className="flex items-center gap-3 rounded-xl border border-ink-100 p-3">
                        <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${style.color}`}>
                          <FocusIcon focus={log.focus} size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-ink-900">
                            {log.focus}
                            {badge && (
                              <span className="ml-2 text-xs font-medium text-ink-400">{badge}</span>
                            )}
                          </p>
                          <p className="text-xs text-ink-600">
                            {new Date(log.date + 'T00:00:00').toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            · {log.durationMin} min
                            {log.logSource !== 'cardio' && log.totalSets > 0
                              ? ` · ${log.totalSets} sets`
                              : ''}
                          </p>
                        </div>
                        <span className="flex-none text-sm font-bold text-brand-600">
                          {log.caloriesBurned} kcal
                        </span>
                        <button
                          onClick={() => remove(log)}
                          className="flex-none rounded-lg p-1.5 text-ink-300 hover:bg-ink-100 hover:text-red-500"
                          aria-label="Delete session"
                        >
                          <X size={14} aria-hidden />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
    </AppShell>
  );
}

function StatCard({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: boolean }) {
  return (
    <div className={`card ${accent ? 'bg-accent-500 text-white ring-0' : ''}`}>
      <p className={`text-3xl font-extrabold ${accent ? 'text-white' : 'text-ink-900'}`}>
        {value}
        {unit && <span className={`text-sm font-semibold ${accent ? 'text-white/70' : 'text-ink-600'}`}> {unit}</span>}
      </p>
      <p className={`text-xs ${accent ? 'text-white/80' : 'text-ink-600'}`}>{label}</p>
    </div>
  );
}

function VolumeChart({ stats }: { stats: WorkoutStats }) {
  const max = Math.max(1, ...stats.volumeByMuscle.map((v) => v.volume));
  return (
    <section className="card">
      <h3 className="font-bold">Volume by muscle group</h3>
      <p className="text-xs text-ink-600">This week · weight × reps (kg)</p>
      {stats.volumeByMuscle.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-600">No sets logged this week yet.</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {stats.volumeByMuscle.map((v) => (
            <li key={v.muscleGroup}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-semibold text-ink-700">{v.muscleGroup}</span>
                <span className="text-ink-600">{v.volume.toLocaleString()} · {v.sets} sets</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full rounded-full bg-accent-200"
                  style={{ width: `${(v.volume / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PersonalRecords({ stats }: { stats: WorkoutStats }) {
  return (
    <section className="card">
      <h3 className="font-bold">Personal records</h3>
      <p className="text-xs text-ink-600">Heaviest weight logged per exercise</p>
      {stats.personalRecords.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-600">
          Log weighted sets to start tracking PRs.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {stats.personalRecords.slice(0, 10).map((pr) => (
            <li key={pr.exercise} className="flex items-center justify-between gap-3 border-b border-ink-50 pb-2 last:border-0">
              <span className="min-w-0 truncate text-sm font-medium text-ink-800">{pr.exercise}</span>
              <span className="flex-none text-sm font-bold text-ink-900">
                {pr.weightKg} kg
                <span className="font-normal text-ink-600"> ({Math.round(kgToLbs(pr.weightKg))} lb × {pr.reps})</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
