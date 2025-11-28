import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  WalletOutlined,
  CreditCardOutlined,
  BankOutlined,
} from '@ant-design/icons';
import {
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Tag,
  Space,
  Typography,
  Card,
  Statistic,
  Row,
  Col,
  Popconfirm,
  Drawer,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../auth/useAuthStore';
import {
  fetchFinanceSources,
  createFinanceSource,
  updateFinanceSource,
  deleteFinanceSource,
  fetchTransactions,
  type FinanceSource,
  type Transaction,
} from '../api/financeApi';
import { formatCurrency, formatDate } from '../utils/formatters';

const { Title } = Typography;
const { TextArea } = Input;

const FinanceSourcesPage = () => {
  const { t } = useTranslation();
  const role = useAuthStore((state) => state.role);
  const canEdit = role ? ['admin', 'accountant'].includes(role) : false;

  const [sources, setSources] = useState<FinanceSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSource, setEditingSource] = useState<FinanceSource | null>(null);
  const [form] = Form.useForm();

  // Transactions drawer state
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedSource, setSelectedSource] = useState<FinanceSource | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsPagination, setTransactionsPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const loadSources = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFinanceSources({ is_active: true });
      setSources(data);
    } catch (error: any) {
      toast.error(t('finance.loadError', 'Failed to load finance sources'));
      console.error('Load finance sources error:', error);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const handleCreate = () => {
    setEditingSource(null);
    form.resetFields();
    form.setFieldsValue({ currency: 'USD', type: 'cash', is_active: true });
    setModalVisible(true);
  };

  const handleEdit = (source: FinanceSource) => {
    setEditingSource(source);
    form.setFieldsValue(source);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteFinanceSource(id);
      toast.success(t('finance.deleteSuccess', 'Finance source deleted successfully'));
      loadSources();
    } catch (error: any) {
      toast.error(t('finance.deleteError', 'Failed to delete finance source'));
      console.error('Delete finance source error:', error);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingSource) {
        await updateFinanceSource(editingSource.id, values);
        toast.success(t('finance.updateSuccess', 'Finance source updated successfully'));
      } else {
        await createFinanceSource(values);
        toast.success(t('finance.createSuccess', 'Finance source created successfully'));
      }
      setModalVisible(false);
      loadSources();
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message;
      toast.error(t('finance.saveError', `Failed to save: ${errorMessage}`));
      console.error('Save finance source error:', error);
    }
  };

  const handleViewTransactions = async (source: FinanceSource) => {
    setSelectedSource(source);
    setDrawerVisible(true);
    await loadTransactions(source.id, 1);
  };

  const loadTransactions = async (sourceId: number, page: number = 1) => {
    setTransactionsLoading(true);
    try {
      const data = await fetchTransactions(sourceId, {
        page,
        page_size: transactionsPagination.pageSize,
      });
      setTransactions(data.results);
      setTransactionsPagination({
        current: page,
        pageSize: transactionsPagination.pageSize,
        total: data.count,
      });
    } catch (error: any) {
      toast.error(t('finance.loadTransactionsError', 'Failed to load transactions'));
      console.error('Load transactions error:', error);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const handleTransactionsPageChange = (page: number) => {
    if (selectedSource) {
      loadTransactions(selectedSource.id, page);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cash':
        return <WalletOutlined />;
      case 'card':
        return <CreditCardOutlined />;
      case 'bank':
        return <BankOutlined />;
      default:
        return null;
    }
  };

  const calculateTotals = () => {
    const usdTotal = sources
      .filter((s) => s.currency === 'USD')
      .reduce((sum, s) => sum + Number(s.balance), 0);
    const uzsTotal = sources
      .filter((s) => s.currency === 'UZS')
      .reduce((sum, s) => sum + Number(s.balance), 0);
    return { usdTotal, uzsTotal };
  };

  const { usdTotal, uzsTotal } = calculateTotals();

  const columns: ColumnsType<FinanceSource> = [
    {
      title: t('finance.name', 'Name'),
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          {getTypeIcon(record.type)}
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: t('finance.type', 'Type'),
      dataIndex: 'type_display',
      key: 'type_display',
    },
    {
      title: t('finance.currency', 'Currency'),
      dataIndex: 'currency',
      key: 'currency',
      render: (currency) => (
        <Tag color={currency === 'USD' ? 'green' : 'blue'}>{currency}</Tag>
      ),
    },
    {
      title: t('finance.balance', 'Balance'),
      dataIndex: 'balance',
      key: 'balance',
      align: 'right',
      render: (balance, record) => (
        <Typography.Text strong>
          {formatCurrency(balance, record.currency)}
        </Typography.Text>
      ),
    },
    {
      title: t('finance.totalPayments', 'Total Payments'),
      dataIndex: 'total_payments',
      key: 'total_payments',
      align: 'right',
      render: (total, record) => (
        <Typography.Text style={{ color: '#52c41a' }}>
          +{formatCurrency(total || 0, record.currency)}
        </Typography.Text>
      ),
    },
    {
      title: t('finance.totalExpenses', 'Total Expenses'),
      dataIndex: 'total_expenses',
      key: 'total_expenses',
      align: 'right',
      render: (total, record) => (
        <Typography.Text style={{ color: '#ff4d4f' }}>
          -{formatCurrency(total || 0, record.currency)}
        </Typography.Text>
      ),
    },
    {
      title: t('finance.status', 'Status'),
      dataIndex: 'is_active',
      key: 'is_active',
      render: (is_active) => (
        <Tag color={is_active ? 'success' : 'default'}>
          {is_active ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
        </Tag>
      ),
    },
    {
      title: t('common.createdAt', 'Created At'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => formatDate(date),
    },
    {
      title: t('common.actions', 'Actions'),
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            onClick={() => handleViewTransactions(record)}
          >
            {t('finance.viewTransactions', 'View Transactions')}
          </Button>
          {canEdit && (
            <>
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                {t('common.edit', 'Edit')}
              </Button>
              <Popconfirm
                title={t('finance.deleteConfirm', 'Are you sure to delete this finance source?')}
                onConfirm={() => handleDelete(record.id)}
                okText={t('common.yes', 'Yes')}
                cancelText={t('common.no', 'No')}
              >
                <Button type="link" danger icon={<DeleteOutlined />}>
                  {t('common.delete', 'Delete')}
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2}>{t('finance.title', 'Finance Sources')}</Title>
          {canEdit && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              {t('finance.addSource', 'Add Finance Source')}
            </Button>
          )}
        </div>

        <Row gutter={16}>
          <Col span={12}>
            <Card>
              <Statistic
                title={t('finance.totalUsd', 'Total USD')}
                value={usdTotal}
                precision={2}
                prefix="$"
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card>
              <Statistic
                title={t('finance.totalUzs', 'Total UZS')}
                value={uzsTotal}
                precision={2}
                suffix="UZS"
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={sources}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Space>

      <Modal
        title={
          editingSource
            ? t('finance.editSource', 'Edit Finance Source')
            : t('finance.addSource', 'Add Finance Source')
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="name"
            label={t('finance.name', 'Name')}
            rules={[{ required: true, message: t('finance.nameRequired', 'Name is required') }]}
          >
            <Input placeholder={t('finance.namePlaceholder', 'e.g., Main Cash Box')} />
          </Form.Item>

          <Form.Item
            name="type"
            label={t('finance.type', 'Type')}
            rules={[{ required: true, message: t('finance.typeRequired', 'Type is required') }]}
          >
            <Select>
              <Select.Option value="cash">
                <Space>
                  <WalletOutlined />
                  {t('finance.typeCash', 'Cash')}
                </Space>
              </Select.Option>
              <Select.Option value="card">
                <Space>
                  <CreditCardOutlined />
                  {t('finance.typeCard', 'Card')}
                </Space>
              </Select.Option>
              <Select.Option value="bank">
                <Space>
                  <BankOutlined />
                  {t('finance.typeBank', 'Bank Account')}
                </Space>
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="currency"
            label={t('finance.currency', 'Currency')}
            rules={[{ required: true, message: t('finance.currencyRequired', 'Currency is required') }]}
          >
            <Select>
              <Select.Option value="USD">USD</Select.Option>
              <Select.Option value="UZS">UZS</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="is_active"
            label={t('finance.active', 'Active')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item name="description" label={t('finance.description', 'Description')}>
            <TextArea rows={3} placeholder={t('finance.descriptionPlaceholder', 'Optional notes')} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="primary" htmlType="submit">
                {t('common.save', 'Save')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={
          selectedSource
            ? `${t('finance.transactionHistory', 'Transaction History')}: ${selectedSource.name}`
            : t('finance.transactionHistory', 'Transaction History')
        }
        width={800}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        <Table
          columns={[
            {
              title: t('finance.transactionType', 'Type'),
              dataIndex: 'transaction_type',
              key: 'transaction_type',
              render: (type) => (
                <Tag color={type === 'payment' ? 'green' : 'red'}>
                  {type === 'payment'
                    ? t('finance.payment', 'Payment')
                    : t('finance.expense', 'Expense')}
                </Tag>
              ),
            },
            {
              title: t('finance.transactionDate', 'Date'),
              dataIndex: 'transaction_date',
              key: 'transaction_date',
              render: (date) => formatDate(date),
            },
            {
              title: t('finance.transactionAmount', 'Amount'),
              dataIndex: 'transaction_amount',
              key: 'transaction_amount',
              align: 'right',
              render: (amount, record) => (
                <Typography.Text
                  style={{
                    color: record.transaction_type === 'payment' ? '#52c41a' : '#ff4d4f',
                  }}
                >
                  {record.transaction_type === 'payment' ? '+' : '-'}
                  {formatCurrency(amount, record.currency)}
                </Typography.Text>
              ),
            },
            {
              title: t('finance.transactionDescription', 'Description'),
              dataIndex: 'transaction_description',
              key: 'transaction_description',
            },
          ]}
          dataSource={transactions}
          rowKey="id"
          loading={transactionsLoading}
          pagination={{
            ...transactionsPagination,
            onChange: handleTransactionsPageChange,
          }}
        />
      </Drawer>
    </div>
  );
};

export default FinanceSourcesPage;
