import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AppShell } from '../components/layout/AppShell';
import { Spinner } from '../components/Spinner';
import { WeightChart } from '../components/ui/WeightChart';
import { CalorieChart } from '../components/ui/CalorieChart';
import { api } from '../lib/api';
import { kgToLbs, lbsToKg } from '../lib/units';
import type { Profile } from '../lib/types';
import type { ProgressSummary, WeightRange, WeightSeriesResponse } from '../lib/progressTypes';

const MACRO_FILL = { protein: '#1E7A40', carbs: '#D4882A', fat: '#C85A3A' };
const AXIS = '#7A5C4A';
const GRID = '#D4C4B0';
const TOOLTIP_STYLE = {
  background: '#FAF5EE',
  border: '1px solid #D4C4B0',
  borderRadius: 12,
  color: '#2C1810',
  fontSize: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
};

function shortDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
}

export function ProgressPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [weight, setWeight] = useState<WeightSeriesResponse | null>(null);
  const [range, setRange] = useState<WeightRange>('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getProfile(), api.getProgressSummary()])
      .then(([p, s]) => {
        setProfile(p);
        setSummary(s);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.getWeightSeries(range).then(setWeight);
  }, [range]);

  const unit = profile?.units.weight ?? 'lbs';
  const toDisplay = (kg: number) => (unit === 'lbs' ? kgToLbs(kg) : kg);
  const reloadWeight = async () => setWeight(await api.getWeightSeries(range));

  return (
    <AppShell title="Progress" subtitle="The trends that move you toward your goal">
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner label="Crunching your numbers…" />
        </div>
      ) : (
        <div className="space-y-6">
          <WeightSection
            weight={weight}
            range={range}
            onRange={setRange}
            unit={unit}
            toDisplay={toDisplay}
            onLogged={reloadWeight}
            defaultKg={profile?.weightKg ?? null}
          />
          {summary && <CalorieAdherenceSection summary={summary} />}
          {summary && <MacroConsistencySection summary={summary} />}
          {summary && <FuelScoreSection summary={summary} />}
          {summary && <WorkoutVolumeSection summary={summary} />}
        </div>
      )}
    </AppShell>
  );
}

// --- Weight ---------------------------------------------------------------

const RANGES: { value: WeightRange; label: string }[] = [
  { value: '7', label: '7d' },
  { value: '30', label: '30d' },
  { value: '90', label: '90d' },
  { value: 'all', label: 'All' },
];

function WeightSection({
  weight,
  range,
  onRange,
  unit,
  toDisplay,
  onLogged,
  defaultKg,
}: {
  weight: WeightSeriesResponse | null;
  range: WeightRange;
  onRange: (r: WeightRange) => void;
  unit: 'lbs' | 'kg';
  toDisplay: (kg: number) => number;
  onLogged: () => Promise<void>;
  defaultKg: number | null;
}) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const chartData = useMemo(
    () =>
      (weight?.series ?? []).map((p) => ({
        date: shortDate(p.date),
        weight: Math.round(toDisplay(p.weightKg) * 10) / 10,
        avg: Math.round(toDisplay(p.avg7) * 10) / 10,
      })),
    [weight, toDisplay],
  );

  const goalDisplay = weight?.goalWeightKg != null ? Math.round(toDisplay(weight.goalWeightKg) * 10) / 10 : null;

  const submit = async () => {
    const display = Number(input);
    if (!Number.isFinite(display) || display <= 0 || busy) return;
    setBusy(true);
    try {
      const kg = unit === 'lbs' ? lbsToKg(display) : display;
      await api.logWeight(Math.round(kg * 100) / 100);
      setInput('');
      await onLogged();
    } finally {
      setBusy(false);
    }
  };

  const delta =
    weight?.startWeightKg != null && weight?.latestWeightKg != null
      ? toDisplay(weight.latestWeightKg) - toDisplay(weight.startWeightKg)
      : null;

  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">Weight</h2>
          {delta != null && (
            <p className="text-sm text-ink-600">
              {delta >= 0 ? '+' : ''}
              {delta.toFixed(1)} {unit} over this range
            </p>
          )}
        </div>
        <div className="flex rounded-xl bg-surface2 p-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => onRange(r.value)}
              className={`rounded-[10px] px-3 py-1 text-sm font-semibold transition ${
                range === r.value ? 'bg-ink-200 text-ink-900' : 'text-ink-600'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="field-label">Log today's weigh-in ({unit})</label>
          <input
            className="field-input w-40"
            type="number"
            inputMode="decimal"
            placeholder={defaultKg != null ? toDisplay(defaultKg).toFixed(1) : unit}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={busy || !input.trim()}
          className="btn-primary"
        >
          {busy ? 'Saving…' : 'Log weight'}
        </button>
      </div>

      <div className="mt-5 h-64">
        {chartData.length === 0 ? (
          <EmptyChart message="Log a few weigh-ins to see your trend." />
        ) : (
          <WeightChart data={chartData} unit={unit} goal={goalDisplay} />
        )}
      </div>
    </section>
  );
}

// --- Calorie adherence ----------------------------------------------------

function CalorieAdherenceSection({ summary }: { summary: ProgressSummary }) {
  const data = summary.calories.map((d) => ({
    date: shortDate(d.date),
    calories: d.calories,
    status: d.status,
  }));
  const target = summary.calories[0]?.target ?? 0;

  return (
    <section className="card">
      <h2 className="font-display text-lg font-bold">Calorie adherence</h2>
      <p className="text-sm text-ink-600">
        Last 14 days vs your target. Green = within 10%, yellow = 10–20% off, red = &gt;20% off.
      </p>
      <div className="mt-4 h-64">
        {data.every((d) => d.status === 'empty') ? (
          <EmptyChart message="Log meals to track adherence." />
        ) : (
          <CalorieChart data={data} target={target} />
        )}
      </div>
    </section>
  );
}

// --- Macro consistency ----------------------------------------------------

function MacroConsistencySection({ summary }: { summary: ProgressSummary }) {
  const data = summary.macros.days.map((d) => ({
    date: shortDate(d.date),
    protein: d.protein,
    carbs: d.carbs,
    fat: d.fat,
  }));

  const avgPie = [
    { name: 'Protein', value: summary.macros.avgSplit.protein, fill: MACRO_FILL.protein },
    { name: 'Carbs', value: summary.macros.avgSplit.carbs, fill: MACRO_FILL.carbs },
    { name: 'Fat', value: summary.macros.avgSplit.fat, fill: MACRO_FILL.fat },
  ];
  const targetPie = summary.macros.targetSplit
    ? [
        { name: 'Protein', value: summary.macros.targetSplit.protein, fill: MACRO_FILL.protein },
        { name: 'Carbs', value: summary.macros.targetSplit.carbs, fill: MACRO_FILL.carbs },
        { name: 'Fat', value: summary.macros.targetSplit.fat, fill: MACRO_FILL.fat },
      ]
    : null;

  return (
    <section className="card">
      <h2 className="font-display text-lg font-bold">Macro consistency</h2>
      <p className="text-sm text-ink-600">Grams per day (last 7 days) and your average split vs target.</p>
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-60 lg:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: AXIS }} stroke={GRID} />
              <YAxis tick={{ fontSize: 11, fill: AXIS }} stroke={GRID} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#ffffff08' }} />
              <Legend />
              <Bar dataKey="protein" stackId="m" name="Protein" fill={MACRO_FILL.protein} />
              <Bar dataKey="carbs" stackId="m" name="Carbs" fill={MACRO_FILL.carbs} />
              <Bar dataKey="fat" stackId="m" name="Fat" fill={MACRO_FILL.fat} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-around">
          <MiniDonut title="Avg" data={avgPie} />
          {targetPie && <MiniDonut title="Target" data={targetPie} />}
        </div>
      </div>
    </section>
  );
}

function MiniDonut({ title, data }: { title: string; data: { name: string; value: number; fill: string }[] }) {
  return (
    <div className="flex flex-col items-center">
      <div className="h-28 w-28">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={28} outerRadius={48} paddingAngle={2} stroke="none">
              {data.map((d, i) => (
                <Cell key={i} fill={d.fill} />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <span className="text-xs font-semibold text-ink-600">{title}</span>
      <span className="text-[11px] text-ink-600">{data.map((d) => `${d.value}%`).join(' / ')}</span>
    </div>
  );
}

// --- FuelScore trend ------------------------------------------------------

function FuelScoreSection({ summary }: { summary: ProgressSummary }) {
  const data = summary.fuelScore.days.map((d) => ({ date: shortDate(d.date), avg: d.avg }));
  const imp = summary.fuelScore.improvementPct;

  return (
    <section className="card">
      <h2 className="font-display text-lg font-bold">FuelScore trend</h2>
      {imp != null && imp !== 0 ? (
        <p className={`text-sm font-semibold ${imp > 0 ? 'text-accent-300' : 'text-coral-300'}`}>
          Your food quality has {imp > 0 ? 'improved' : 'dropped'} {Math.abs(imp)}% over this period.
        </p>
      ) : (
        <p className="text-sm text-ink-600">Average food quality score per day.</p>
      )}
      <div className="mt-4 h-56">
        {data.length === 0 ? (
          <EmptyChart message="Log foods to track quality over time." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: AXIS }} stroke={GRID} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: AXIS }} stroke={GRID} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="avg" name="Avg FuelScore" stroke="#1E7A40" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

// --- Workout volume -------------------------------------------------------

function WorkoutVolumeSection({ summary }: { summary: ProgressSummary }) {
  const vol = summary.volumeByMuscle.map((v) => ({ muscle: v.muscleGroup, volume: v.volume }));
  const cardio = summary.cardioByWeek.map((c) => ({ week: shortDate(c.week), minutes: c.minutes }));

  return (
    <section className="card">
      <h2 className="font-display text-lg font-bold">Workout volume</h2>
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-semibold text-ink-600">This week's volume by muscle (kg×reps)</p>
          <div className="h-56">
            {vol.length === 0 ? (
              <EmptyChart message="Log a workout to see volume." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vol} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: AXIS }} stroke={GRID} />
                  <YAxis type="category" dataKey="muscle" tick={{ fontSize: 11, fill: AXIS }} width={80} stroke={GRID} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#ffffff08' }} />
                  <Bar dataKey="volume" fill="#1E7A40" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-ink-600">Cardio minutes per week</p>
          <div className="h-56">
            {cardio.every((c) => c.minutes === 0) ? (
              <EmptyChart message="No cardio logged yet." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cardio} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: AXIS }} stroke={GRID} />
                  <YAxis tick={{ fontSize: 11, fill: AXIS }} stroke={GRID} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#ffffff08' }} />
                  <Bar dataKey="minutes" fill="#1E7A40" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-xl bg-surface2 text-sm text-ink-600">
      {message}
    </div>
  );
}
