import { Card, Table, theme, Spin, Empty } from 'antd';
import { TrophyOutlined } from '@ant-design/icons';
import { useRef } from 'react';
import type { TopProductItem } from '../../services/dashboardService';
import { formatCurrency, formatQuantity } from '../../utils/formatters';
import { useTranslation } from 'react-i18next';
import { useAutoscale } from '../../hooks/useAutoscale';

interface TopProductsCardProps {
  data: TopProductItem[];
  loading?: boolean;
}

const TopProductsCard = ({ data, loading = false }: TopProductsCardProps) => {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  
  // Autoscale: widget balandligiga qarab qator sonini moslashtirish
  const containerRef = useRef<HTMLDivElement>(null);
  const { fontSize, rowCount } = useAutoscale(containerRef);

  const columns = [
    {
      title: '#',
      dataIndex: 'rank',
      key: 'rank',
      width: 40,
      responsive: ['sm'] as any,
      render: (_: any, __: any, index: number) => (
        <span
          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
          style={{
            background: index === 0 ? '#d4af37' : token.colorBgContainer,
            color: index === 0 ? '#000' : token.colorText,
            border: index === 0 ? 'none' : `1px solid ${token.colorBorder}`,
          }}
        >
          {index + 1}
        </span>
      ),
    },
    {
      title: t('Mahsulot'),
      dataIndex: 'product_name',
      key: 'product_name',
      ellipsis: true,
      render: (text: string, record: TopProductItem, index: number) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              className="inline-flex items-center justify-center rounded-full text-xs font-bold mobile-rank"
              style={{
                minWidth: '20px',
                height: '20px',
                background: index === 0 ? '#d4af37' : token.colorBgContainer,
                color: index === 0 ? '#000' : token.colorTextSecondary,
                border: index === 0 ? 'none' : `1px solid ${token.colorBorder}`,
                fontSize: '10px',
              }}
            >
              {index + 1}
            </span>
            <span className="font-medium" style={{ color: token.colorText }}>
              {text}
            </span>
          </div>
          <div
            className="mobile-product-meta"
            style={{
              display: 'flex',
              gap: '8px',
              fontSize: '10px',
              color: token.colorTextSecondary,
              paddingLeft: '26px',
            }}
          >
            {record.brand_name && <span>{record.brand_name}</span>}
            {record.brand_name && record.category_name && <span>•</span>}
            {record.category_name && <span>{record.category_name}</span>}
          </div>
        </div>
      ),
    },
    {
      title: t('Brend'),
      dataIndex: 'brand_name',
      key: 'brand_name',
      width: 120,
      responsive: ['md'] as any,
      render: (text: string) => (
        <span style={{ color: token.colorTextSecondary }}>{text || '—'}</span>
      ),
    },
    {
      title: t('Kategoriya'),
      dataIndex: 'category_name',
      key: 'category_name',
      width: 120,
      responsive: ['lg'] as any,
      render: (text: string) => (
        <span style={{ color: token.colorTextSecondary }}>{text || '—'}</span>
      ),
    },
    {
      title: t('Miqdor'),
      dataIndex: 'total_qty',
      key: 'total_qty',
      width: 80,
      align: 'right' as const,
      responsive: ['md'] as any,
      render: (value: number) => (
        <span className="font-mono" style={{ color: token.colorText }}>
          {formatQuantity(value)}
        </span>
      ),
    },
    {
      title: t('Summa'),
      dataIndex: 'total_sum_usd',
      key: 'total_sum_usd',
      width: 120,
      align: 'right' as const,
      render: (value: number, record: TopProductItem, index: number) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
          <span
            className="font-mono font-semibold"
            style={{
              color: index === 0 ? '#d4af37' : token.colorText,
              fontSize: '13px',
            }}
          >
            {formatCurrency(value)}
          </span>
          <span
            className="mobile-qty"
            style={{
              fontSize: '10px',
              color: token.colorTextSecondary,
              fontFamily: 'monospace',
            }}
          >
            {formatQuantity(record.total_qty)}
          </span>
        </div>
      ),
    },
  ];

  // Autoscale: ma'lumotlarni widget balandligiga qarab cheklash
  const visibleData = data.slice(0, Math.max(3, rowCount));

  return (
    <div ref={containerRef} style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Card
        className="shadow-sm transition-shadow hover:shadow-md"
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        title={
          <div className="flex items-center gap-2">
            <TrophyOutlined style={{ color: '#d4af37', fontSize: `${Math.max(14, fontSize * 0.9)}px` }} />
            <span 
              className="font-semibold" 
              style={{ 
                color: token.colorText,
                fontSize: `${fontSize}px`, // Autoscale title
              }}
            >
              {t('Eng ko\'p sotilgan mahsulotlar (TOP 10)')}
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
            padding: '16px',
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
          <Table
            dataSource={visibleData} // Autoscale: faqat ko'rinadigan qatorlar
            columns={columns}
            rowKey="product_id"
            pagination={false}
            size="small"
            className="analytics-table"
            style={{ fontSize: `${Math.max(11, fontSize * 0.7)}px` }} // Autoscale table text
            rowClassName={(_, index) =>
              index === 0
                ? 'bg-amber-50/30 dark:bg-amber-950/10 font-semibold transition-colors'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors'
            }
          />
        )}
      </Card>
    </div>
  );
};

export default TopProductsCard;
