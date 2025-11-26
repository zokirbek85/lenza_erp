import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Popconfirm, message, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import CashboxOpeningBalanceModal from './CashboxOpeningBalanceModal';
import { getOpeningBalances, deleteOpeningBalance, type CashboxOpeningBalance } from '../api/cashboxApi';

interface CashboxManagementSectionProps {
  onUpdate?: () => void;
}

const CashboxManagementSection = ({ onUpdate }: CashboxManagementSectionProps) => {
  const { t } = useTranslation(['cashbox', 'common']);
  const [balances, setBalances] = useState<CashboxOpeningBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBalance, setEditingBalance] = useState<CashboxOpeningBalance | null>(null);

  const loadBalances = async () => {
    setLoading(true);
    try {
      const data = await getOpeningBalances();
      setBalances(data);
    } catch (error) {
      message.error(t('cashbox.messages.loadError'));
      console.error('Load balances error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBalances();
  }, []);

  const handleAdd = () => {
    setEditingBalance(null);
    setModalOpen(true);
  };

  const handleEdit = (record: CashboxOpeningBalance) => {
    setEditingBalance(record);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteOpeningBalance(id);
      message.success(t('cashbox.messages.deleted'));
      loadBalances();
      onUpdate?.();
    } catch (error) {
      message.error(t('cashbox.messages.deleteError'));
      console.error('Delete error:', error);
    }
  };

  const handleModalSuccess = () => {
    loadBalances();
    onUpdate?.();
  };

  const getCashboxTypeColor = (type: string): string => {
    switch (type) {
      case 'CARD':
        return 'blue';
      case 'CASH_UZS':
        return 'green';
      case 'CASH_USD':
        return 'gold';
      default:
        return 'default';
    }
  };

  const columns: ColumnsType<CashboxOpeningBalance> = [
    {
      title: t('cashbox.cashboxType'),
      dataIndex: 'cashbox_type_display',
      key: 'cashbox_type',
      render: (text: string, record: CashboxOpeningBalance) => (
        <Tag color={getCashboxTypeColor(record.cashbox_type)}>{text}</Tag>
      ),
    },
    {
      title: t('cashbox.balance'),
      dataIndex: 'balance',
      key: 'balance',
      render: (value: number, record: CashboxOpeningBalance) => (
        <span style={{ fontWeight: 600 }}>
          {record.currency === 'USD' ? '$' : ''}
          {value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          {record.currency === 'UZS' ? ' so\'m' : ''}
        </span>
      ),
    },
    {
      title: t('cashbox.currency'),
      dataIndex: 'currency',
      key: 'currency',
      render: (value: string) => <Tag>{value}</Tag>,
    },
    {
      title: t('cashbox.openingDate'),
      dataIndex: 'date',
      key: 'date',
      render: (value: string) => dayjs(value).format('DD.MM.YYYY'),
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
    },
    {
      title: t('cashbox.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value: string) => dayjs(value).format('DD.MM.YYYY HH:mm'),
    },
    {
      title: t('common:actions.title'),
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_: any, record: CashboxOpeningBalance) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            {t('common:actions.edit')}
          </Button>
          <Popconfirm
            title={t('cashbox.confirmDelete')}
            description={t('cashbox.confirmDeleteDescription')}
            onConfirm={() => handleDelete(record.id)}
            okText={t('common:actions.yes')}
            cancelText={t('common:actions.no')}
            okButtonProps={{ danger: true }}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              {t('common:actions.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title={
          <span>
            <span style={{ fontSize: 18, fontWeight: 600 }}>
              {t('cashbox.managementTitle')}
            </span>
            <span style={{ marginLeft: 8, fontSize: 14, color: '#64748b' }}>
              {t('cashbox.managementSubtitle')}
            </span>
          </span>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            {t('cashbox.addOpeningBalance')}
          </Button>
        }
        style={{ marginBottom: 24 }}
      >
        <Table<CashboxOpeningBalance>
          rowKey="id"
          columns={columns}
          dataSource={balances}
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => t('cashbox.totalBalances', { count: total }),
          }}
          scroll={{ x: 800 }}
        />
      </Card>

      <CashboxOpeningBalanceModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingBalance(null);
        }}
        onSuccess={handleModalSuccess}
        editingBalance={editingBalance}
      />
    </>
  );
};

export default CashboxManagementSection;
