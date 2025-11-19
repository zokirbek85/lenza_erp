import { Card, theme } from 'antd';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

import { formatCurrency } from '../utils/formatters';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface DebtByDealerChartProps {
  data: { dealer: string; debt: number }[];
  loading?: boolean;
}

const DebtByDealerChart = ({ data, loading }: DebtByDealerChartProps) => {
  const { token } = theme.useToken();
  const chartData: ChartData<'bar'> = {
    labels: data.map((item) => item.dealer),
    datasets: [
      {
        label: 'Qarzdorlik (USD)',
        data: data.map((item) => item.debt),
        backgroundColor: '#e63946',
        borderRadius: 4,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
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
      title="Dilerlar boʼyicha qarzdorlik"
      loading={loading}
      style={{
        borderRadius: '16px',
        border: `1px solid ${token.colorBorder}`,
        background: token.colorBgContainer,
      }}
    >
      <div style={{ height: 320 }}>
        {data.length ? (
          <Bar data={chartData} options={options} />
        ) : (
          <p style={{ color: token.colorTextTertiary, textAlign: 'center' }}>
            Maʼlumot topilmadi
          </p>
        )}
      </div>
    </Card>
  );
};

export default DebtByDealerChart;
