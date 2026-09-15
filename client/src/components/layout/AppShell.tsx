import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';

interface Props {
  title?: string;
  subtitle?: string;
  /** Overrides `title` for the mobile large title (e.g. personalized greeting). */
  mobileTitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
}

/**
 * Responsive app frame with iOS-style large titles on mobile,
 * sidebar on desktop, and bottom tab bar on phone.
 */
export function AppShell({
  title,
  subtitle,
  mobileTitle,
  actions,
  children,
  maxWidth = 'max-w-7xl',
}: Props) {
  const displayMobileTitle = mobileTitle ?? title;

  return (
    <div className="min-h-screen bg-bg lg:pl-64">
      <Sidebar />
      <TopBar title={title} subtitle={subtitle} actions={actions} />
      <main
        className={`mx-auto ${maxWidth} animate-page-in px-4 pb-28 pt-2 lg:px-6 lg:py-6 lg:pb-12`}
      >
        {displayMobileTitle && (
          <header className="lg:hidden">
            <h1 className="large-title">{displayMobileTitle}</h1>
            {subtitle && <p className="page-subtitle mt-1">{subtitle}</p>}
          </header>
        )}
        <div className={displayMobileTitle ? 'mt-4 space-y-6 lg:mt-0' : 'space-y-6'}>
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
