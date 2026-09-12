import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface WeightChartPoint {
  date: string;
  weight: number;
  avg: number;
}

interface Props {
  data: WeightChartPoint[];
  unit: string;
  goal?: number | null;
}

const TOOLTIP_STYLE = {
  background: '#FAF5EE',
  border: '1px solid #D4C4B0',
  borderRadius: 12,
  color: '#2C1810',
  fontSize: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
};

/** Recharts weight line + 7-day trend with goal marker (spec 6.2). */
export function WeightChart({ data, unit, goal }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#D4C4B0" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#7A5C4A' }} stroke="#D4C4B0" />
        <YAxis
          domain={['dataMin - 2', 'dataMax + 2']}
          tick={{ fontSize: 11, fill: '#7A5C4A' }}
          stroke="#D4C4B0"
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        {goal != null && (
          <ReferenceLine
            y={goal}
            stroke="#1E7A40"
            strokeDasharray="6 4"
            label={{ value: `Goal ${goal}${unit}`, position: 'insideTopRight', fontSize: 11, fill: '#1E7A40' }}
          />
        )}
        <Line type="monotone" dataKey="weight" name="Weight" stroke="#1E7A40" strokeWidth={2} dot={{ r: 2 }} />
        <Line type="monotone" dataKey="avg" name="7-day avg" stroke="#D4882A" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
