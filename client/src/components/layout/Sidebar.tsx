import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { Logo } from '../Logo';
import { api } from '../../lib/api';
import {
  isWorkoutRoute,
  NAV_LINKS,
  WORKOUTS_NAV,
} from './navLinks';
import { WorkoutsNavSubmenu } from './WorkoutsNav';

const NAV_ACTIVE =
  'border-l-[3px] border-accent-400 bg-surface2 pl-[9px] text-ink-900';
const NAV_INACTIVE =
  'border-l-[3px] border-transparent pl-3 text-ink-700 hover:bg-surface2 hover:text-ink-900';

/** Desktop sidebar (>= lg). Hidden on mobile/tablet where BottomNav is used. */
export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const onWorkoutRoute = isWorkoutRoute(location.pathname);
  const [workoutsExpanded, setWorkoutsExpanded] = useState(onWorkoutRoute);

  useEffect(() => {
    if (onWorkoutRoute) {
      setWorkoutsExpanded(true);
    } else {
      setWorkoutsExpanded(false);
    }
  }, [onWorkoutRoute]);

  const logout = async () => {
    await api.logout();
    navigate('/login', { replace: true });
  };

  const toggleWorkouts = () => {
    setWorkoutsExpanded((open) => !open);
  };

  const workoutsParentActive = onWorkoutRoute;

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line-sidebar bg-surface px-3 py-5 lg:flex">
      <div className="px-2">
        <Logo />
      </div>
      <nav className="mt-8 flex flex-1 flex-col gap-2">
        {NAV_LINKS.slice(0, 3).map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `flex min-h-11 items-center gap-3 rounded-lg pr-3 text-[15px] font-medium transition ${
                isActive ? NAV_ACTIVE : NAV_INACTIVE
              }`
            }
          >
            {l.Icon ? <l.Icon size={16} aria-hidden className="flex-none" /> : null}
            {l.label}
          </NavLink>
        ))}

        <div className="mb-1">
          <button
            type="button"
            onClick={toggleWorkouts}
            className={`flex min-h-11 w-full items-center gap-3 rounded-lg pr-3 text-[15px] font-medium transition ${
              workoutsParentActive ? NAV_ACTIVE : NAV_INACTIVE
            }`}
          >
            {WORKOUTS_NAV.Icon ? (
              <WORKOUTS_NAV.Icon size={16} aria-hidden className="flex-none" />
            ) : null}
            <span className="flex-1 text-left">{WORKOUTS_NAV.label}</span>
            <ChevronDown
              size={14}
              aria-hidden
              className={`flex-none transition-transform duration-150 ease-out ${
                workoutsExpanded ? 'rotate-180' : ''
              } text-ink-500`}
            />
          </button>
          <div
            className={`overflow-hidden transition-all duration-150 ease-out ${
              workoutsExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <WorkoutsNavSubmenu />
          </div>
        </div>

        {NAV_LINKS.slice(3).map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `flex min-h-11 items-center gap-3 rounded-lg pr-3 text-[15px] font-medium transition ${
                isActive ? NAV_ACTIVE : NAV_INACTIVE
              }`
            }
          >
            {l.Icon ? <l.Icon size={16} aria-hidden className="flex-none" /> : null}
            {l.label}
          </NavLink>
        ))}
      </nav>
      <button
        type="button"
        onClick={() => void logout()}
        className="mb-2 w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-ink-700 transition hover:bg-surface2 hover:text-error"
      >
        Log out
      </button>
      <p className="px-3 text-[11px] text-ink-500">iso</p>
    </aside>
  );
}
