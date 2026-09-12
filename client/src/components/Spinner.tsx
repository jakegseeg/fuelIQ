export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-ink-600" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-accent-400" aria-hidden />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}
