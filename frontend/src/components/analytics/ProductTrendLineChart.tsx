import { Card, theme, Spin, Empty } from 'antd';
import { LineChartOutlined } from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useRef } from 'react';
import type { ProductTrendPeriod } from '../../services/dashboardService';
import { formatCurrency } from '../../utils/formatters';
import { useTranslation } from 'react-i18next';
import { useAutoscale } from '../../hooks/useAutoscale';
import dayjs from 'dayjs';

interface ProductTrendLineChartProps {
  data: ProductTrendPeriod[];
  loading?: boolean;
}

const ProductTrendLineChart = ({ data, loading = false }: ProductTrendLineChartProps) => {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  
  // Autoscale: widget o'lchamiga qarab chart parametrlarini moslashtirish
  const containerRef = useRef<HTMLDivElement>(null);
  const { height, fontSize, chartPadding } = useAutoscale(containerRef);

  // Extract unique products from all periods
  const allProducts = new Map<number, string>();
  data.forEach((period) => {
    period.products.forEach((product) => {
      allProducts.set(product.product_id, product.product_name);
    });
  });

  // Limit to top 5 products by total sales
  const productTotals = new Map<number, number>();
  data.forEach((period) => {
    period.products.forEach((product) => {
      const current = productTotals.get(product.product_id) || 0;
      productTotals.set(product.product_id, current + product.total_sum_usd);
    });
  });

  const topProducts = Array.from(productTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => ({ id, name: allProducts.get(id) || '' }));

  // Transform data for chart
  const chartData = data.map((period) => {
    const periodData: any = {
      period: dayjs(period.period).format('MMM YYYY'),
      fullDate: period.period,
    };

    topProducts.forEach((product) => {
      const productData = period.products.find((p) => p.product_id === product.id);
      periodData[`product_${product.id}`] = productData?.total_sum_usd || 0;
    });

    return periodData;
  });

  // Color palette for lines
  const LINE_COLORS = ['#d4af37', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="rounded-lg border p-3 shadow-lg"
          style={{
            background: token.colorBgElevated,
            borderColor: token.colorBorder,
            fontSize: `${Math.max(11, fontSize * 0.7)}px`, // Autoscale: tooltip
          }}
        >
          <p className="mb-2 font-semibold" style={{ color: token.colorText }}>
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: <span className="font-mono font-semibold">{formatCurrency(entry.value)}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Autoscale: chart height va text size
  const chartHeight = Math.max(200, height - 120);
  const tickFontSize = Math.max(10, fontSize * 0.6);
  const strokeWidth = Math.max(1, fontSize * 0.1);

  return (
    <div ref={containerRef} style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Card
        className="shadow-sm transition-shadow hover:shadow-md"
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        title={
          <div className="flex items-center gap-2">
            <LineChartOutlined style={{ color: '#d4af37', fontSize: `${Math.max(14, fontSize * 0.9)}px` }} />
            <span 
              className="font-semibold" 
              style={{ 
                color: token.colorText,
                fontSize: `${fontSize}px`, // Autoscale: title
              }}
            >
              {t('Mahsulot sotilishi tendentsiyasi (oylik)')}
            </span>
          </div>
        }
        styles={{
          header: {
            borderBottom: `1px solid ${token.colorBorder}`,
          },
          body: {
            flex: 1,
            overflow: 'hidden',
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
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={chartData} margin={{ top: chartPadding, right: chartPadding, left: chartPadding, bottom: chartPadding }}>
              <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorder} />
              <XAxis
                dataKey="period"
                tick={{ fill: token.colorTextSecondary, fontSize: tickFontSize }} // Autoscale: axis labels
              />
              <YAxis
                tick={{ fill: token.colorTextSecondary, fontSize: tickFontSize }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: `${Math.max(10, fontSize * 0.6)}px` }} // Autoscale: legend
                formatter={(value) => (
                  <span style={{ color: token.colorText }}>{value}</span>
                )}
              />
              {topProducts.map((product, index) => (
                <Line
                  key={product.id}
                  type="monotone"
                  dataKey={`product_${product.id}`}
                  name={product.name.length > 30 ? product.name.substring(0, 30) + '...' : product.name}
                  stroke={LINE_COLORS[index % LINE_COLORS.length]}
                  strokeWidth={index === 0 ? strokeWidth * 3 : strokeWidth * 2} // Autoscale: line width
                  dot={{ r: Math.max(3, fontSize * 0.2) }} // Autoscale: dot size
                  activeDot={{ r: Math.max(4, fontSize * 0.3) }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
};

export default ProductTrendLineChart;
