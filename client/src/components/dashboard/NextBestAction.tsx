import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Dumbbell, Plus, Sparkles } from 'lucide-react';
import type { DaySummary } from '../../lib/foodTypes';
import type { DayPlan } from '../../lib/workoutTypes';

interface Props {
  date: string;
  day: DaySummary;
  workout: DayPlan | null;
  className?: string;
}

function isRestDay(workout: DayPlan | null) {
  return !workout || /rest|recovery|off day/i.test(workout.focus) || workout.exercises.length === 0;
}

function bannerClass(className = '') {
  return `summary-group ${className}`;
}

/** A single, contextual next step keeps Today from becoming a competing card grid. */
export function NextBestAction({ date, day, workout, className = '' }: Props) {
  const navigate = useNavigate();
  const hasLoggedFood = day.meals.some((group) => group.entries.length > 0);
  const proteinRemaining = Math.max(0, Math.round(day.remaining?.protein ?? 0));

  if (!hasLoggedFood) {
    return (
      <section className={bannerClass(className)} aria-labelledby="next-step-title">
        <div className="flex items-center gap-4 p-4 sm:p-5">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-transparent">
            <Plus size={22} className="text-accent-500" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="section-label">Your next step</p>
            <h2 id="next-step-title" className="mt-0.5 section-header">Log your first meal</h2>
            <p className="mt-1 text-sm text-ink-600">Start today’s nutrition picture with what you’ve eaten.</p>
          </div>
          <button type="button" onClick={() => navigate('/log')} className="btn-primary flex-none" aria-label="Log your first meal">
            <span className="hidden sm:inline">Log meal</span><ChevronRight size={20} aria-hidden />
          </button>
        </div>
      </section>
    );
  }

  if (workout && !isRestDay(workout)) {
    const start = () => {
      const payload = { date, day: workout };
      sessionStorage.setItem('fueliq.activeWorkout', JSON.stringify(payload));
      navigate('/workouts/active', { state: payload });
    };
    return (
      <section className={bannerClass(className)} aria-labelledby="next-step-title">
        <div className="flex items-center gap-4 bg-transparent p-4 sm:p-5">
          <span className="flex h-11 w-11 flex-none items-center justify-center bg-transparent">
            <Dumbbell size={20} className="text-accent-500" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="section-label">Your next step</p>
            <h2 id="next-step-title" className="mt-0.5 section-header">Start {workout.focus}</h2>
            <p className="mt-1 text-sm text-ink-600">{workout.exercises.length} exercises · about {workout.estimatedDurationMin} minutes.</p>
          </div>
          <button type="button" onClick={start} className="btn-primary flex-none px-5 py-3" aria-label={`Start ${workout.focus}`}>
            <span className="hidden sm:inline">Start</span>
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={bannerClass(className)} aria-labelledby="next-step-title">
      <div className="flex items-center gap-4 p-4 sm:p-5">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-accent-100 text-accent-500"><Sparkles size={21} aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <p className="section-label">Your next step</p>
          <h2 id="next-step-title" className="mt-0.5 section-header">Keep your day in balance</h2>
          <p className="mt-1 text-sm text-ink-600">{proteinRemaining > 0 ? `${proteinRemaining}g of protein remain for today.` : 'You’re on track—add your next meal when you’re ready.'}</p>
        </div>
        <button type="button" onClick={() => navigate('/log')} className="btn-ghost flex-none" aria-label="Open food log"><span className="hidden sm:inline">View log</span><ChevronRight size={20} aria-hidden /></button>
      </div>
      <div className="flex items-center gap-2 border-t border-line-card px-4 py-2.5 text-[13px] text-ink-600"><CheckCircle2 size={16} className="text-accent-500" aria-hidden /> Recovery is part of the plan—today may be a rest day.</div>
    </section>
  );
}
