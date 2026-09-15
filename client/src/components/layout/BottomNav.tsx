import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ChartNoAxesCombined,
  Ellipsis,
  House,
  ListPlus,
  Dumbbell,
  MessageCircle,
  ShoppingCart,
  UserRound,
} from 'lucide-react';
import { isWorkoutRoute } from './navLinks';
import { WorkoutsNavSheet } from './WorkoutsNav';

const tabs = [
  { to: '/dashboard', label: 'Today', Icon: House },
  { to: '/log', label: 'Log', Icon: ListPlus },
  { to: '/workouts', label: 'Workouts', Icon: Dumbbell },
  { to: '/progress', label: 'Progress', Icon: ChartNoAxesCombined },
] as const;

/** iOS-style tab bar — five destinations with secondary areas in More. */
export function BottomNav() {
  const location = useLocation();
  const [workoutsOpen, setWorkoutsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = ['/grocery', '/coach', '/profile'].some((route) =>
    location.pathname.startsWith(route),
  );

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line-card glass pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-0.5 lg:hidden"
      >
        <div className="grid grid-cols-5">
          {tabs.map(({ to, label, Icon }) => {
            const active =
              to === '/workouts'
                ? isWorkoutRoute(location.pathname)
                : location.pathname === to;
            const className = `flex min-h-[49px] flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition ${
              active ? 'text-accent-500' : 'text-ink-500'
            }`;
            return to === '/workouts' ? (
              <button
                key={to}
                type="button"
                onClick={() => setWorkoutsOpen(true)}
                className={className}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={24} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                <span>{label}</span>
              </button>
            ) : (
              <NavLink
                key={to}
                to={to}
                className={className}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={24} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                <span>{label}</span>
              </NavLink>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`flex min-h-[49px] flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition ${
              moreActive ? 'text-accent-500' : 'text-ink-500'
            }`}
            aria-current={moreActive ? 'page' : undefined}
          >
            <Ellipsis size={24} strokeWidth={moreActive ? 2.25 : 1.75} aria-hidden />
            <span>More</span>
          </button>
        </div>
      </nav>
      <WorkoutsNavSheet open={workoutsOpen} onClose={() => setWorkoutsOpen(false)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}

function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  if (!open) return null;
  const destinations = [
    { to: '/grocery', label: 'Grocery Plan', Icon: ShoppingCart },
    { to: '/coach', label: 'Coach', Icon: MessageCircle },
    { to: '/profile', label: 'Profile', Icon: UserRound },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:hidden" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-black/40"
        onClick={onClose}
        aria-label="Dismiss menu"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="More"
        className="relative w-full rounded-t-xl bg-surface px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 shadow-high"
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-ink-300" aria-hidden />
        <h2 className="px-1 pb-3 large-title text-[1.25rem]">More</h2>
        <div className="grouped-inset">
          {destinations.map(({ to, label, Icon }, index) => (
            <button
              key={to}
              type="button"
              onClick={() => {
                navigate(to);
                onClose();
              }}
              className={`grouped-row w-full gap-3 text-left text-[17px] text-ink-900 ${
                index ? '' : ''
              }`}
            >
              <Icon size={22} className="text-accent-500" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
