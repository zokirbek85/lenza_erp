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
import { useRef } from 'react';

import { formatCurrency } from '../utils/formatters';
import { useAutoscale } from '../hooks/useAutoscale';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

interface DebtTrendChartProps {
  data: { month: string; debt: number }[];
  loading?: boolean;
}

const DebtTrendChart = ({ data, loading }: DebtTrendChartProps) => {
  const { token } = theme.useToken();
  
  // Autoscale: widget o'lchamiga qarab chart parametrlarini moslashtirish
  const containerRef = useRef<HTMLDivElement>(null);
  const { height, fontSize, chartPadding } = useAutoscale(containerRef);

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
    maintainAspectRatio: false, // Autoscale: aspect ratio o'chirildi
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        bodyFont: { size: Math.max(11, fontSize * 0.7) }, // Autoscale: tooltip font
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
  const chartHeight = Math.max(200, height - 120);

  return (
    <div ref={containerRef} style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Card
        variant="borderless"
        title="Oylik qarzdorlik trendlari"
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
            <Line data={chartData} options={options} />
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

export default DebtTrendChart;
