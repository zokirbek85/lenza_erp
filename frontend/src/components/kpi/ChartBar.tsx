import { useTranslation } from 'react-i18next';
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
  color,
  height = 280,
  legendLabel,
}: ChartBarProps<TData>) => {
  const { t } = useTranslation();

  // Get color from CSS variable if not provided
  const barColor = color || getComputedStyle(document.documentElement).getPropertyValue('--lenza-gold').trim();
  const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border-base').trim();
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
  const tooltipBg = getComputedStyle(document.documentElement).getPropertyValue('--bg-body').trim();
  const tooltipText = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim();

  if (!data.length) {
    return <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('kpi.noData')}</p>;
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.3} />
          <XAxis dataKey={xKey as string} stroke={textColor} />
          <YAxis stroke={textColor} />
          <Tooltip
            contentStyle={{
              background: tooltipBg,
              borderRadius: '0.5rem',
              border: `1px solid ${gridColor}`,
              color: tooltipText,
            }}
          />
          {legendLabel ? <Legend /> : null}
          <Bar dataKey={yKey as string} fill={barColor} name={legendLabel} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ChartBar;
