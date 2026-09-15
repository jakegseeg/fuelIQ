import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';

interface Props {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Max width of the content container; defaults to a roomy 7xl. */
  maxWidth?: string;
}

/** Responsive app frame: sidebar (lg) / bottom nav (mobile) + sticky top bar. */
export function AppShell({ title, subtitle, actions, children, maxWidth = 'max-w-7xl' }: Props) {
  return (
    <div className="min-h-screen bg-bg lg:pl-64">
      <Sidebar />
      <TopBar title={title} subtitle={subtitle} actions={actions} />
      <main className={`mx-auto ${maxWidth} animate-page-in px-6 py-6 pb-28 lg:pb-12`}>
        {title && (
          <header className="lg:hidden">
            <h1 className="page-title">{title}</h1>
            {subtitle && <p className="page-subtitle mt-1">{subtitle}</p>}
          </header>
        )}
        <div className={title ? 'mt-6 space-y-6' : 'space-y-6'}>{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
