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
      <div className="flex min-h-12 items-center justify-between gap-3 px-4 py-2 lg:min-h-14 lg:px-8">
        <div className="min-w-0">
          <div className="bg-transparent lg:hidden">
            <Logo />
          </div>
          {title && (
            <h1 className="hidden truncate text-[17px] font-semibold text-ink-900 lg:block">
              {title}
            </h1>
          )}
          {subtitle && <p className="hidden text-xs text-ink-600 lg:block">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-none items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
