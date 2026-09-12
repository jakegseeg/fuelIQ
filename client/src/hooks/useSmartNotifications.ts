import { useEffect } from 'react';
import { api } from '../lib/api';
import {
  loadNotificationSettings,
  markNotified,
  showBrowserNotification,
  wasNotified,
} from '../lib/notificationSettings';

function todayISO(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function nowHM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function isSundayMorning(): boolean {
  const d = new Date();
  return d.getDay() === 0 && d.getHours() >= 8 && d.getHours() < 10;
}

/** Scheduled meal / check-in nudges via the Notification API (spec 7.2). */
export function useSmartNotifications(): void {
  useEffect(() => {
    const tick = async () => {
      const settings = loadNotificationSettings();
      if (!settings.enabled || Notification.permission !== 'granted') return;

      const date = todayISO();
      const hm = nowHM();

      if (settings.dailyReminderTime === hm) {
        const key = `daily:${date}:${hm}`;
        if (!wasNotified(key)) {
          try {
            const day = await api.getDay(date);
            const hasEntries = day.meals.some((m) => m.entries.length > 0);
            if (!hasEntries) {
              showBrowserNotification(
                'iso',
                'Time to log your meals — stay on track with your goals.',
                'daily-reminder',
              );
              markNotified(key);
            }
          } catch {
            /* offline */
          }
        }
      }

      if (settings.lunchNudge && hm === '14:00') {
        const key = `lunch:${date}`;
        if (!wasNotified(key)) {
          try {
            const day = await api.getDay(date);
            const lunch = day.meals.find((m) => m.meal === 'lunch');
            if (!lunch?.entries.length) {
              showBrowserNotification(
                'iso',
                "You haven't logged lunch yet — tap to add what you ate.",
                'lunch-nudge',
              );
              markNotified(key);
            }
          } catch {
            /* offline */
          }
        }
      }

      if (settings.weeklyReview && isSundayMorning()) {
        const key = `weekly:${date}`;
        if (!wasNotified(key)) {
          showBrowserNotification(
            'iso',
            'Your weekly review is ready — open the dashboard for your AI check-in.',
            'weekly-review',
          );
          markNotified(key);
        }
      }
    };

    tick();
    const id = window.setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
}

/** Fire when the user sets a new personal record during a workout (spec 7.2). */
export function notifyPersonalRecord(exercise: string, weightKg: number, unit: 'lbs' | 'kg'): void {
  const settings = loadNotificationSettings();
  if (!settings.enabled || !settings.prAlerts || Notification.permission !== 'granted') return;
  const w = unit === 'lbs' ? Math.round(weightKg * 2.205) : Math.round(weightKg * 10) / 10;
  const u = unit === 'lbs' ? 'lbs' : 'kg';
  showBrowserNotification(
    'New personal record!',
    `${exercise}: ${w} ${u} — great work.`,
    `pr-${exercise}`,
  );
}
