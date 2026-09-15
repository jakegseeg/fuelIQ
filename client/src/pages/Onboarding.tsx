import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IsoInsiteLogo } from '../components/IsoInsiteLogo';
import { ProgressBar } from '../components/ProgressBar';
import {
  ActivitySelect,
  BasicInfoFields,
  DietarySelect,
  GoalSelect,
  TargetWeightFields,
  UnitPreferencesFields,
} from '../components/profileFields';
import { api, ApiError } from '../lib/api';
import {
  draftToInput,
  emptyDraft,
  validateStep,
  type ProfileDraft,
  type StepErrors,
} from '../lib/draft';
import { GOALS_WITH_TARGET } from '../lib/options';
import { goalWeeklyChangeKg, weeksToTarget } from '../lib/projection';
import { formatWeight, kgToLbs } from '../lib/units';

interface StepDef {
  key: string;
  logicalStep: number; // for validateStep
  title: string;
  subtitle: string;
  label: string;
}

export function Onboarding() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
  const [index, setIndex] = useState(0);
  const [errors, setErrors] = useState<StepErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const update = (patch: Partial<ProfileDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setErrors({});
  };

  const showTarget = draft.goal != null && GOALS_WITH_TARGET.includes(draft.goal);

  const steps: StepDef[] = useMemo(() => {
    const base: StepDef[] = [
      { key: 'basic', logicalStep: 1, title: 'The basics', subtitle: 'Tell us a little about you.', label: 'Basics' },
      { key: 'goal', logicalStep: 2, title: "What's your main goal?", subtitle: 'We tune everything around this.', label: 'Goal' },
      { key: 'activity', logicalStep: 3, title: 'How active are you?', subtitle: 'Be honest — it sets your calorie burn.', label: 'Activity' },
      { key: 'dietary', logicalStep: 4, title: 'Any dietary needs?', subtitle: 'Pick all that apply.', label: 'Diet' },
    ];
    if (showTarget) {
      base.push({ key: 'target', logicalStep: 5, title: 'Set a target', subtitle: 'Optional — where are you headed?', label: 'Target' });
    }
    base.push({ key: 'units', logicalStep: 6, title: 'Unit preferences', subtitle: 'How should we show your numbers?', label: 'Units' });
    return base;
  }, [showTarget]);

  const safeIndex = Math.min(index, steps.length - 1);
  const step = steps[safeIndex];
  const isLast = safeIndex === steps.length - 1;

  const next = () => {
    const stepErrors = validateStep(step.logicalStep, draft);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    if (isLast) {
      void submit();
    } else {
      setIndex(safeIndex + 1);
    }
  };

  const back = () => {
    if (safeIndex === 0) return;
    setErrors({});
    setIndex(safeIndex - 1);
  };

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.saveProfile(draftToInput(draft));
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not save your profile.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-bg to-surface">
      <div className="mx-auto flex min-h-full max-w-xl flex-col px-4 py-8">
        <header className="mb-6 flex items-center justify-between bg-transparent">
          <IsoInsiteLogo size={36} />
          <span className="text-sm font-medium text-ink-600">Let&apos;s get set up with iso</span>
        </header>

        <ProgressBar
          current={safeIndex + 1}
          total={steps.length}
          labels={steps.map((s) => s.label)}
        />

        <div className="card mt-6 flex-1">
          <h1 className="page-title">{step.title}</h1>
          <p className="mt-1 text-ink-600">{step.subtitle}</p>

          <div className="mt-6">
            {step.key === 'basic' && (
              <BasicInfoFields draft={draft} update={update} errors={errors} />
            )}
            {step.key === 'goal' && (
              <GoalSelect draft={draft} update={update} errors={errors} />
            )}
            {step.key === 'activity' && (
              <ActivitySelect draft={draft} update={update} errors={errors} />
            )}
            {step.key === 'dietary' && (
              <DietarySelect draft={draft} update={update} errors={errors} />
            )}
            {step.key === 'target' && (
              <>
                <TargetWeightFields draft={draft} update={update} errors={errors} />
                <TargetProjection draft={draft} />
              </>
            )}
            {step.key === 'units' && (
              <UnitPreferencesFields draft={draft} update={update} />
            )}
          </div>

          {submitError && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {submitError}
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            className="btn-ghost"
            onClick={back}
            disabled={safeIndex === 0 || submitting}
          >
            Back
          </button>
          <button
            type="button"
            className="btn-primary min-w-32"
            onClick={next}
            disabled={submitting}
          >
            {submitting ? 'Saving…' : isLast ? 'Finish & calculate' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TargetProjection({ draft }: { draft: ProfileDraft }) {
  if (!draft.goal) return null;
  const weeklyKg = goalWeeklyChangeKg(draft.goal);
  if (weeklyKg === 0) return null;

  const direction = weeklyKg < 0 ? 'loss' : 'gain';
  const weeklyDisplay = formatWeight(Math.abs(weeklyKg), draft.unitWeight, 2);

  const eta =
    draft.weightKg != null && draft.targetWeightKg != null
      ? weeksToTarget(draft.goal, draft.weightKg, draft.targetWeightKg)
      : null;

  return (
    <div className="panel-mint mt-6">
      <p className="text-sm font-semibold state-accent-text">Projected pace</p>
      <p className="mt-1 text-sm state-accent-text-muted">
        At this goal you’re on track for about{' '}
        <span className="font-semibold state-accent-text">{weeklyDisplay}</span> of {direction}{' '}
        per week.
      </p>
      {eta != null && draft.targetWeightKg != null && (
        <p className="mt-2 text-sm state-accent-text-muted">
          Reaching{' '}
          <span className="font-semibold state-accent-text">
            {draft.unitWeight === 'lbs'
              ? `${kgToLbs(draft.targetWeightKg).toFixed(1)} lbs`
              : `${draft.targetWeightKg.toFixed(1)} kg`}
          </span>{' '}
          would take roughly{' '}
          <span className="font-semibold state-accent-text">{eta} weeks</span>.
        </p>
      )}
    </div>
  );
}
