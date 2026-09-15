import { useState } from 'react';
import { Segmented, SelectCard } from './fields';
import { api, ApiError } from '../lib/api';
import {
  DURATION_OPTIONS,
  EQUIPMENT_OPTIONS,
  FITNESS_OPTIONS,
  type Equipment,
  type FitnessLevel,
  type PlanInput,
  type WorkoutPlanRecord,
} from '../lib/workoutTypes';

interface Props {
  initial?: PlanInput;
  profileDefaults?: {
    preferredWorkoutDuration?: number;
    equipmentAvailable?: Equipment[];
    fitnessLevel?: FitnessLevel;
  };
  onGenerated: (record: WorkoutPlanRecord) => void;
}

export function PlanGeneratorForm({ initial, profileDefaults, onGenerated }: Props) {
  const [daysPerWeek, setDaysPerWeek] = useState(initial?.daysPerWeek ?? 4);
  const [equipment, setEquipment] = useState<Equipment[]>(
    initial?.equipment ?? profileDefaults?.equipmentAvailable ?? ['full_gym'],
  );
  const [durationMin, setDurationMin] = useState(
    initial?.durationMin ?? profileDefaults?.preferredWorkoutDuration ?? 45,
  );
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>(
    initial?.fitnessLevel ?? profileDefaults?.fitnessLevel ?? 'intermediate',
  );
  const [limitations, setLimitations] = useState(initial?.limitations ?? '');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleEquip = (value: Equipment) => {
    setEquipment((list) =>
      list.includes(value) ? list.filter((e) => e !== value) : [...list, value],
    );
  };

  const generate = async () => {
    if (equipment.length === 0) {
      setError('Select at least one equipment option.');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const { plan } = await api.generatePlan({
        daysPerWeek,
        equipment,
        durationMin,
        fitnessLevel,
        limitations: limitations.trim(),
      });
      onGenerated(plan);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? 'Finish your profile setup first so we can tailor your plan.'
          : 'Could not generate a plan. Please try again.',
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="field-label">Days per week</label>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button
              key={n}
              onClick={() => setDaysPerWeek(n)}
              className={`h-10 w-10 rounded-[10px] text-sm font-bold transition ${
                daysPerWeek === n
                  ? 'bg-accent-500 text-white'
                  : 'bg-surface text-ink-600 ring-1 ring-inset ring-ink-200 hover:bg-ink-100'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="field-label">Equipment available</label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {EQUIPMENT_OPTIONS.map((opt) => (
            <SelectCard
              key={opt.value}
              multi
              selected={equipment.includes(opt.value)}
              onClick={() => toggleEquip(opt.value)}
              title={opt.label}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="field-label">Time available</label>
        <div className="flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDurationMin(d)}
              className={`rounded-[10px] px-4 py-2 text-sm font-semibold transition ${
                durationMin === d
                  ? 'bg-accent-500 text-white'
                  : 'bg-surface text-ink-600 ring-1 ring-inset ring-ink-200 hover:bg-ink-100'
              }`}
            >
              {d} min
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="field-label">Fitness level</label>
        <Segmented
          value={fitnessLevel}
          onChange={setFitnessLevel}
          options={FITNESS_OPTIONS}
        />
      </div>

      <div>
        <label className="field-label">Injuries or limitations (optional)</label>
        <textarea
          className="field-input min-h-20"
          value={limitations}
          placeholder="e.g. bad left knee, avoid overhead pressing"
          onChange={(e) => setLimitations(e.target.value)}
        />
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
      )}

      <button className="btn-primary w-full" onClick={generate} disabled={generating}>
        {generating ? 'Generating your plan…' : 'Generate workout plan'}
      </button>
    </div>
  );
}
