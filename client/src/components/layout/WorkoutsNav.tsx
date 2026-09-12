import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { isWorkoutSubLinkActive, WORKOUT_SUB_LINKS } from './navLinks';

const SUB_ACTIVE =
  'border-l-[3px] border-[#1A6B38] py-1.5 pl-2 pr-3 text-sm font-medium text-ink-900';
const SUB_INACTIVE =
  'border-l-[3px] border-transparent py-1.5 pl-2 pr-3 text-sm font-normal text-ink-600 hover:bg-ink-50 hover:text-ink-900';

interface Props {
  onNavigate?: () => void;
}

export function WorkoutsNavSubmenu({ onNavigate }: Props) {
  const location = useLocation();

  return (
    <div className="mb-1 mt-1 flex flex-col gap-0.5 pl-5">
      {WORKOUT_SUB_LINKS.map((item) => {
        const active = isWorkoutSubLinkActive(location.pathname, item.to);
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/workouts'}
            onClick={onNavigate}
            className={`block rounded-r-lg transition duration-150 ease-out ${
              active ? SUB_ACTIVE : SUB_INACTIVE
            }`}
          >
            {item.label}
          </NavLink>
        );
      })}
    </div>
  );
}

interface SheetProps {
  open: boolean;
  onClose: () => void;
}

export function WorkoutsNavSheet({ open, onClose }: SheetProps) {
  const navigate = useNavigate();
  const location = useLocation();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Workouts"
        className="relative w-full max-w-lg rounded-t-3xl bg-surface px-4 pb-6 pt-4 shadow-2xl ring-1 ring-ink-200 animate-page-in"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink-900">Workouts</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-ink-600 hover:bg-ink-50"
          >
            Close
          </button>
        </div>
        <div className="flex flex-col gap-0.5">
          {WORKOUT_SUB_LINKS.map((item) => {
            const active = isWorkoutSubLinkActive(location.pathname, item.to);
            return (
              <button
                key={item.to}
                type="button"
                onClick={() => {
                  navigate(item.to);
                  onClose();
                }}
                className={`w-full rounded-r-lg px-3 text-left transition ${
                  active ? SUB_ACTIVE : SUB_INACTIVE
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
