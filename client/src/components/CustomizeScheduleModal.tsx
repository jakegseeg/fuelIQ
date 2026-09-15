import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { api } from '../lib/api';
import {
  WEEKDAYS,
  defaultWorkoutSchedule,
  type WorkoutPlanRecord,
  type WorkoutSchedulePreferences,
} from '../lib/workoutTypes';

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: WorkoutSchedulePreferences | null;
  onSaved: (plan: WorkoutPlanRecord | null, schedule: WorkoutSchedulePreferences) => void;
}

export function CustomizeScheduleModal({ open, onClose, initial, onSaved }: Props) {
  const [draft, setDraft] = useState<WorkoutSchedulePreferences>(defaultWorkoutSchedule());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(initial?.days?.length === 7 ? initial : defaultWorkoutSchedule());
    setError(null);
  }, [open, initial]);

  const updateDay = (
    day: string,
    patch: Partial<WorkoutSchedulePreferences['days'][number]>,
  ) => {
    setDraft((prev) => ({
      days: prev.days.map((d) => (d.day === day ? { ...d, ...patch } : d)),
    }));
  };

  const save = async () => {
    const availableCount = draft.days.filter((d) => d.available).length;
    if (availableCount === 0) {
      setError('Keep at least one day available for workouts.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await api.saveWorkoutSchedule(draft);
      onSaved(result.plan, result.schedule);
      onClose();
    } catch {
      setError('Could not save your schedule. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Customize schedule" maxWidth="max-w-lg">
      <p className="text-sm text-ink-600">
        Choose which days you can train and your preferred workout time. Your plan will move
        workouts onto available days only.
      </p>

      <div className="mt-4 space-y-3">
        {WEEKDAYS.map((dayName) => {
          const row = draft.days.find((d) => d.day === dayName) ?? {
            day: dayName,
            available: true,
            preferredTime: null,
          };
          return (
            <div
              key={dayName}
              className={`flex flex-wrap items-center gap-3 rounded-[10px] border p-3 transition ${
                row.available
                  ? 'border-ink-200 bg-surface'
                  : 'border-ink-200/60 bg-ink-50 opacity-80'
              }`}
            >
              <label className="flex min-w-[7rem] flex-1 cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={row.available}
                  onChange={(e) => updateDay(dayName, { available: e.target.checked })}
                  className="h-4 w-4 rounded border-ink-300 text-accent-400"
                />
                <span className="font-semibold text-ink-900">{dayName}</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-ink-600">Preferred time</span>
                <input
                  type="time"
                  disabled={!row.available}
                  value={row.preferredTime ?? ''}
                  onChange={(e) =>
                    updateDay(dayName, { preferredTime: e.target.value || null })
                  }
                  className="rounded-lg border border-ink-200 bg-surface2 px-2 py-1.5 text-sm text-ink-900 disabled:opacity-40"
                />
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="mt-3 text-sm font-medium text-coral-300">{error}</p>
      )}

      <div className="mt-5 flex gap-3">
        <button type="button" onClick={onClose} className="btn-ghost flex-1" disabled={saving}>
          Cancel
        </button>
        <button type="button" onClick={save} className="btn-primary flex-1" disabled={saving}>
          {saving ? 'Saving…' : 'Save schedule'}
        </button>
      </div>
    </Modal>
  );
}
