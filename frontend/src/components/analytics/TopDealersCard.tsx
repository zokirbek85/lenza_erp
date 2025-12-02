import { Card, theme, Spin, Empty } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useRef } from 'react';
import type { TopDealerItem } from '../../services/dashboardService';
import { formatCurrency } from '../../utils/formatters';
import { useTranslation } from 'react-i18next';
import { useAutoscale } from '../../hooks/useAutoscale';

interface TopDealersCardProps {
  data: TopDealerItem[];
  loading?: boolean;
}

const TopDealersCard = ({ data, loading = false }: TopDealersCardProps) => {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  
  // Autoscale: widget o'lchamiga qarab chart parametrlarini moslashtirish
  const containerRef = useRef<HTMLDivElement>(null);
  const { height, fontSize, barSize } = useAutoscale(containerRef);

  const chartData = data.map((item) => ({
    name: item.dealer_name.length > 20 ? item.dealer_name.substring(0, 20) + '...' : item.dealer_name,
    fullName: item.dealer_name,
    value: item.total_sum_usd,
    region: item.region_name,
    orders: item.orders_count,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
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
          <p className="font-semibold" style={{ color: token.colorText }}>
            {payload[0].payload.fullName}
          </p>
          <p style={{ color: token.colorTextSecondary }}>
            {t('Hudud')}: {payload[0].payload.region || '—'}
          </p>
          <p style={{ color: token.colorTextSecondary }}>
            {t('Buyurtmalar')}: {payload[0].payload.orders}
          </p>
          <p className="font-mono font-semibold" style={{ color: '#d4af37' }}>
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Autoscale: chart height va text sizes
  const chartHeight = Math.max(200, height - 120);
  const tickFontSize = Math.max(10, fontSize * 0.6);
  const dynamicBarSize = Math.max(20, barSize);

  return (
    <div ref={containerRef} style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Card
        className="shadow-sm transition-shadow hover:shadow-md"
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        title={
          <div className="flex items-center gap-2">
            <BarChartOutlined style={{ color: '#d4af37', fontSize: `${Math.max(14, fontSize * 0.9)}px` }} />
            <span 
              className="font-semibold" 
              style={{ 
                color: token.colorText,
                fontSize: `${fontSize}px`, // Autoscale: title
              }}
            >
              {t('Dillerlar bo\'yicha eng yirik xaridorlar')}
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
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 10, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorder} />
              <XAxis
                dataKey="name"
                angle={-35}
                textAnchor="end"
                height={80}
                tick={{ fill: token.colorTextSecondary, fontSize: tickFontSize }} // Autoscale: axis labels
              />
              <YAxis
                tick={{ fill: token.colorTextSecondary, fontSize: tickFontSize }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={dynamicBarSize}> {/* Autoscale: bar width */}
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? '#d4af37' : token.colorPrimary}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
};

export default TopDealersCard;
