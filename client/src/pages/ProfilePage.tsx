import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { NotificationSettingsPanel } from '../components/NotificationSettings';
import { SupplementTracker } from '../components/SupplementTracker';
import { MfpImportModal } from '../components/MfpImportModal';
import { Spinner } from '../components/Spinner';
import { MacroDonut, MACRO_COLORS } from '../components/MacroDonut';
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
  draftFromProfile,
  draftToInput,
  validateStep,
  type ProfileDraft,
} from '../lib/draft';
import {
  ACTIVITY_LABELS,
  DIETARY_LABELS,
  GOAL_LABELS,
  GOALS_WITH_TARGET,
} from '../lib/options';
import type { NutritionTargets, Profile, ProgressPhoto } from '../lib/types';
import { formatEnergy, formatWeight } from '../lib/units';

export function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getProfile()
      .then((p) => {
        if (!p) {
          navigate('/onboarding', { replace: true });
          return;
        }
        setProfile(p);
        setDraft(draftFromProfile(p));
      })
      .catch(() => setError('Could not load your profile.'))
      .finally(() => setLoading(false));
  }, [navigate]);

  const update = (patch: Partial<ProfileDraft>) =>
    setDraft((d) => (d ? { ...d, ...patch } : d));

  async function save() {
    if (!draft) return;
    for (const step of [1, 2, 3, 4]) {
      const errs = validateStep(step, draft);
      if (Object.keys(errs).length > 0) {
        setError(Object.values(errs)[0]);
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await api.saveProfile(draftToInput(draft));
      setProfile(updated);
      setDraft(draftFromProfile(updated));
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner label="Loading your profile…" />
      </div>
    );
  }
  if (!profile || !draft) {
    return (
      <div className="flex h-full items-center justify-center text-ink-600">
        {error ?? 'No profile found.'}
      </div>
    );
  }

  const showTarget = draft.goal != null && GOALS_WITH_TARGET.includes(draft.goal);

  const logout = async () => {
    await api.logout();
    navigate('/login', { replace: true });
  };

  return (
    <AppShell
      title="Profile"
      actions={
        <div className="flex items-center gap-3">
          <span className="hidden text-sm font-medium text-ink-600 sm:inline">
            Hi, {profile.firstName}
          </span>
          <button
            type="button"
            onClick={() => void logout()}
            className="text-sm font-semibold text-ink-600 hover:text-error lg:hidden"
          >
            Log out
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <StatsSummary profile={profile} className="lg:col-span-2" />
          <TargetsCard targets={profile.targets} profile={profile} className="lg:col-span-3" />
        </div>

        <div className="grouped-section">
          <h2 className="grouped-header">Edit your profile</h2>
          <section className="grouped-inset grouped-inset-body">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-ink-600">
                Changing any value recalculates your targets on save.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {savedAt && !saving && (
                <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-600">
                  Saved <Check size={14} aria-hidden />
                </span>
              )}
              <button className="btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Recalculating…' : 'Recalculate targets'}
              </button>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
            <EditSection title="Basic info">
              <BasicInfoFields draft={draft} update={update} />
            </EditSection>
            <EditSection title="Primary goal">
              <GoalSelect draft={draft} update={update} />
            </EditSection>
            <EditSection title="Activity level">
              <ActivitySelect draft={draft} update={update} />
            </EditSection>
            <EditSection title="Dietary preferences">
              <DietarySelect draft={draft} update={update} />
            </EditSection>
            {showTarget && (
              <EditSection title="Target weight">
                <TargetWeightFields draft={draft} update={update} />
              </EditSection>
            )}
            <EditSection title="Unit preferences">
              <UnitPreferencesFields draft={draft} update={update} />
            </EditSection>
          </div>
          </section>
        </div>

        <NotificationSettingsPanel />
        <SupplementTracker />

        <MfpImportSection />

        <ProgressPhotos />
      </div>
    </AppShell>
  );
}

function MfpImportSection() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="grouped-section">
        <h2 className="grouped-header">Import from MyFitnessPal</h2>
        <section className="grouped-inset grouped-inset-body">
          <p className="text-sm text-ink-600">
            Upload a CSV export to backfill your food log with retroactive FuelScores.
          </p>
          <button type="button" onClick={() => setOpen(true)} className="btn-ghost mt-4">
            Import CSV
          </button>
        </section>
      </div>
      <MfpImportModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function EditSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-600">
        {title}
      </h3>
      {children}
    </div>
  );
}

function StatsSummary({ profile, className = '' }: { profile: Profile; className?: string }) {
  const { units, targets } = profile;
  const diet =
    profile.dietaryPreferences.length === 0
      ? '—'
      : profile.dietaryPreferences.map((d) => DIETARY_LABELS[d]).join(', ');

  return (
    <div className={`grouped-section ${className}`}>
      <h2 className="grouped-header">Current stats</h2>
      <section className="grouped-inset grouped-inset-body">
      <dl className="space-y-0 text-sm">
        <Row label="Age" value={`${targets.age} yrs`} />
        <Row label="Weight" value={formatWeight(profile.weightKg, units.weight)} />
        <Row
          label="Height"
          value={
            units.height === 'imperial'
              ? formatHeightImperial(profile.heightCm)
              : `${Math.round(profile.heightCm)} cm`
          }
        />
        <Row label="Goal" value={GOAL_LABELS[profile.goal]} />
        <Row label="Activity" value={ACTIVITY_LABELS[profile.activityLevel]} />
        {profile.targetWeightKg != null && (
          <Row
            label="Target weight"
            value={formatWeight(profile.targetWeightKg, units.weight)}
          />
        )}
        <Row label="Diet" value={diet} />
        {profile.customDietary && <Row label="Custom" value={profile.customDietary} />}
      </dl>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line-card py-2.5 last:border-b-0">
      <dt className="text-ink-600">{label}</dt>
      <dd className="text-right font-semibold text-ink-900">{value}</dd>
    </div>
  );
}

function TargetsCard({
  targets,
  profile,
  className = '',
}: {
  targets: NutritionTargets;
  profile: Profile;
  className?: string;
}) {
  const energy = profile.units.energy;
  const { macros } = targets;
  return (
    <div className={`grouped-section ${className}`}>
      <h2 className="grouped-header">Daily target</h2>
      <section className="grouped-inset grouped-inset-body">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-ink-900">Macros</p>
        <span className="text-sm text-ink-600">
          BMR {Math.round(targets.bmr)} · TDEE {Math.round(targets.tdee)} kcal
        </span>
      </div>
      <div className="mt-6">
        <MacroDonut
          centerValue={
            energy === 'kj'
              ? Math.round(targets.calorieTarget * 4.184).toLocaleString()
              : Math.round(targets.calorieTarget).toLocaleString()
          }
          centerLabel={energy === 'kj' ? 'kJ / day' : 'kcal / day'}
          slices={[
            { label: 'Protein', grams: macros.proteinG, kcal: macros.proteinKcal, color: MACRO_COLORS.protein },
            { label: 'Carbs', grams: macros.carbsG, kcal: macros.carbsKcal, color: MACRO_COLORS.carbs },
            { label: 'Fat', grams: macros.fatG, kcal: macros.fatKcal, color: MACRO_COLORS.fat },
          ]}
        />
      </div>
      <p className="mt-4 text-sm text-ink-600">
        Target energy:{' '}
        <span className="font-semibold text-ink-900">
          {formatEnergy(targets.calorieTarget, energy)}
        </span>{' '}
        · projected{' '}
        <span className="font-semibold text-ink-900">
          {formatWeight(Math.abs(targets.projectedWeeklyChangeKg), profile.units.weight, 2)}/wk
        </span>{' '}
        {targets.projectedWeeklyChangeKg < 0
          ? 'loss'
          : targets.projectedWeeklyChangeKg > 0
            ? 'gain'
            : 'maintenance'}
      </p>
      </section>
    </div>
  );
}

function ProgressPhotos() {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.listPhotos().then(setPhotos).catch(() => undefined);
  }, []);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErr(null);
    try {
      const photo = await api.uploadPhoto(file);
      setPhotos((prev) => [photo, ...prev]);
    } catch {
      setErr('Upload failed. Please use an image under 10MB.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="section-header">Progress photos</h2>
          <p className="text-sm text-ink-600">Optional. Stored locally on your machine.</p>
        </div>
        <label className="btn-ghost cursor-pointer">
          {uploading ? 'Uploading…' : 'Upload photo'}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFile}
            disabled={uploading}
          />
        </label>
      </div>

      {err && <p className="mt-3 text-sm font-medium text-red-600">{err}</p>}

      {photos.length === 0 ? (
        <div className="mt-5 rounded-lg border-2 border-dashed border-ink-200 py-10 text-center text-sm text-ink-600">
          No photos yet — upload one to track visual progress over time.
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {photos.map((p) => (
            <figure key={p.id} className="overflow-hidden rounded-xl ring-1 ring-ink-100">
              <img
                src={p.url}
                alt={`Progress on ${new Date(p.takenAt).toLocaleDateString()}`}
                className="aspect-square w-full object-cover"
              />
              <figcaption className="bg-surface px-2 py-1 text-center text-[11px] text-ink-600">
                {new Date(p.takenAt).toLocaleDateString()}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}

function formatHeightImperial(cm: number): string {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - feet * 12);
  return `${feet}′ ${inches}″`;
}
