import { Card, theme } from 'antd';
import {
  ArcElement,
  Chart as ChartJS,
  Legend,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

import { formatCurrency } from '../utils/formatters';

ChartJS.register(ArcElement, Tooltip, Legend);

interface DebtByRegionPieProps {
  data: { region: string; debt: number }[];
  loading?: boolean;
}

const COLORS = [
  '#ef476f',
  '#ffd166',
  '#06d6a0',
  '#118ab2',
  '#073b4c',
  '#8d99ae',
  '#ff9f1c',
  '#8338ec',
];

const DebtByRegionPie = ({ data, loading }: DebtByRegionPieProps) => {
  const { token } = theme.useToken();

  const chartData: ChartData<'doughnut'> = {
    labels: data.map((item) => item.region),
    datasets: [
      {
        label: 'Qarzdorlik',
        data: data.map((item) => item.debt),
        backgroundColor: data.map(
          (_, index) => COLORS[index % COLORS.length]
        ),
        borderWidth: 0,
      },
    ],
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'right',
        labels: {
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const parsedValue = context.parsed;
            const value =
              typeof parsedValue === 'object' && parsedValue !== null
                ? Number((parsedValue as { y?: number }).y ?? 0)
                : Number(parsedValue ?? 0);
            return `${context.label}: ${formatCurrency(value, 'USD')}`;
          },
        },
      },
    },
  };

  return (
    <Card
      variant="borderless"
      title="Hududlar boʼyicha qarzdorlik"
      loading={loading}
      style={{
        borderRadius: '16px',
        border: `1px solid ${token.colorBorder}`,
        background: token.colorBgContainer,
      }}
    >
      <div style={{ height: 320 }}>
        {data.length ? (
          <Doughnut data={chartData} options={options} />
        ) : (
          <p style={{ color: token.colorTextTertiary, textAlign: 'center' }}>
            Maʼlumot topilmadi
          </p>
        )}
      </div>
    </Card>
  );
};

export default DebtByRegionPie;
