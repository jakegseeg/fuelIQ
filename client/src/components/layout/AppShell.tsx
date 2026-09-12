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
      <main className={`mx-auto ${maxWidth} animate-page-in px-4 pb-28 pt-4 lg:px-8 lg:pb-12 lg:pt-6`}>
        {title && <h1 className="mb-5 text-[34px] font-bold leading-tight tracking-tight text-ink-900 lg:hidden">{title}</h1>}
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
