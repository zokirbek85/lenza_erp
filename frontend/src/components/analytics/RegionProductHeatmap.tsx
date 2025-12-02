import { Card, theme, Spin, Empty, Collapse } from 'antd';
import { HeatMapOutlined } from '@ant-design/icons';
import { useRef } from 'react';
import type { RegionProductItem } from '../../services/dashboardService';
import { formatCurrency } from '../../utils/formatters';
import { useTranslation } from 'react-i18next';
import { useAutoscale } from '../../hooks/useAutoscale';

interface RegionProductHeatmapProps {
  data: RegionProductItem[];
  loading?: boolean;
}

const RegionProductHeatmap = ({ data, loading = false }: RegionProductHeatmapProps) => {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  
  // Autoscale: widget o'lchamiga qarab matn o'lchamlarini moslashtirish
  const containerRef = useRef<HTMLDivElement>(null);
  const { fontSize } = useAutoscale(containerRef);

  // Calculate max value for color intensity
  const maxValue = Math.max(
    ...data.flatMap((region) =>
      region.products.map((product) => product.total_sum_usd)
    ),
    1
  );

  const getIntensityColor = (value: number) => {
    const intensity = value / maxValue;
    if (intensity > 0.8) return '#d4af37'; // Gold for highest
    if (intensity > 0.6) return '#f59e0b'; // Amber
    if (intensity > 0.4) return '#3b82f6'; // Blue
    if (intensity > 0.2) return '#64748b'; // Slate
    return '#94a3b8'; // Light slate
  };

  const collapseItems = data.map((region) => ({
    key: region.region_id.toString(),
    label: (
      <div className="flex items-center justify-between">
        <span className="font-semibold" style={{ color: token.colorText }}>
          📍 {region.region_name}
        </span>
        <span className="text-sm" style={{ color: token.colorTextSecondary }}>
          {region.products.length} {t('mahsulot')}
        </span>
      </div>
    ),
    children: (
      <div className="space-y-2">
        {region.products.map((product) => {
          const color = getIntensityColor(product.total_sum_usd);
          return (
            <div
              key={product.product_id}
              className="flex items-center justify-between rounded-lg p-3 transition-all hover:scale-[1.02]"
              style={{
                background: `linear-gradient(90deg, ${color}15 0%, transparent 100%)`,
                borderLeft: `4px solid ${color}`,
              }}
            >
              <div className="flex-1">
                <p
                  className="font-medium"
                  style={{ color: token.colorText }}
                >
                  {product.product_name}
                </p>
              </div>
              <div
                className="ml-4 rounded-md px-3 py-1 font-mono font-semibold"
                style={{
                  background: color,
                  color: color === '#d4af37' ? '#000' : '#fff',
                }}
              >
                {formatCurrency(product.total_sum_usd)}
              </div>
            </div>
          );
        })}
      </div>
    ),
  }));

  return (
    <div ref={containerRef} style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Card
        className="shadow-sm transition-shadow hover:shadow-md"
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        title={
          <div className="flex items-center gap-2">
            <HeatMapOutlined style={{ color: '#d4af37', fontSize: `${Math.max(14, fontSize * 0.9)}px` }} />
            <span 
              className="font-semibold" 
              style={{ 
                color: token.colorText,
                fontSize: `${fontSize}px`, // Autoscale: title
              }}
            >
              {t('Hudud → Mahsulot xaritasi')}
            </span>
          </div>
        }
        styles={{
          header: {
            borderBottom: `1px solid ${token.colorBorder}`,
          },
          body: {
            flex: 1,
            overflow: 'auto',
            fontSize: `${Math.max(11, fontSize * 0.7)}px`, // Autoscale: content text
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
          <Collapse
            items={collapseItems}
            defaultActiveKey={data.length > 0 ? [data[0].region_id.toString()] : []}
            className="analytics-collapse"
            style={{
              background: token.colorBgContainer,
              border: `1px solid ${token.colorBorder}`,
              fontSize: `${Math.max(11, fontSize * 0.7)}px`, // Autoscale: collapse text
            }}
          />
        )}
        
        <div 
          className="mt-4 flex items-center justify-between border-t pt-3" 
          style={{ 
            borderColor: token.colorBorder,
            fontSize: `${Math.max(10, fontSize * 0.6)}px`, // Autoscale: legend text
          }}
        >
          <span style={{ color: token.colorTextSecondary }}>
            {t('Rang intensivligi')}:
          </span>
          <div className="flex items-center gap-2">
            <span style={{ color: token.colorTextSecondary }}>{t('Past')}</span>
            <div className="flex h-4 w-32 rounded-full overflow-hidden">
              <div className="flex-1" style={{ background: '#94a3b8' }} />
              <div className="flex-1" style={{ background: '#64748b' }} />
              <div className="flex-1" style={{ background: '#3b82f6' }} />
              <div className="flex-1" style={{ background: '#f59e0b' }} />
              <div className="flex-1" style={{ background: '#d4af37' }} />
            </div>
            <span style={{ color: token.colorTextSecondary }}>{t('Yuqori')}</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RegionProductHeatmap;
