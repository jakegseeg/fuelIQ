import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Moon } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { WORKOUT_SUB_LINKS } from '../components/layout/navLinks';
import { Spinner } from '../components/Spinner';
import { Modal } from '../components/Modal';
import { ExerciseCard, DayTimeEstimate } from '../components/ExerciseCard';
import { SessionOverviewSection, TimeTradeoffBanner } from '../components/WorkoutDaySections';
import { PlanGeneratorForm } from '../components/PlanGeneratorForm';
import { CustomizeScheduleModal } from '../components/CustomizeScheduleModal';
import { SwapExerciseModal } from '../components/SwapExerciseModal';
import { api } from '../lib/api';
import {
  focusStyle,
  type DayPlan,
  type PlanExercise,
  type WorkoutPlanRecord,
  type WorkoutSchedulePreferences,
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

export function WorkoutsPage() {
  const [record, setRecord] = useState<WorkoutPlanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [schedule, setSchedule] = useState<WorkoutSchedulePreferences | null>(null);
  const [profileDefaults, setProfileDefaults] = useState<{
    preferredWorkoutDuration?: number;
    equipmentAvailable?: import('../lib/workoutTypes').Equipment[];
    fitnessLevel?: import('../lib/workoutTypes').FitnessLevel;
  }>();

  useEffect(() => {
    Promise.all([api.getPlan(), api.getWorkoutSchedule(), api.getProfile()])
      .then(([p, s, profile]) => {
        setRecord(p);
        setSchedule(s ?? profile?.workoutSchedule ?? null);
        if (profile) {
          setProfileDefaults({
            preferredWorkoutDuration: profile.preferredWorkoutDuration,
            equipmentAvailable: profile.equipmentAvailable,
            fitnessLevel: profile.fitnessLevel,
          });
        }
        if (p) {
          const firstTraining = p.plan.weeklySchedule.findIndex((d: DayPlan) => d.exercises.length > 0);
          setSelectedDay(firstTraining === -1 ? 0 : firstTraining);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const onGenerated = (rec: WorkoutPlanRecord) => {
    setRecord(rec);
    setRegenerating(false);
    const firstTraining = rec.plan.weeklySchedule.findIndex((d) => d.exercises.length > 0);
    setSelectedDay(firstTraining === -1 ? 0 : firstTraining);
  };

  const pageMeta = WORKOUT_SUB_LINKS.find((l) => l.to === '/workouts')!;

  return (
    <AppShell
      title={pageMeta.label}
      subtitle={pageMeta.subtitle}
      actions={
        <Link to="/workouts/history" className="text-sm font-semibold text-accent-500 hover:underline">
          History
        </Link>
      }
    >
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner label="Loading your plan…" />
        </div>
      ) : !record ? (
        <EmptyState onGenerated={onGenerated} profileDefaults={profileDefaults} />
      ) : (
        <PlanView
          record={record}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          onRegenerate={() => setRegenerating(true)}
          onCustomize={() => setCustomizing(true)}
          onPlanUpdated={setRecord}
        />
      )}

      <CustomizeScheduleModal
        open={customizing}
        onClose={() => setCustomizing(false)}
        initial={schedule}
        onSaved={(plan, saved) => {
          if (plan) setRecord(plan);
          setSchedule(saved);
          if (plan) {
            const firstTraining = plan.plan.weeklySchedule.findIndex((d) => d.exercises.length > 0);
            setSelectedDay(firstTraining === -1 ? 0 : firstTraining);
          }
        }}
      />

      <Modal
        open={regenerating}
        onClose={() => setRegenerating(false)}
        title="Regenerate plan"
        maxWidth="max-w-lg"
      >
        <PlanGeneratorForm initial={record?.input} profileDefaults={profileDefaults} onGenerated={onGenerated} />
      </Modal>
    </AppShell>
  );
}

function EmptyState({
  onGenerated,
  profileDefaults,
}: {
  onGenerated: (r: WorkoutPlanRecord) => void;
  profileDefaults?: {
    preferredWorkoutDuration?: number;
    equipmentAvailable?: import('../lib/workoutTypes').Equipment[];
    fitnessLevel?: import('../lib/workoutTypes').FitnessLevel;
  };
}) {
  return (
    <div className="mx-auto max-w-lg">
      <div className="card">
        <h1 className="section-header">Your AI workout plan</h1>
        <p className="mt-1 text-ink-600">
          Tell us a few preferences and we’ll build a personalized weekly plan around your goal,
          calories, and equipment.
        </p>
        <ul className="mt-5 space-y-2 rounded-xl bg-surface2 p-4 text-[15px] text-ink-700">
          <li className="flex gap-2"><CheckCircle2 size={18} className="mt-0.5 flex-none text-accent-500" aria-hidden /> A clear plan for every training day.</li>
          <li className="flex gap-2"><CheckCircle2 size={18} className="mt-0.5 flex-none text-accent-500" aria-hidden /> Exercises that fit your equipment and available time.</li>
          <li className="flex gap-2"><CheckCircle2 size={18} className="mt-0.5 flex-none text-accent-500" aria-hidden /> Easy swaps when a movement doesn’t work for you.</li>
        </ul>
        <div className="mt-6">
          <PlanGeneratorForm onGenerated={onGenerated} profileDefaults={profileDefaults} />
        </div>
      </div>
    </div>
  );
}

function PlanView({
  record,
  selectedDay,
  onSelectDay,
  onRegenerate,
  onCustomize,
  onPlanUpdated,
}: {
  record: WorkoutPlanRecord;
  selectedDay: number | null;
  onSelectDay: (i: number) => void;
  onRegenerate: () => void;
  onCustomize: () => void;
  onPlanUpdated: (r: WorkoutPlanRecord) => void;
}) {
  const navigate = useNavigate();
  const { plan } = record;
  const day = selectedDay != null ? plan.weeklySchedule[selectedDay] : null;

  const [sessionSwaps, setSessionSwaps] = useState<Record<number, PlanExercise>>(() =>
    selectedDay != null ? loadSessionSwaps(record.id, selectedDay) : {},
  );
  const [swapTarget, setSwapTarget] = useState<{
    index: number;
    exercise: PlanExercise;
  } | null>(null);
  const [swapSaving, setSwapSaving] = useState(false);

  useEffect(() => {
    if (selectedDay == null) return;
    setSessionSwaps(loadSessionSwaps(record.id, selectedDay));
  }, [record.id, selectedDay]);

  const displayExercises = useMemo(() => {
    if (!day) return [];
    return applySessionSwaps(day.exercises, sessionSwaps);
  }, [day, sessionSwaps]);

  const handleSwap = async (swapped: PlanExercise, permanent: boolean) => {
    if (swapTarget == null || selectedDay == null) return;
    saveSessionSwap(record.id, selectedDay, swapTarget.index, swapped);
    setSessionSwaps((prev) => ({ ...prev, [swapTarget.index]: swapped }));
    if (permanent) {
      setSwapSaving(true);
      try {
        const updated = await api.swapPlanExercise({
          dayIndex: selectedDay,
          exerciseIndex: swapTarget.index,
          exercise: swapped,
        });
        onPlanUpdated(updated);
      } finally {
        setSwapSaving(false);
      }
    }
  };

  const handleTradeoff = async (mode: 'shorter_rest' | 'fewer_sets') => {
    if (selectedDay == null) return;
    const updated = await api.applyDayTradeoff({ dayIndex: selectedDay, mode });
    onPlanUpdated(updated);
  };

  const startWorkout = (d: DayPlan) => {
    const exercises = applySessionSwaps(d.exercises, sessionSwaps);
    const payload = {
      date: todayISO(),
      day: { ...d, exercises },
      dayIndex: selectedDay ?? 0,
      planId: record.id,
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
              {record.source === 'claude' ? 'AI generated' : 'Smart plan'}
            </span>
          </div>
          <p className="text-sm text-ink-600">
            {plan.weeklySchedule.filter((d) => d.exercises.length > 0).length} training days/week
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onCustomize} className="btn-secondary">
            Customize schedule
          </button>
          <button type="button" onClick={onRegenerate} className="btn-ghost">
            Regenerate
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
              onClick={() => onSelectDay(i)}
              className={`rounded-lg border p-3 text-left transition ${
                isSelected
                  ? 'state-accent'
                  : `border-line-card ${isRest ? 'bg-surface2' : 'bg-surface hover:border-accent-400/40'}`
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
                {d.focus}
              </span>
              {!isRest && (
                <p
                  className={`mt-2 text-[11px] ${isSelected ? 'state-accent-text-muted' : 'text-ink-600'}`}
                >
                  {d.estimatedDurationMin}m · {d.estimatedCaloriesBurned} kcal
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
                    {day.preferredTime ? ` · ${formatTime(day.preferredTime)}` : ''}
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
              {day.showTimeTradeoffBanner && selectedDay != null && (
                <div className="mt-4">
                  <TimeTradeoffBanner onApply={handleTradeoff} />
                </div>
              )}
              {day.cardioFinisher && (
                <p className="mb-3 text-sm text-accent-600">{day.cardioFinisher}</p>
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
