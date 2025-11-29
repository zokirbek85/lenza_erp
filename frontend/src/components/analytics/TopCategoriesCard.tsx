import { Card, theme, Spin, Empty } from 'antd';
import { PieChartOutlined } from '@ant-design/icons';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { CategoryItem } from '../../services/dashboardService';
import { formatCurrency } from '../../utils/formatters';
import { useTranslation } from 'react-i18next';

interface TopCategoriesCardProps {
  data: CategoryItem[];
  loading?: boolean;
}

const TopCategoriesCard = ({ data, loading = false }: TopCategoriesCardProps) => {
  const { t } = useTranslation();
  const { token } = theme.useToken();

  // Color palette: black/graphite/blue with gold accent for largest
  const COLORS = [
    '#d4af37', // Gold for #1
    '#1e293b', // Slate-800
    '#475569', // Slate-600
    '#3b82f6', // Blue-500
    '#64748b', // Slate-500
    '#94a3b8', // Slate-400
  ];

  const chartData = data.map((item) => ({
    name: item.category_name,
    value: item.total_sum_usd,
    percentage: item.percentage,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="rounded-lg border p-3 shadow-lg"
          style={{
            background: token.colorBgElevated,
            borderColor: token.colorBorder,
          }}
        >
          <p className="font-semibold" style={{ color: token.colorText }}>
            {payload[0].name}
          </p>
          <p style={{ color: token.colorTextSecondary }}>
            {t('Summa')}: <span className="font-mono">{formatCurrency(payload[0].value)}</span>
          </p>
          <p style={{ color: token.colorTextSecondary }}>
            {payload[0].payload.percentage.toFixed(2)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card
      className="shadow-sm transition-shadow hover:shadow-md"
      title={
        <div className="flex items-center gap-2">
          <PieChartOutlined style={{ color: '#d4af37', fontSize: '18px' }} />
          <span className="font-semibold" style={{ color: token.colorText }}>
            {t('Eng rentabelli kategoriyalar')}
          </span>
        </div>
      }
      styles={{
        header: {
          borderBottom: `1px solid ${token.colorBorder}`,
        },
      }}
    >
      {loading ? (
        <div className="flex justify-center py-12">
          <Spin size="large" />
        </div>
      ) : data.length === 0 ? (
        <Empty
          description={t('Ma\'lumot topilmadi')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ percentage }) => `${percentage.toFixed(1)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span style={{ color: token.colorText }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default TopCategoriesCard;
