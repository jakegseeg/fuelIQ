interface Props {
  title: string;
  subtitle: string;
}

/** In-page title + muted subtitle for Workouts sub-pages (matches sidebar nav labels). */
export function WorkoutPageHeader({ title, subtitle }: Props) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">{title}</h1>
      <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
    </div>
  );
}
