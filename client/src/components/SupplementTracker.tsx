import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { api, type SupplementWithStreak } from '../lib/api';

function todayISO(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function SupplementTracker() {
  const [date] = useState(todayISO);
  const [items, setItems] = useState<SupplementWithStreak[]>([]);
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = () => api.listSupplements(date).then(setItems);

  useEffect(() => {
    reload();
  }, [date]);

  const add = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await api.addSupplement(name.trim(), dose.trim() || undefined, notes.trim() || undefined);
      setName('');
      setDose('');
      setNotes('');
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (id: number, logged: boolean) => {
    setBusy(true);
    try {
      setItems(await api.toggleSupplementLog(id, date, !logged));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Remove this supplement?')) return;
    await api.deleteSupplement(id);
    await reload();
  };

  return (
    <section className="card">
      <h2 className="section-header">Supplements</h2>
      <p className="mt-1 text-sm text-ink-600">Track daily vitamins, creatine, protein powder, and more (spec 7.5).</p>

      <div className="mt-4 space-y-2">
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-600">No supplements yet — add one below.</p>
        ) : (
          items.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-xl bg-surface2 p-3 ring-1 ring-ink-200"
            >
              <button
                type="button"
                disabled={busy}
                onClick={() => toggle(s.id, s.loggedToday)}
                className={`flex h-9 w-9 flex-none items-center justify-center rounded-md text-lg transition ${
                  s.loggedToday
                    ? 'bg-accent-500 text-white'
                    : 'bg-ink-200 text-ink-600 hover:bg-accent-400/10'
                }`}
                aria-label={s.loggedToday ? 'Mark not taken' : 'Mark taken'}
              >
                {s.loggedToday ? <Check size={14} aria-hidden /> : null}
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink-900">{s.name}</p>
                <p className="text-xs text-ink-600">
                  {s.dose ? `${s.dose} · ` : ''}
                  {s.streak > 0 ? `${s.streak}-day streak` : 'No streak yet'}
                  {s.notes ? ` · ${s.notes}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(s.id)}
                className="text-xs font-semibold text-ink-600 hover:text-coral-400"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          className="field-input sm:col-span-1"
          placeholder="Name (e.g. Vitamin D)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="field-input"
          placeholder="Dose (optional)"
          value={dose}
          onChange={(e) => setDose(e.target.value)}
        />
        <input
          className="field-input"
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <button type="button" onClick={add} disabled={busy || !name.trim()} className="btn-primary mt-3">
        Add supplement
      </button>
    </section>
  );
}
