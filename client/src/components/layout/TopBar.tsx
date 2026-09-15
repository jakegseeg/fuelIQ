import type { ReactNode } from 'react';
import { Logo } from '../Logo';

interface Props {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

/** Sticky top bar: page title + per-page actions. Shows the logo on mobile. */
export function TopBar({ title, subtitle, actions }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-200 glass">
      <div className="flex min-h-12 items-center justify-between gap-3 px-6 py-2 lg:min-h-14">
        <div className="min-w-0">
          <div className="bg-transparent lg:hidden">
            <Logo />
          </div>
          {title && (
            <div className="hidden lg:block">
              <h1 className="page-title">{title}</h1>
              {subtitle && <p className="page-subtitle mt-1">{subtitle}</p>}
            </div>
          )}
        </div>
        {actions && <div className="flex flex-none items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
