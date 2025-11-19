import { Card, theme } from 'antd';
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

import { formatCurrency } from '../utils/formatters';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

interface DebtTrendChartProps {
  data: { month: string; debt: number }[];
  loading?: boolean;
}

const DebtTrendChart = ({ data, loading }: DebtTrendChartProps) => {
  const { token } = theme.useToken();

  const chartData: ChartData<'line'> = {
    labels: data.map((item) => item.month),
    datasets: [
      {
        label: 'Umumiy qarzdorlik',
        data: data.map((item) => item.debt),
        borderColor: '#ef233c',
        fill: true,
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) {
            return 'rgba(239,35,60,0.2)';
          }
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(239,35,60,0.3)');
          gradient.addColorStop(1, 'rgba(239,35,60,0.05)');
          return gradient;
        },
        tension: 0.35,
        pointRadius: 3,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value =
              typeof context.parsed === 'object'
                ? Number(context.parsed?.y ?? 0)
                : Number(context.parsed ?? 0);
            return formatCurrency(value, 'USD');
          },
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (value) => formatCurrency(Number(value), 'USD'),
        },
      },
    },
  };

  return (
    <Card
      variant="borderless"
      title="Oylik qarzdorlik trendlari"
      loading={loading}
      style={{
        borderRadius: '16px',
        border: `1px solid ${token.colorBorder}`,
        background: token.colorBgContainer,
      }}
    >
      <div style={{ height: 340 }}>
        {data.length ? (
          <Line data={chartData} options={options} />
        ) : (
          <p style={{ color: token.colorTextTertiary, textAlign: 'center' }}>
            Maʼlumot topilmadi
          </p>
        )}
      </div>
    </Card>
  );
};

export default DebtTrendChart;
