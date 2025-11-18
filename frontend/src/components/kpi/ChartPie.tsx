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

const DEFAULT_COLORS = ['#0ea5e9', '#f97316', '#22c55e', '#a855f7', '#ef4444', '#14b8a6', '#6366f1'];

const ChartPie = <TData extends Record<string, unknown>>({
  data,
  valueKey,
  nameKey,
  height = 280,
  colors = DEFAULT_COLORS,
}: ChartPieProps<TData>) => {
  const { t } = useTranslation();

  if (!data.length) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{t('kpi.noData')}</p>;
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
              background: '#0f172a',
              border: 'none',
              borderRadius: '0.5rem',
              color: '#f8fafc',
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
