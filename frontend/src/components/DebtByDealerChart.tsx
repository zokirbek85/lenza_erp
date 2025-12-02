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
import { useRef } from 'react';

import { formatCurrency } from '../utils/formatters';
import { useAutoscale } from '../hooks/useAutoscale';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface DebtByDealerChartProps {
  data: { dealer: string; debt: number }[];
  loading?: boolean;
}

const DebtByDealerChart = ({ data, loading }: DebtByDealerChartProps) => {
  const { token } = theme.useToken();
  
  // Autoscale: widget o'lchamiga qarab chart parametrlarini moslashtirish
  const containerRef = useRef<HTMLDivElement>(null);
  const { height, fontSize, chartPadding } = useAutoscale(containerRef);
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
    maintainAspectRatio: false, // Autoscale: aspect ratio o'chirildi
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        bodyFont: { 
          size: Math.max(11, fontSize * 0.7), // Autoscale: tooltip font
        },
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
      x: {
        ticks: {
          font: { size: Math.max(10, fontSize * 0.6) }, // Autoscale: x-axis labels
        },
      },
      y: {
        ticks: {
          font: { size: Math.max(10, fontSize * 0.6) }, // Autoscale: y-axis labels
          callback: (value) => formatCurrency(Number(value), 'USD'),
        },
      },
    },
    layout: {
      padding: chartPadding, // Autoscale: chart padding
    },
  };

  // Autoscale: chart balandligini widget balandligidan hisoblash
  const chartHeight = Math.max(200, height - 120); // 120px = card header + padding

  return (
    <div ref={containerRef} style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Card
        variant="borderless"
        title="Dilerlar boʼyicha qarzdorlik"
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
          },
        }}
      >
        <div style={{ height: chartHeight }}>
          {data.length ? (
            <Bar data={chartData} options={options} />
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

export default DebtByDealerChart;
