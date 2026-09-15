interface Props {
  title: string;
  subtitle: string;
}

/** In-page title + muted subtitle for Workouts sub-pages (matches sidebar nav labels). */
export function WorkoutPageHeader({ title, subtitle }: Props) {
  return (
    <header>
      <h1 className="page-title">{title}</h1>
      <p className="page-subtitle mt-1">{subtitle}</p>
    </header>
  );
}
