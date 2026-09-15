import type { ProfileDraft, StepErrors } from '../lib/draft';
import { Dumbbell, Flame } from 'lucide-react';
import type { Goal } from '../lib/types';
import {
  ACTIVITY_OPTIONS,
  DIETARY_OPTIONS,
  GOAL_OPTIONS,
  SEX_OPTIONS,
} from '../lib/options';
import {
  cmToFeetInches,
  feetInchesToCm,
  kgToLbs,
  lbsToKg,
} from '../lib/units';
import { FieldError, SelectCard, Segmented, TextField } from './fields';

type Update = (patch: Partial<ProfileDraft>) => void;

interface GroupProps {
  draft: ProfileDraft;
  update: Update;
  errors?: StepErrors;
}

function HeightInput({ draft, update, errors }: GroupProps) {
  const isImperial = draft.unitHeight === 'imperial';
  const { feet, inches } = draft.heightCm
    ? cmToFeetInches(draft.heightCm)
    : { feet: 0, inches: 0 };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="field-label mb-0">Height</label>
        <Segmented
          size="sm"
          value={draft.unitHeight}
          onChange={(unitHeight) => update({ unitHeight })}
          options={[
            { value: 'imperial', label: 'ft / in' },
            { value: 'metric', label: 'cm' },
          ]}
        />
      </div>
      {isImperial ? (
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              className="field-input"
              type="number"
              min={1}
              max={8}
              placeholder="ft"
              value={draft.heightCm ? String(feet) : ''}
              onChange={(e) =>
                update({
                  heightCm: feetInchesToCm(Number(e.target.value || 0), inches),
                })
              }
            />
          </div>
          <div className="flex-1">
            <input
              className="field-input"
              type="number"
              min={0}
              max={11}
              placeholder="in"
              value={draft.heightCm ? String(inches) : ''}
              onChange={(e) =>
                update({
                  heightCm: feetInchesToCm(feet, Number(e.target.value || 0)),
                })
              }
            />
          </div>
        </div>
      ) : (
        <input
          className="field-input"
          type="number"
          min={50}
          max={300}
          placeholder="cm"
          value={draft.heightCm ? String(Math.round(draft.heightCm)) : ''}
          onChange={(e) =>
            update({ heightCm: e.target.value ? Number(e.target.value) : null })
          }
        />
      )}
      <FieldError message={errors?.heightCm} />
    </div>
  );
}

function WeightInput({
  draft,
  update,
  errors,
  label = 'Current weight',
  field = 'weightKg',
}: GroupProps & { label?: string; field?: 'weightKg' | 'targetWeightKg' }) {
  const isLbs = draft.unitWeight === 'lbs';
  const canonical = draft[field];
  const display =
    canonical == null ? '' : String(Math.round((isLbs ? kgToLbs(canonical) : canonical) * 10) / 10);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="field-label mb-0">{label}</label>
        <Segmented
          size="sm"
          value={draft.unitWeight}
          onChange={(unitWeight) => update({ unitWeight })}
          options={[
            { value: 'lbs', label: 'lbs' },
            { value: 'kg', label: 'kg' },
          ]}
        />
      </div>
      <div className="relative">
        <input
          className="field-input pr-12"
          type="number"
          min={0}
          step="0.1"
          placeholder={isLbs ? 'lbs' : 'kg'}
          value={display}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') return update({ [field]: null } as Partial<ProfileDraft>);
            const num = Number(raw);
            update({ [field]: isLbs ? lbsToKg(num) : num } as Partial<ProfileDraft>);
          }}
        />
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-600">
          {draft.unitWeight}
        </span>
      </div>
      <FieldError message={errors?.[field]} />
    </div>
  );
}

export function BasicInfoFields({ draft, update, errors }: GroupProps) {
  return (
    <div className="space-y-5">
      <TextField
        label="First name"
        value={draft.firstName}
        onChange={(firstName) => update({ firstName })}
        placeholder="Alex"
        error={errors?.firstName}
      />
      <TextField
        label="Date of birth"
        type="date"
        value={draft.dateOfBirth}
        onChange={(dateOfBirth) => update({ dateOfBirth })}
        error={errors?.dateOfBirth}
        max={new Date().toISOString().slice(0, 10)}
      />
      <div>
        <label className="field-label">Biological sex</label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {SEX_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update({ biologicalSex: opt.value })}
              className={`rounded-md border px-3 py-2.5 text-sm font-semibold transition ${
                draft.biologicalSex === opt.value
                  ? 'state-accent state-accent-text'
                  : 'border-ink-200 bg-surface text-ink-600 hover:bg-ink-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <FieldError message={errors?.biologicalSex} />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <HeightInput draft={draft} update={update} errors={errors} />
        <WeightInput draft={draft} update={update} errors={errors} />
      </div>
    </div>
  );
}

function goalLeading(goal: Goal) {
  if (goal === 'lose_fat') return <Flame size={20} aria-hidden />;
  if (goal === 'build_muscle') return <Dumbbell size={20} aria-hidden />;
  return null;
}

export function GoalSelect({ draft, update, errors }: GroupProps) {
  return (
    <div className="space-y-3">
      {GOAL_OPTIONS.map((opt) => (
        <SelectCard
          key={opt.value}
          selected={draft.goal === opt.value}
          onClick={() => update({ goal: opt.value })}
          title={opt.label}
          description={opt.description}
          leading={goalLeading(opt.value)}
        />
      ))}
      <FieldError message={errors?.goal} />
    </div>
  );
}

export function ActivitySelect({ draft, update, errors }: GroupProps) {
  return (
    <div className="space-y-3">
      {ACTIVITY_OPTIONS.map((opt) => (
        <SelectCard
          key={opt.value}
          selected={draft.activityLevel === opt.value}
          onClick={() => update({ activityLevel: opt.value })}
          title={opt.label}
          description={opt.description}
        />
      ))}
      <FieldError message={errors?.activityLevel} />
    </div>
  );
}

export function DietarySelect({ draft, update, errors }: GroupProps) {
  const toggle = (value: (typeof DIETARY_OPTIONS)[number]['value']) => {
    const has = draft.dietaryPreferences.includes(value);
    // "No restrictions" is mutually exclusive with everything else.
    if (value === 'none') {
      return update({ dietaryPreferences: has ? [] : ['none'] });
    }
    const next = has
      ? draft.dietaryPreferences.filter((p) => p !== value)
      : [...draft.dietaryPreferences.filter((p) => p !== 'none'), value];
    update({ dietaryPreferences: next });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {DIETARY_OPTIONS.map((opt) => (
          <SelectCard
            key={opt.value}
            multi
            selected={draft.dietaryPreferences.includes(opt.value)}
            onClick={() => toggle(opt.value)}
            title={opt.label}
          />
        ))}
      </div>
      <div>
        <label className="field-label">Custom restriction (optional)</label>
        <input
          className="field-input"
          value={draft.customDietary}
          placeholder="e.g. no shellfish, low FODMAP…"
          disabled={draft.dietaryPreferences.includes('none')}
          onChange={(e) => update({ customDietary: e.target.value })}
        />
      </div>
      <FieldError message={errors?.dietaryPreferences} />
    </div>
  );
}

export function TargetWeightFields({ draft, update, errors }: GroupProps) {
  return (
    <div className="space-y-5">
      <WeightInput
        draft={draft}
        update={update}
        errors={errors}
        label="Target weight"
        field="targetWeightKg"
      />
      <TextField
        label="Target date (optional)"
        type="date"
        value={draft.targetDate}
        onChange={(targetDate) => update({ targetDate })}
        min={new Date().toISOString().slice(0, 10)}
      />
    </div>
  );
}

export function UnitPreferencesFields({ draft, update }: GroupProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink-700">Weight</span>
        <Segmented
          value={draft.unitWeight}
          onChange={(unitWeight) => update({ unitWeight })}
          options={[
            { value: 'lbs', label: 'lbs' },
            { value: 'kg', label: 'kg' },
          ]}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink-700">Height</span>
        <Segmented
          value={draft.unitHeight}
          onChange={(unitHeight) => update({ unitHeight })}
          options={[
            { value: 'imperial', label: 'Imperial' },
            { value: 'metric', label: 'Metric' },
          ]}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink-700">Energy</span>
        <Segmented
          value={draft.unitEnergy}
          onChange={(unitEnergy) => update({ unitEnergy })}
          options={[
            { value: 'kcal', label: 'kcal' },
            { value: 'kj', label: 'kJ' },
          ]}
        />
      </div>
    </div>
  );
}
