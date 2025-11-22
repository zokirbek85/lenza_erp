import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Space, Table, Tag } from 'antd';

import { downloadFile } from '../utils/download';
import { formatCurrency, formatDate, formatQuantity } from '../utils/formatters';
import ReturnCreateModal from './returns/ReturnCreateModal';
import { fetchReturns, type ReturnRecord } from '../api/returnsApi';

const ReturnsPage = () => {
  const { t } = useTranslation();
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const loadReturns = async () => {
    setLoading(true);
    try {
      const data = await fetchReturns();
      setReturns(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReturns();
  }, []);

  const handleExportPdf = () => downloadFile('/returns/export/pdf/', 'returns_report.pdf');
  const handleExportExcel = () => downloadFile('/returns/export/excel/', 'returns.xlsx');

  return (
    <Card
      title={t('returns.title')}
      className="rounded-2xl border border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      extra={
        <Space>
          <Button onClick={handleExportPdf}>{t('common:actions.exportPdf')}</Button>
          <Button onClick={handleExportExcel}>{t('common:actions.exportExcel')}</Button>
          <Button type="primary" onClick={() => setCreateOpen(true)}>
            {t('returns.new')}
          </Button>
        </Space>
      }
    >
      <Table<ReturnRecord>
        rowKey="id"
        columns={[
          { title: t('returns.table.dealer'), dataIndex: 'dealer_name' },
          {
            title: t('returns.table.items'),
            dataIndex: 'items',
            render: (items: ReturnRecord['items']) => (
              <div className="space-y-1">
                {items.map((item) => (
                  <div key={item.id || item.product_id} className="text-sm">
                    <span className="font-semibold">{item.product_name}</span>
                    <span className="text-slate-500"> ({item.brand_name ?? '-'} / {item.category_name ?? '-'})</span>
                    <span className="ml-2">
                      {formatQuantity(item.quantity)} -{' '}
                      <Tag color={item.status === 'healthy' ? 'green' : 'red'}>{item.status}</Tag>
                    </span>
                    {item.comment && <span className="ml-2 text-xs text-slate-500">({item.comment})</span>}
                  </div>
                ))}
              </div>
            ),
          },
          {
            title: t('returns.table.total'),
            dataIndex: 'total_sum',
            render: (value: number) => formatCurrency(value),
          },
          {
            title: t('returns.table.status'),
            dataIndex: 'status',
            render: (value: string, record) => (
              <Tag color="blue">{record.status_display || value}</Tag>
            ),
          },
          {
            title: t('returns.table.comment'),
            dataIndex: 'general_comment',
            render: (value: string | null) => value || '-',
          },
          {
            title: t('returns.table.date'),
            dataIndex: 'created_at',
            render: (value: string) => formatDate(value),
          },
        ]}
        dataSource={returns}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <ReturnCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          loadReturns();
        }}
      />
    </Card>
  );
};

export default ReturnsPage;
