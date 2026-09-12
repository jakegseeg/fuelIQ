import { useState } from 'react';
import { Segmented } from './fields';
import { Modal } from './Modal';
import { api, ApiError } from '../lib/api';
import {
  MUSCLE_GROUP_OPTIONS,
  SPLIT_PRESET_OPTIONS,
  applySplitPreset,
  emptyWeekConfig,
  type CustomSplitConfig,
  type CustomSplitDayConfig,
  type CustomSplitRecord,
  type MuscleGroup,
  type SplitPreset,
} from '../lib/customSplitTypes';
import { DURATION_OPTIONS } from '../lib/workoutTypes';

interface Props {
  initial?: CustomSplitConfig;
  onGenerated: (record: CustomSplitRecord) => void;
}

export function MySplitSetup({ initial, onGenerated }: Props) {
  const [days, setDays] = useState<CustomSplitDayConfig[]>(
    initial?.days ?? emptyWeekConfig(),
  );
  const [defaultDurationMin, setDefaultDurationMin] = useState<CustomSplitConfig['defaultDurationMin']>(
    initial?.defaultDurationMin ?? 45,
  );
  const [preset, setPreset] = useState<SplitPreset>(initial?.preset ?? 'custom');
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (next: SplitPreset) => {
    setPreset(next);
    if (next !== 'custom') {
      setDays(applySplitPreset(next));
    }
  };

  const openDay = (index: number) => setEditingDay(index);

  const saveDay = (index: number, next: CustomSplitDayConfig) => {
    setDays((list) => list.map((d, i) => (i === index ? next : d)));
    setPreset('custom');
    setEditingDay(null);
  };

  const generate = async () => {
    const trainingDays = days.filter((d) => !d.rest && d.muscleGroups.length > 0);
    if (trainingDays.length === 0) {
      setError('Assign at least one training day with muscle groups.');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const config: CustomSplitConfig = {
        days,
        defaultDurationMin,
        preset,
      };
      const record = await api.saveCustomSplit(config);
      onGenerated(record);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not generate split.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="card space-y-6">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight">Build your split</h2>
        <p className="mt-1 text-sm text-ink-600">
          Choose which muscle groups to train each day. We&apos;ll fill in goal-appropriate exercises.
        </p>
      </div>

      <div>
        <p className="field-label mb-2">Quick presets</p>
        <div className="flex flex-wrap gap-2">
          {SPLIT_PRESET_OPTIONS.filter((p) => p.id !== 'custom').map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                preset === p.id
                  ? 'bg-accent-500 text-white'
                  : 'border border-ink-200 bg-surface text-ink-700 hover:border-accent-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="field-label mb-2">Weekly schedule</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {days.map((day, i) => (
            <button
              key={day.day}
              type="button"
              onClick={() => openDay(i)}
              className="rounded-2xl border border-ink-200 bg-surface p-3 text-left transition hover:border-accent-300"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-600">
                {day.day.slice(0, 3)}
              </p>
              {day.rest || day.muscleGroups.length === 0 ? (
                <p className="mt-1 text-xs font-semibold text-ink-500">Rest</p>
              ) : (
                <p className="mt-1 text-xs font-semibold leading-snug text-ink-900">
                  {day.muscleGroups.join(' · ')}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="field-label mb-2">Preferred workout time</p>
        <Segmented
          value={String(defaultDurationMin)}
          onChange={(v) => setDefaultDurationMin(Number(v) as CustomSplitConfig['defaultDurationMin'])}
          options={DURATION_OPTIONS.map((d) => ({ value: String(d), label: `${d} min` }))}
        />
        <p className="mt-1 text-xs text-ink-500">Applies to all training days unless overridden per day.</p>
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <button type="button" className="btn-primary w-full" disabled={generating} onClick={generate}>
        {generating ? 'Generating…' : 'Generate my split'}
      </button>

      {editingDay != null && (
        <DayMuscleSelector
          day={days[editingDay]!}
          defaultDurationMin={defaultDurationMin}
          onClose={() => setEditingDay(null)}
          onSave={(next) => saveDay(editingDay, next)}
        />
      )}
    </div>
  );
}

function DayMuscleSelector({
  day,
  defaultDurationMin,
  onClose,
  onSave,
}: {
  day: CustomSplitDayConfig;
  defaultDurationMin: CustomSplitConfig['defaultDurationMin'];
  onClose: () => void;
  onSave: (day: CustomSplitDayConfig) => void;
}) {
  const [rest, setRest] = useState(day.rest || day.muscleGroups.length === 0);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>(day.muscleGroups);
  const [durationMin, setDurationMin] = useState<CustomSplitConfig['defaultDurationMin'] | undefined>(
    day.durationMin as CustomSplitConfig['defaultDurationMin'] | undefined,
  );

  const toggleGroup = (group: MuscleGroup) => {
    setRest(false);
    setMuscleGroups((list) =>
      list.includes(group) ? list.filter((g) => g !== group) : [...list, group],
    );
  };

  const save = () => {
    if (rest || muscleGroups.length === 0) {
      onSave({ ...day, rest: true, muscleGroups: [], durationMin: undefined });
      return;
    }
    onSave({
      ...day,
      rest: false,
      muscleGroups,
      durationMin: durationMin === defaultDurationMin ? undefined : durationMin,
    });
  };

  return (
    <Modal open onClose={onClose} title={`${day.day} workout`} maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setRest(true);
              setMuscleGroups([]);
            }}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
              rest ? 'bg-accent-500 text-white' : 'border border-ink-200 text-ink-700'
            }`}
          >
            Rest
          </button>
          <button
            type="button"
            onClick={() => setRest(false)}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
              !rest ? 'bg-accent-500 text-white' : 'border border-ink-200 text-ink-700'
            }`}
          >
            Train
          </button>
        </div>

        {!rest && (
          <>
            <div>
              <p className="field-label mb-2">Muscle groups</p>
              <div className="flex flex-wrap gap-2">
                {MUSCLE_GROUP_OPTIONS.map((group) => {
                  const selected = muscleGroups.includes(group);
                  return (
                    <button
                      key={group}
                      type="button"
                      onClick={() => toggleGroup(group)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        selected
                          ? 'bg-accent-500 text-white'
                          : 'border border-ink-200 bg-surface text-ink-700 hover:border-accent-300'
                      }`}
                    >
                      {group}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="field-label mb-2">Duration for this day</p>
              <Segmented
                value={String(durationMin ?? defaultDurationMin)}
                onChange={(v) =>
                  setDurationMin(Number(v) as CustomSplitConfig['defaultDurationMin'])
                }
                options={DURATION_OPTIONS.map((d) => ({ value: String(d), label: `${d} min` }))}
                size="sm"
              />
            </div>
          </>
        )}

        <div className="flex gap-2 pt-2">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary flex-1" onClick={save}>
            Save day
          </button>
        </div>
      </div>
    </Modal>
  );
}
