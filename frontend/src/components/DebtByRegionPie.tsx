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
import { useRef } from 'react';

import { formatCurrency } from '../utils/formatters';
import { useAutoscale } from '../hooks/useAutoscale';

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
  
  // Autoscale: widget o'lchamiga qarab chart parametrlarini moslashtirish
  const containerRef = useRef<HTMLDivElement>(null);
  const { height, fontSize } = useAutoscale(containerRef);

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
    maintainAspectRatio: false, // Autoscale: aspect ratio o'chirildi
    plugins: {
      legend: {
        display: true,
        position: 'right',
        labels: {
          usePointStyle: true,
          font: { size: Math.max(10, fontSize * 0.6) }, // Autoscale: legend font
        },
      },
      tooltip: {
        bodyFont: { size: Math.max(11, fontSize * 0.7) }, // Autoscale: tooltip font
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

  // Autoscale: chart balandligini widget balandligidan hisoblash
  const chartHeight = Math.max(200, height - 120);

  return (
    <div ref={containerRef} style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Card
        variant="borderless"
        title="Hududlar boʼyicha qarzdorlik"
        loading={loading}
        style={{
          borderRadius: '16px',
          border: `1px solid ${token.colorBorder}`,
          background: token.colorBgContainer,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
        styles={{
          header: {
            fontSize: `${fontSize}px`, // Autoscale: title font size
          },
          body: {
            flex: 1,
            overflow: 'hidden',
            padding: '16px',
          },
        }}
      >
        <div style={{ height: chartHeight, position: 'relative' }}>
          {data.length ? (
            <Doughnut data={chartData} options={options} />
          ) : (
            <p style={{ color: token.colorTextTertiary, textAlign: 'center' }}>
              Maʼlumot topilmadi
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default DebtByRegionPie;
