/** Browser notification preferences (spec 7.2 — frontend only). */

export interface NotificationSettings {
  enabled: boolean;
  dailyReminderTime: string; // HH:MM 24h
  lunchNudge: boolean;
  weeklyReview: boolean;
  prAlerts: boolean;
}

const KEY = 'fueliq.notifications';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  dailyReminderTime: '08:00',
  lunchNudge: true,
  weeklyReview: true,
  prAlerts: true,
};

export function loadNotificationSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_NOTIFICATION_SETTINGS };
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }
}

export function saveNotificationSettings(s: NotificationSettings): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}

const SENT_KEY = 'fueliq.notifications.sent';

/** Keys like "daily:2026-06-03:08:00" to avoid duplicate pings per day. */
export function wasNotified(key: string): boolean {
  try {
    const map = JSON.parse(localStorage.getItem(SENT_KEY) || '{}') as Record<string, boolean>;
    return !!map[key];
  } catch {
    return false;
  }
}

export function markNotified(key: string): void {
  try {
    const map = JSON.parse(localStorage.getItem(SENT_KEY) || '{}') as Record<string, boolean>;
    map[key] = true;
    const keys = Object.keys(map);
    if (keys.length > 60) {
      for (const k of keys.slice(0, keys.length - 40)) delete map[k];
    }
    localStorage.setItem(SENT_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

export function showBrowserNotification(title: string, body: string, tag?: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, tag, icon: '/favicon.png' });
  } catch {
    /* Safari / restricted contexts */
  }
}
