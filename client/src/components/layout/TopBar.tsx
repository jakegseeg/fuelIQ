import type { ReactNode } from 'react';

interface Props {
  /** Shown in the compact desktop nav bar only. */
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

/** Compact sticky bar — actions on mobile; title + actions on desktop (large title lives in scroll content). */
export function TopBar({ title, subtitle, actions }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-line-card glass lg:border-ink-200">
      <div className="flex min-h-11 items-center justify-between gap-3 px-4 lg:min-h-14 lg:px-6">
        <div className="min-w-0 flex-1 lg:block">
          {title && (
            <div className="hidden lg:block">
              <h1 className="page-title">{title}</h1>
              {subtitle && <p className="page-subtitle mt-0.5">{subtitle}</p>}
            </div>
          )}
        </div>
        {actions && (
          <div className="flex flex-none items-center gap-2">{actions}</div>
        )}
      </div>
    </header>
  );
}
