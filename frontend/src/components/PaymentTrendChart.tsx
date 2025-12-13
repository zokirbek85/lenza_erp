import { Card } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import { DollarOutlined } from '@ant-design/icons';

interface PaymentData {
  date: string;
  amount: number;
}

interface PaymentTrendChartProps {
  data: PaymentData[];
  loading?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export default function PaymentTrendChart({ data, loading }: PaymentTrendChartProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Card className="dashboard-card payment-chart-card" loading={true}>
        <div style={{ height: 150 }} />
      </Card>
    );
  }

  // If no data, show empty state
  const hasData = data && data.length > 0;
  const chartData = hasData ? data : [];

  return (
    <Card className="dashboard-card payment-chart-card" bordered={false}>
      <div className="card-header">
        <DollarOutlined className="dashboard-icon" />
        <h2 className="dashboard-card-title">{t('dashboard.paymentTrend', "To'lovlar dinamikasi (30 kun)")}</h2>
      </div>
      {!hasData ? (
        <div style={{
          height: 130,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(148, 163, 184, 0.6)',
          fontSize: 12
        }}>
          Ma'lumot mavjud emas
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={130}>
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#eab308" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#eab308" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148, 163, 184, 0.1)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'rgba(148, 163, 184, 0.7)' }}
              stroke="rgba(148, 163, 184, 0.2)"
              tickLine={false}
              angle={-45}
              textAnchor="end"
              height={50}
              tickFormatter={(value) => {
                // Format: YYYY-MM-DD -> MM/DD
                const date = new Date(value);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'rgba(148, 163, 184, 0.7)' }}
              stroke="rgba(148, 163, 184, 0.2)"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(30, 41, 59, 0.95)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '8px',
                color: '#ffffff',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              }}
              labelStyle={{ color: '#94a3b8', fontSize: '11px' }}
              itemStyle={{ color: '#eab308', fontSize: '13px', fontWeight: 600 }}
              formatter={(value: number) => formatCurrency(value)}
              cursor={{ stroke: 'rgba(234, 179, 8, 0.3)', strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#eab308"
              strokeWidth={3}
              dot={{ fill: '#eab308', r: 4, strokeWidth: 2, stroke: '#1e293b' }}
              activeDot={{ r: 6, fill: '#eab308', strokeWidth: 2, stroke: '#1e293b' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
