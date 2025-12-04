import { useTranslation } from 'react-i18next';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from 'recharts';

import { formatCurrency } from '../../utils/formatters';

interface ChartPieProps<TData extends Record<string, unknown>> {
  data: TData[];
  valueKey: keyof TData;
  nameKey: keyof TData;
  height?: number;
  colors?: string[];
}

// Modern corporate color palette for charts
const DEFAULT_COLORS = [
  '#C9A86C', // Lenza Gold
  '#16A34A', // Success Green
  '#3B82F6', // Primary Blue
  '#F59E0B', // Warning Orange
  '#DC2626', // Error Red
  '#14B8A6', // Teal
  '#8B5CF6', // Purple
];

const ChartPie = <TData extends Record<string, unknown>>({
  data,
  valueKey,
  nameKey,
  height = 280,
  colors = DEFAULT_COLORS,
}: ChartPieProps<TData>) => {
  const { t } = useTranslation();

  const tooltipBg = getComputedStyle(document.documentElement).getPropertyValue('--bg-body').trim();
  const tooltipText = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim();
  const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-base').trim();

  if (!data.length) {
    return <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('kpi.noData')}</p>;
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey={valueKey as string}
            nameKey={nameKey as string}
            cx="50%"
            cy="50%"
            outerRadius="80%"
            innerRadius="40%"
            paddingAngle={4}
            labelLine={false}
            label={({ percent, name }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((_, index) => (
              <Cell key={String(index)} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: tooltipBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '0.5rem',
              color: tooltipText,
            }}
            formatter={(value: number) => [formatCurrency(value), t('common.amount')]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ChartPie;
