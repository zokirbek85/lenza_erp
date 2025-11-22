import { useEffect, useState } from 'react';
import { Table, Tag, Typography, Spin, Alert } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import http from '../app/http';

interface StatusLog {
  id: number;
  old_status: string | null;
  new_status: string;
  by_user: string | null;
  at: string;
}

interface OrderHistoryProps {
  orderId: number;
}

const STATUS_COLORS: Record<string, string> = {
  created: 'default',
  confirmed: 'blue',
  packed: 'orange',
  shipped: 'purple',
  delivered: 'green',
  cancelled: 'red',
  returned: 'magenta',
};

export const OrderHistory = ({ orderId }: OrderHistoryProps) => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<StatusLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await http.get(`/orders/${orderId}/history/`);
        setLogs(response.data);
      } catch (err) {
        console.error('Failed to fetch order history:', err);
        setError(t('orders.history.loadError'));
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [orderId, t]);

  const columns = [
    {
      title: t('orders.history.oldStatus'),
      dataIndex: 'old_status',
      key: 'old_status',
      width: '25%',
      render: (status: string | null) => {
        if (!status) {
          return <Tag color="default">{t('orders.history.initialCreation')}</Tag>;
        }
        return (
          <Tag color={STATUS_COLORS[status] || 'default'}>
            {t(`orders.status.${status}`, { defaultValue: status })}
          </Tag>
        );
      },
    },
    {
      title: t('orders.history.newStatus'),
      dataIndex: 'new_status',
      key: 'new_status',
      width: '25%',
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status] || 'blue'}>
          {t(`orders.status.${status}`, { defaultValue: status })}
        </Tag>
      ),
    },
    {
      title: t('orders.history.changedBy'),
      dataIndex: 'by_user',
      key: 'by_user',
      width: '25%',
      render: (user: string | null) => (
        <Typography.Text>{user || t('orders.history.system')}</Typography.Text>
      ),
    },
    {
      title: t('orders.history.changedAt'),
      dataIndex: 'at',
      key: 'at',
      width: '25%',
      render: (date: string) => {
        const d = new Date(date);
        return (
          <Typography.Text>
            <ClockCircleOutlined style={{ marginRight: 8 }} />
            {d.toLocaleString()}
          </Typography.Text>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '24px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message={t('common:messages.error')}
        description={error}
        type="error"
        showIcon
        style={{ marginTop: 16 }}
      />
    );
  }

  return (
    <div style={{ marginTop: 24 }}>
      <Typography.Title level={5}>
        {t('orders.history.title')}
      </Typography.Title>
      <Table
        size="small"
        columns={columns}
        dataSource={logs}
        rowKey="id"
        pagination={false}
        locale={{
          emptyText: t('orders.history.noHistory'),
        }}
      />
    </div>
  );
};

export default OrderHistory;
