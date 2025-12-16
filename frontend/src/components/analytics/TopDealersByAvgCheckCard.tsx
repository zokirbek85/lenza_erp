import { Card, Table, theme, Spin, Empty } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import { useRef } from 'react';
import type { TopDealerByAvgCheckItem } from '../../services/dashboardService';
import { formatCurrency } from '../../utils/formatters';
import { useTranslation } from 'react-i18next';
import type { ColumnsType } from 'antd/es/table';

interface TopDealersByAvgCheckCardProps {
  data: TopDealerByAvgCheckItem[];
  loading?: boolean;
}

const TopDealersByAvgCheckCard = ({ data, loading = false }: TopDealersByAvgCheckCardProps) => {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const containerRef = useRef<HTMLDivElement>(null);

  const columns: ColumnsType<TopDealerByAvgCheckItem> = [
    {
      title: '#',
      key: 'rank',
      width: 40,
      responsive: ['sm'] as any,
      render: (_: any, __: any, index: number) => (
        <span style={{
          color: token.colorTextSecondary,
          fontWeight: 500,
        }}>
          {index + 1}
        </span>
      ),
    },
    {
      title: t('Diller'),
      dataIndex: 'dealer_name',
      key: 'dealer_name',
      ellipsis: true,
      render: (name: string, record: TopDealerByAvgCheckItem, index: number) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              color: token.colorTextSecondary,
              fontWeight: 500,
              fontSize: '11px',
              minWidth: '16px',
            }} className="mobile-rank">
              {index + 1}.
            </span>
            <span style={{
              color: token.colorText,
              fontWeight: 500,
            }}>
              {name}
            </span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '11px',
            color: token.colorTextSecondary,
            paddingLeft: '22px',
          }} className="mobile-stats">
            <span>{record.orders_count} ta</span>
          </div>
        </div>
      ),
    },
    {
      title: t('Buyurtmalar'),
      dataIndex: 'orders_count',
      key: 'orders_count',
      width: 100,
      align: 'center',
      responsive: ['md'] as any,
      render: (count: number) => (
        <span style={{
          color: token.colorTextSecondary,
          fontFamily: 'monospace',
        }}>
          {count}
        </span>
      ),
    },
    {
      title: t('O\'rtacha chek'),
      dataIndex: 'average_check',
      key: 'average_check',
      width: 140,
      align: 'right',
      render: (value: number) => (
        <span style={{
          color: '#d4af37',
          fontWeight: 600,
          fontFamily: 'monospace',
        }}>
          {formatCurrency(value)}
        </span>
      ),
    },
  ];

  return (
    <div ref={containerRef} style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Card
        className="shadow-sm transition-shadow hover:shadow-md"
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        title={
          <div className="flex items-center gap-2">
            <DollarOutlined style={{ color: '#d4af37', fontSize: '16px' }} />
            <span
              className="font-semibold"
              style={{
                color: token.colorText,
                fontSize: '15px',
              }}
            >
              {t('TOP-10 dillerlar (o\'rtacha chek summasi)')}
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
            padding: 0,
          },
        }}
      >
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Spin size="large" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <Empty
              description={t('Ma\'lumot topilmadi')}
              style={{ color: token.colorTextSecondary }}
            />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={data}
            rowKey="dealer_id"
            pagination={false}
            size="small"
            scroll={{ y: 'calc(100% - 40px)' }}
            style={{
              height: '100%',
            }}
          />
        )}
      </Card>
    </div>
  );
};

export default TopDealersByAvgCheckCard;
