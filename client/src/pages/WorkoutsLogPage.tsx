import { AppShell } from '../components/layout/AppShell';
import { WorkoutPageHeader } from '../components/layout/WorkoutPageHeader';
import { WORKOUT_SUB_LINKS } from '../components/layout/navLinks';
import { LogWorkoutPanel } from '../components/logWorkout/LogWorkoutPanel';

const pageMeta = WORKOUT_SUB_LINKS.find((l) => l.to === '/workouts/log')!;

export function WorkoutsLogPage() {
  return (
    <AppShell title={pageMeta.label}>
      <WorkoutPageHeader title={pageMeta.label} subtitle={pageMeta.subtitle} />
      <LogWorkoutPanel />
    </AppShell>
  );
}
