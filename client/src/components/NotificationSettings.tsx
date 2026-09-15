import { useState } from 'react';
import {
  loadNotificationSettings,
  requestNotificationPermission,
  saveNotificationSettings,
  type NotificationSettings,
} from '../lib/notificationSettings';

export function NotificationSettingsPanel() {
  const [settings, setSettings] = useState<NotificationSettings>(() => loadNotificationSettings());
  const [status, setStatus] = useState<string | null>(null);

  const update = (patch: Partial<NotificationSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveNotificationSettings(next);
  };

  const enable = async () => {
    const perm = await requestNotificationPermission();
    if (perm !== 'granted') {
      setStatus('Notifications blocked — enable them in your browser settings.');
      update({ enabled: false });
      return;
    }
    update({ enabled: true });
    setStatus('Notifications enabled.');
  };

  return (
    <section className="card">
      <h2 className="section-header">Smart notifications</h2>
      <p className="mt-1 text-sm text-ink-600">
        Browser reminders for logging, lunch nudges, weekly reviews, and workout PRs (spec 7.2).
      </p>

      <label className="mt-4 flex items-center gap-3">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => (e.target.checked ? enable() : update({ enabled: false }))}
          className="h-4 w-4 rounded border-ink-300 text-accent-400"
        />
        <span className="text-sm font-semibold text-ink-800">Enable notifications</span>
      </label>

      {settings.enabled && (
        <div className="mt-4 space-y-3 border-t border-ink-200 pt-4">
          <div>
            <label className="field-label">Daily log reminder</label>
            <input
              type="time"
              value={settings.dailyReminderTime}
              onChange={(e) => update({ dailyReminderTime: e.target.value })}
              className="field-input w-40"
            />
          </div>
          <Toggle
            label='Lunch nudge at 2:00 PM if lunch not logged'
            checked={settings.lunchNudge}
            onChange={(v) => update({ lunchNudge: v })}
          />
          <Toggle
            label="Sunday morning weekly review reminder"
            checked={settings.weeklyReview}
            onChange={(v) => update({ weeklyReview: v })}
          />
          <Toggle
            label="Personal record alerts during workouts"
            checked={settings.prAlerts}
            onChange={(v) => update({ prAlerts: v })}
          />
        </div>
      )}

      {status && <p className="mt-3 text-sm text-ink-600">{status}</p>}
      {!settings.enabled && (
        <button type="button" onClick={enable} className="btn-ghost mt-4">
          Turn on notifications
        </button>
      )}
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-ink-300 text-accent-400"
      />
      <span className="text-sm text-ink-700">{label}</span>
    </label>
  );
}
