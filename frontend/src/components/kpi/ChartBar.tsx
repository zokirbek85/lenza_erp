import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';

interface ChartBarProps<TData extends Record<string, unknown>> {
  data: TData[];
  xKey: keyof TData;
  yKey: keyof TData;
  color?: string;
  height?: number;
  legendLabel?: string;
}

const ChartBar = <TData extends Record<string, unknown>>({
  data,
  xKey,
  yKey,
  color = '#0f172a',
  height = 280,
  legendLabel,
}: ChartBarProps<TData>) => {
  if (!data.length) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Ma&apos;lumot topilmadi</p>;
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5f5" opacity={0.3} />
          <XAxis dataKey={xKey as string} stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip
            contentStyle={{
              background: '#0f172a',
              borderRadius: '0.5rem',
              border: 'none',
              color: '#f8fafc',
            }}
          />
          {legendLabel ? <Legend /> : null}
          <Bar dataKey={yKey as string} fill={color} name={legendLabel} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ChartBar;
