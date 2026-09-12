import { useSmartNotifications } from '../hooks/useSmartNotifications';

/** Mounts global notification schedulers (spec 7.2). */
export function AppNotifications() {
  useSmartNotifications();
  return null;
}
