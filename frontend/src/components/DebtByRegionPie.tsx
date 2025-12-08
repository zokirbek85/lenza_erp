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
import { useTranslation } from 'react-i18next';

import { formatCurrency } from '../utils/formatters';
import { useAutoscale } from '../hooks/useAutoscale';
import { useChartColors, getSmartLabelConfig } from '../hooks/useChartColors';

ChartJS.register(ArcElement, Tooltip, Legend);

interface DebtByRegionPieProps {
  data: { region: string; debt: number }[];
  loading?: boolean;
}

const DebtByRegionPie = ({ data, loading }: DebtByRegionPieProps) => {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const colors = useChartColors();
  
  // Autoscale: widget o'lchamiga qarab chart parametrlarini moslashtirish
  const containerRef = useRef<HTMLDivElement>(null);
  const { height, fontSize, width } = useAutoscale(containerRef);
  
  // Smart label configuration based on widget size
  const labelConfig = getSmartLabelConfig(width, height, data.length);

  const chartData: ChartData<'doughnut'> = {
    labels: data.map((item) => item.region),
    datasets: [
      {
        label: t('kpis.charts.debtByRegion.label'),
        data: data.map((item) => item.debt),
        backgroundColor: data.map((_, index) => {
          return colors.primary[Math.min(index, colors.primary.length - 1)];
        }),
        borderWidth: 0,
      },
    ],
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false, // Autoscale: aspect ratio o'chirildi
    plugins: {
      legend: {
        display: width > 400, // Smart: hide legend on small widgets
        position: labelConfig.legendPosition,
        labels: {
          usePointStyle: true,
          font: { size: labelConfig.fontSize },
          color: colors.text,
          padding: width > 600 ? 15 : 10,
        },
      },
      tooltip: {
        backgroundColor: colors.tooltip.background,
        bodyFont: { size: Math.max(11, fontSize * 0.7) }, // Autoscale: tooltip font
        callbacks: {
          label: (context) => {
            const parsedValue = context.parsed;
            const value =
              typeof parsedValue === 'object' && parsedValue !== null
                ? Number((parsedValue as { y?: number }).y ?? 0)
                : Number(parsedValue ?? 0);
            const label = data.length > 6 && context.label && context.label.length > 20
              ? context.label.substring(0, 17) + '...'
              : context.label;
            return `${label}: ${formatCurrency(value, 'USD')}`;
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
        title={t('kpis.charts.debtByRegion.title')}
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
              {t('kpis.noData')}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default DebtByRegionPie;
