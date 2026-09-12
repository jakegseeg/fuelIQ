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
  green: '#1E7A40',
  yellow: '#D4882A',
  red: '#C85A3A',
  empty: '#D4C4B0',
};

const TOOLTIP_STYLE = {
  background: '#FAF5EE',
  border: '1px solid #D4C4B0',
  borderRadius: 12,
  color: '#2C1810',
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
        <CartesianGrid strokeDasharray="3 3" stroke="#D4C4B0" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#7A5C4A' }} stroke="#D4C4B0" />
        <YAxis tick={{ fontSize: 11, fill: '#7A5C4A' }} stroke="#D4C4B0" />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#F2EBE0' }} />
        {target > 0 && (
          <ReferenceLine
            y={target}
            stroke="#7A5C4A"
            strokeDasharray="6 4"
            label={{ value: 'Target', position: 'right', fontSize: 11, fill: '#7A5C4A' }}
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
