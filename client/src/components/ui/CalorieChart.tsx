import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface CalorieChartDay {
  date: string;
  calories: number;
  status: 'green' | 'yellow' | 'red' | 'empty';
}

const FILL: Record<CalorieChartDay['status'], string> = {
  green: '#30D158',
  yellow: '#FF9F0A',
  red: '#FF453A',
  empty: '#E5E5EA',
};

const TOOLTIP_STYLE = {
  background: '#FFFFFF',
  border: '1px solid #E5E5EA',
  borderRadius: 12,
  color: '#1C1C1E',
  fontSize: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
};

interface Props {
  data: CalorieChartDay[];
  target: number;
}

/** Recharts calorie-adherence bar chart, color-coded by status (spec 6.2). */
export function CalorieChart({ data, target }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8E8E93' }} stroke="#E5E5EA" />
        <YAxis tick={{ fontSize: 11, fill: '#8E8E93' }} stroke="#E5E5EA" />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#F2F2F7' }} />
        {target > 0 && (
          <ReferenceLine
            y={target}
            stroke="#8E8E93"
            strokeDasharray="6 4"
            label={{ value: 'Target', position: 'right', fontSize: 11, fill: '#8E8E93' }}
          />
        )}
        <Bar dataKey="calories" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={FILL[d.status]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
