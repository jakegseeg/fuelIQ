import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChartNoAxesCombined, Ellipsis, House, ListPlus, Dumbbell, MessageCircle, ShoppingCart, UserRound } from 'lucide-react';
import { isWorkoutRoute } from './navLinks';
import { WorkoutsNavSheet } from './WorkoutsNav';

const tabs = [
  { to: '/dashboard', label: 'Today', Icon: House },
  { to: '/log', label: 'Log', Icon: ListPlus },
  { to: '/workouts', label: 'Workouts', Icon: Dumbbell },
  { to: '/progress', label: 'Progress', Icon: ChartNoAxesCombined },
] as const;

/** Five stable top-level destinations, with secondary areas collected in More. */
export function BottomNav() {
  const location = useLocation();
  const [workoutsOpen, setWorkoutsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = ['/grocery', '/coach', '/profile'].some((route) => location.pathname.startsWith(route));
  return (
    <>
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-ink-200 glass pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 lg:hidden">
        {tabs.map(({ to, label, Icon }) => {
          const active = to === '/workouts' ? isWorkoutRoute(location.pathname) : location.pathname === to;
          const className = `flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition ${active ? 'text-accent-500' : 'text-ink-600'}`;
          return to === '/workouts' ? (
            <button key={to} type="button" onClick={() => setWorkoutsOpen(true)} className={className} aria-current={active ? 'page' : undefined}>
              <Icon size={22} strokeWidth={active ? 2.5 : 2} aria-hidden /><span>{label}</span>
            </button>
          ) : (
            <NavLink key={to} to={to} className={className} aria-current={active ? 'page' : undefined}>
              <Icon size={22} strokeWidth={active ? 2.5 : 2} aria-hidden /><span>{label}</span>
            </NavLink>
          );
        })}
        <button type="button" onClick={() => setMoreOpen(true)} className={`flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition ${moreActive ? 'text-accent-500' : 'text-ink-600'}`} aria-current={moreActive ? 'page' : undefined}>
          <Ellipsis size={22} strokeWidth={moreActive ? 2.5 : 2} aria-hidden /><span>More</span>
        </button>
      </nav>
      <WorkoutsNavSheet open={workoutsOpen} onClose={() => setWorkoutsOpen(false)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}

function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  if (!open) return null;
  const destinations = [{ to: '/grocery', label: 'Grocery Plan', Icon: ShoppingCart }, { to: '/coach', label: 'Coach', Icon: MessageCircle }, { to: '/profile', label: 'Profile', Icon: UserRound }];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:hidden" role="presentation">
      <button type="button" className="absolute inset-0 cursor-default bg-black/25" onClick={onClose} aria-label="Dismiss menu" />
      <section role="dialog" aria-modal="true" aria-label="More" className="relative w-full rounded-t-xl bg-surface px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 shadow-high animate-page-in">
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-ink-300" /><h2 className="px-1 pb-2 section-header">More</h2>
        <div className="overflow-hidden rounded-xl bg-surface2">
          {destinations.map(({ to, label, Icon }, index) => <button key={to} type="button" onClick={() => { navigate(to); onClose(); }} className={`flex min-h-12 w-full items-center gap-3 px-4 text-left text-[17px] text-ink-900 ${index ? 'border-t border-ink-200' : ''}`}><Icon size={20} className="text-accent-500" aria-hidden />{label}</button>)}
        </div>
      </section>
    </div>
  );
}
