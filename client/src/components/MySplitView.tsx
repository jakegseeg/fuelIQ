import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon } from 'lucide-react';
import { ExerciseCard, DayTimeEstimate } from './ExerciseCard';
import { SessionOverviewSection, TimeTradeoffBanner } from './WorkoutDaySections';
import { SwapExerciseModal } from './SwapExerciseModal';
import { MySplitSetup } from './MySplitSetup';
import { api } from '../lib/api';
import {
  customSplitPlanId,
  type CustomSplitRecord,
} from '../lib/customSplitTypes';
import {
  focusStyle,
  type DayPlan,
  type PlanExercise,
} from '../lib/workoutTypes';
import { FocusIcon } from '../lib/focusIcon';
import {
  applySessionSwaps,
  loadSessionSwaps,
  saveSessionSwap,
} from '../lib/workoutSwaps';

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function todayISO(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

interface Props {
  record: CustomSplitRecord | null;
  onUpdated: (record: CustomSplitRecord) => void;
}

export function MySplitPanel({ record, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  if (!record?.split.generatedPlan || editing) {
    return (
      <MySplitSetup
        initial={record?.split.config}
        onGenerated={(next) => {
          onUpdated(next);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <MySplitView
      record={record}
      onEdit={() => setEditing(true)}
      onRegenerate={async () => {
        setRegenerating(true);
        try {
          const next = await api.regenerateCustomSplit();
          onUpdated(next);
        } finally {
          setRegenerating(false);
        }
      }}
      regenerating={regenerating}
      onUpdated={onUpdated}
    />
  );
}

function MySplitView({
  record,
  onEdit,
  onRegenerate,
  regenerating,
  onUpdated,
}: {
  record: CustomSplitRecord;
  onEdit: () => void;
  onRegenerate: () => void;
  regenerating: boolean;
  onUpdated: (record: CustomSplitRecord) => void;
}) {
  const navigate = useNavigate();
  const plan = record.split.generatedPlan!;
  const planId = customSplitPlanId(record.id);

  const [selectedDay, setSelectedDay] = useState(() => {
    const firstTraining = plan.weeklySchedule.findIndex((d) => d.exercises.length > 0);
    return firstTraining === -1 ? 0 : firstTraining;
  });

  const day = plan.weeklySchedule[selectedDay];

  const [sessionSwaps, setSessionSwaps] = useState<Record<number, PlanExercise>>(() =>
    loadSessionSwaps(planId, selectedDay),
  );
  const [swapTarget, setSwapTarget] = useState<{
    index: number;
    exercise: PlanExercise;
  } | null>(null);
  const [swapSaving, setSwapSaving] = useState(false);

  useEffect(() => {
    setSessionSwaps(loadSessionSwaps(planId, selectedDay));
  }, [planId, selectedDay, record.id]);

  const displayExercises = useMemo(() => {
    if (!day) return [];
    return applySessionSwaps(day.exercises, sessionSwaps);
  }, [day, sessionSwaps]);

  const handleSwap = async (swapped: PlanExercise, permanent: boolean) => {
    if (swapTarget == null) return;
    saveSessionSwap(planId, selectedDay, swapTarget.index, swapped);
    setSessionSwaps((prev) => ({ ...prev, [swapTarget.index]: swapped }));
    if (permanent) {
      setSwapSaving(true);
      try {
        const updated = await api.swapCustomSplitExercise({
          dayIndex: selectedDay,
          exerciseIndex: swapTarget.index,
          exercise: swapped,
        });
        onUpdated(updated);
      } finally {
        setSwapSaving(false);
      }
    }
  };

  const handleTradeoff = async (mode: 'shorter_rest' | 'fewer_sets') => {
    const updated = await api.applyCustomSplitDayTradeoff({ dayIndex: selectedDay, mode });
    onUpdated(updated);
  };

  const startWorkout = (d: DayPlan) => {
    const exercises = applySessionSwaps(d.exercises, sessionSwaps);
    const payload = {
      date: todayISO(),
      day: { ...d, exercises },
      dayIndex: selectedDay,
      planId,
    };
    sessionStorage.setItem('fueliq.activeWorkout', JSON.stringify(payload));
    navigate('/workouts/active', { state: payload });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="section-header">{plan.planName}</h2>
            <span className="rounded-full chip-mint px-2 py-0.5 text-[11px] font-semibold">
              My Split
            </span>
          </div>
          <p className="text-sm text-ink-600">
            {plan.weeklySchedule.filter((d) => d.exercises.length > 0).length} training days/week
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onEdit} className="btn-secondary">
            Edit split
          </button>
          <button type="button" onClick={onRegenerate} className="btn-secondary" disabled={regenerating}>
            {regenerating ? 'Regenerating…' : 'Regenerate exercises'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {plan.weeklySchedule.map((d, i) => {
          const style = focusStyle(d.focus);
          const isRest = d.exercises.length === 0;
          const isSelected = selectedDay === i;
          return (
            <button
              key={d.day}
              onClick={() => setSelectedDay(i)}
              className={`rounded-lg border p-3 text-left transition ${
                isSelected
                  ? 'state-accent'
                  : `border-ink-100 ${isRest ? 'bg-ink-50' : 'bg-surface hover:border-brand-200'}`
              }`}
            >
              <p
                className={`text-[11px] font-semibold uppercase tracking-wide ${
                  isSelected ? 'state-accent-text-muted' : 'text-ink-600'
                }`}
              >
                {d.day.slice(0, 3)}
              </p>
              <span
                className={`mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-bold ${
                  isSelected ? 'bg-accent-400/10 text-accent-500' : style.color
                }`}
              >
                <FocusIcon focus={d.focus} size={14} />
                {isRest ? 'Rest' : d.focus}
              </span>
              {!isRest && (
                <p
                  className={`mt-2 text-[11px] ${isSelected ? 'state-accent-text-muted' : 'text-ink-600'}`}
                >
                  {d.calculatedDurationMin ?? d.estimatedDurationMin}m · {d.estimatedCaloriesBurned} kcal
                  {d.preferredTime ? ` · ${formatTime(d.preferredTime)}` : ''}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {day && (
        <div className="card">
          {day.rotationNotice && (
            <p className="mb-3 rounded-xl bg-accent-50 px-4 py-2.5 text-sm font-medium text-accent-700">
              {day.rotationNotice}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="section-header">
                {day.day} — {day.focus}
              </h2>
              {day.exercises.length > 0 && (
                <>
                  <DayTimeEstimate
                    estimatedMinLow={day.calculatedDurationMinLow}
                    estimatedMinHigh={day.calculatedDurationMinHigh}
                    estimatedMin={day.calculatedDurationMin ?? day.estimatedDurationMin}
                    breakdown={day.timeBreakdown}
                  />
                  <div className="mt-3">
                    <SessionOverviewSection day={day} />
                  </div>
                  <p className="mt-2 text-sm text-ink-600">
                    {day.exercises.length} exercises · {day.estimatedCaloriesBurned} kcal
                  </p>
                </>
              )}
            </div>
            {day.exercises.length > 0 && (
              <button className="btn-primary" onClick={() => startWorkout(day)}>
                Start workout
              </button>
            )}
          </div>

          {day.exercises.length === 0 ? (
            <p className="mt-4 rounded-xl bg-ink-50 py-8 text-center text-sm text-ink-600">
              Rest &amp; recovery day. Light walking or mobility encouraged.{' '}
              <Moon size={14} className="inline" aria-hidden />
            </p>
          ) : (
            <>
              {day.showTimeTradeoffBanner && (
                <div className="mt-4">
                  <TimeTradeoffBanner onApply={handleTradeoff} />
                </div>
              )}
              {day.cardioFinisher && (
                <p className="mb-3 text-sm text-emerald-700">{day.cardioFinisher}</p>
              )}
              <div className="space-y-3">
                {displayExercises.map((ex, i) => (
                  <ExerciseCard
                    key={`${ex.name}-${i}`}
                    exercise={ex}
                    onSwap={() => setSwapTarget({ index: i, exercise: ex })}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <SwapExerciseModal
        open={swapTarget !== null}
        onClose={() => setSwapTarget(null)}
        exercise={swapTarget?.exercise ?? null}
        sessionExerciseNames={displayExercises.map((e) => e.name)}
        onChoose={handleSwap}
        saving={swapSaving}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="card">
          <h3 className="section-header">Nutrition notes</h3>
          <p className="mt-2 text-sm text-ink-600">{plan.nutritionNotes}</p>
        </div>
        <div className="card">
          <h3 className="section-header">Progression tips</h3>
          <p className="mt-2 text-sm text-ink-600">{plan.progressionTips}</p>
        </div>
      </div>
    </div>
  );
}
