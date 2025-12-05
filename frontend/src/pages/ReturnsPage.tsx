import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Collapse, Space, Table, Tag, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAuthStore } from '../auth/useAuthStore';
import { useIsMobile } from '../hooks/useIsMobile';
import { downloadFile } from '../utils/download';
import { formatCurrency, formatDate, formatQuantity } from '../utils/formatters';
import { fetchReturns, deleteReturn, type ReturnRecord } from '../api/returnsApi';
import ReturnsMobileCards from './_mobile/ReturnsMobileCards';
import type { ReturnsMobileHandlers } from './_mobile/ReturnsMobileCards';
import CreateReturnForm from './returns/components/CreateReturnForm';

const ReturnsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const role = useAuthStore((state) => state.role);
  const { isMobile } = useIsMobile();
  const isWarehouse = role === 'warehouse';
  const isSalesManager = role === 'sales';
  const isAdmin = role === 'admin';
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

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

  const handleEdit = (returnId: number) => {
    navigate(`/returns/${returnId}/edit`);
  };

  const handleDelete = async (returnId: number) => {
    try {
      await deleteReturn(returnId);
      toast.success(t('returns.deleteSuccess'));
      loadReturns();
    } catch (error) {
      toast.error(t('returns.deleteError'));
      console.error('Delete error:', error);
    }
  };

  const mobileHandlers: ReturnsMobileHandlers = {
    onView: (returnId: number) => {
      console.log('View return:', returnId);
    },
  };

  if (isMobile) {
    return (
      <div className="space-y-4 px-4 pb-6">
        <header className="flex items-center justify-between py-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t('returns.title')}</h1>
          </div>
          {!isSalesManager && (
            <Button type="primary" onClick={() => setShowCreateForm((prev) => !prev)}>
              {t('returns.new')}
            </Button>
          )}
        </header>

        {showCreateForm && !isSalesManager && (
          <CreateReturnForm
            onCreated={() => {
              setShowCreateForm(false);
              loadReturns();
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        )}

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            {t('common:loading')}
          </div>
        ) : (
          <ReturnsMobileCards
            data={returns}
            handlers={mobileHandlers}
            showPrice={!isWarehouse}
          />
        )}
      </div>
    );
  }

  return (
    <Card
      title={t('returns.title')}
      className="rounded-2xl border border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      extra={
        <Space>
          <Button onClick={handleExportPdf}>{t('common:actions.exportPdf')}</Button>
          <Button onClick={handleExportExcel}>{t('common:actions.exportExcel')}</Button>
          {!isSalesManager && (
            <Button type="primary" onClick={() => setShowCreateForm((prev) => !prev)}>
              {showCreateForm ? t('common:actions.cancel') : t('returns.new')}
            </Button>
          )}
        </Space>
      }
    >
      {!isSalesManager && (
        <Collapse
          className="mb-4"
          activeKey={showCreateForm ? ['create'] : []}
          onChange={(keys) => setShowCreateForm(keys.includes('create'))}
        >
          <Collapse.Panel header={t('returns.createTitle')} key="create">
            <CreateReturnForm
              onCreated={() => {
                setShowCreateForm(false);
                loadReturns();
              }}
              onCancel={() => setShowCreateForm(false)}
            />
          </Collapse.Panel>
        </Collapse>
      )}

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
          ...(!isWarehouse ? [{
            title: t('returns.table.total'),
            dataIndex: 'total_sum',
            render: (value: number) => formatCurrency(value),
          }] : []),
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
          ...(isAdmin ? [{
            title: t('common:actions.title'),
            key: 'actions',
            width: 150,
            render: (_: unknown, record: ReturnRecord) => (
              <Space size="small">
                <Button
                  type="primary"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(record.id)}
                >
                  {t('common:actions.edit')}
                </Button>
                <Popconfirm
                  title={t('returns.deleteConfirm')}
                  description={t('returns.deleteDescription')}
                  onConfirm={() => handleDelete(record.id)}
                  okText={t('common:actions.yes')}
                  cancelText={t('common:actions.no')}
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                  >
                    {t('common:actions.delete')}
                  </Button>
                </Popconfirm>
              </Space>
            ),
          }] : []),
        ]}
        dataSource={returns}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    </Card>
  );
};

export default ReturnsPage;
