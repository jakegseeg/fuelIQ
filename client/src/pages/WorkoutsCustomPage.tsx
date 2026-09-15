import { useEffect, useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { WorkoutPageHeader } from '../components/layout/WorkoutPageHeader';
import { WORKOUT_SUB_LINKS } from '../components/layout/navLinks';
import { Spinner } from '../components/Spinner';
import { MySplitPanel } from '../components/MySplitView';
import { api } from '../lib/api';
import type { CustomSplitRecord } from '../lib/customSplitTypes';

const pageMeta = WORKOUT_SUB_LINKS.find((l) => l.to === '/workouts/custom')!;

export function WorkoutsCustomPage() {
  const [customSplit, setCustomSplit] = useState<CustomSplitRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getCustomSplit()
      .then(setCustomSplit)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title={pageMeta.label}>
      <WorkoutPageHeader title={pageMeta.label} subtitle={pageMeta.subtitle} />
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner label="Loading your split…" />
        </div>
      ) : (
        <MySplitPanel record={customSplit} onUpdated={setCustomSplit} />
      )}
    </AppShell>
  );
}
