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
  background: '#FFFFFF',
  border: '1px solid #E5E5EA',
  borderRadius: 12,
  color: '#1C1C1E',
  fontSize: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
};

/** Recharts weight line + 7-day trend with goal marker (spec 6.2). */
export function WeightChart({ data, unit, goal }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8E8E93' }} stroke="#E5E5EA" />
        <YAxis
          domain={['dataMin - 2', 'dataMax + 2']}
          tick={{ fontSize: 11, fill: '#8E8E93' }}
          stroke="#E5E5EA"
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        {goal != null && (
          <ReferenceLine
            y={goal}
            stroke="#30D158"
            strokeDasharray="6 4"
            label={{ value: `Goal ${goal}${unit}`, position: 'insideTopRight', fontSize: 11, fill: '#30D158' }}
          />
        )}
        <Line type="monotone" dataKey="weight" name="Weight" stroke="#30D158" strokeWidth={2} dot={{ r: 2 }} />
        <Line type="monotone" dataKey="avg" name="7-day avg" stroke="#FF9F0A" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
