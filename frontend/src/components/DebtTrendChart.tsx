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
import { useTranslation } from 'react-i18next';

import { formatCurrency } from '../utils/formatters';
import { useAutoscale } from '../hooks/useAutoscale';
import { useChartColors } from '../hooks/useChartColors';
import { useTheme } from '../context/ThemeContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

interface DebtTrendChartProps {
  data: { month: string; debt: number }[];
  loading?: boolean;
}

const DebtTrendChart = ({ data, loading }: DebtTrendChartProps) => {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const colors = useChartColors();
  const { mode } = useTheme();
  
  // Autoscale: widget o'lchamiga qarab chart parametrlarini moslashtirish
  const containerRef = useRef<HTMLDivElement>(null);
  const { height, fontSize, chartPadding } = useAutoscale(containerRef);

  const chartData: ChartData<'line'> = {
    labels: data.map((item) => item.month),
    datasets: [
      {
        label: t('kpis.charts.debtTrend.label'),
        data: data.map((item) => item.debt),
        borderColor: colors.primary[0],
        fill: true,
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) {
            return mode === 'dark' ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.15)';
          }
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          if (mode === 'dark') {
            gradient.addColorStop(0, 'rgba(212,175,55,0.3)');
            gradient.addColorStop(1, 'rgba(212,175,55,0.05)');
          } else {
            gradient.addColorStop(0, 'rgba(212,175,55,0.2)');
            gradient.addColorStop(1, 'rgba(212,175,55,0.02)');
          }
          return gradient;
        },
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: colors.primary[0],
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
        backgroundColor: colors.tooltip.background,
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
          color: colors.text,
        },
        grid: {
          color: colors.grid,
        },
      },
      y: {
        ticks: {
          font: { size: Math.max(10, fontSize * 0.6) }, // Autoscale: y-axis labels
          color: colors.text,
          callback: (value) => formatCurrency(Number(value), 'USD'),
        },
        grid: {
          color: colors.grid,
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
        title={t('kpis.charts.debtTrend.title')}
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
              {t('kpis.noData')}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default DebtTrendChart;
