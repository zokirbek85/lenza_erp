import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import {
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Upload,
  Tag,
  Space,
  Typography,
  Card,
  Row,
  Col,
  Popconfirm,
  InputNumber,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import dayjs from 'dayjs';

import { useAuthStore } from '../auth/useAuthStore';
import {
  fetchExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  approveExpense,
  rejectExpense,
  fetchExpenseCategories,
  fetchFinanceSources,
  type Expense,
  type ExpenseCategory,
  type FinanceSource,
} from '../api/financeApi';
import { formatCurrency, formatDate } from '../utils/formatters';
import PaginationControls from '../components/PaginationControls';
import { usePersistedPageSize } from '../hooks/usePageSize';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const ExpensesPage = () => {
  const { t } = useTranslation();
  const role = useAuthStore((state) => state.role);
  const canCreate = role ? ['admin', 'accountant', 'sales'].includes(role) : false;
  const canApprove = role ? ['admin', 'accountant'].includes(role) : false;

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [sources, setSources] = useState<FinanceSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [form] = Form.useForm();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePersistedPageSize('expenses_page_size');
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState({
    source: undefined as number | undefined,
    category: undefined as number | undefined,
    status: undefined as string | undefined,
    dateRange: null as [dayjs.Dayjs, dayjs.Dayjs] | null,
  });

  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const { results, count } = await fetchExpenses({
        page,
        page_size: pageSize,
        source: filters.source,
        category: filters.category,
        status: filters.status,
        expense_date__gte: filters.dateRange?.[0]?.format('YYYY-MM-DD'),
        expense_date__lte: filters.dateRange?.[1]?.format('YYYY-MM-DD'),
        ordering: '-expense_date,-created_at',
      });
      setExpenses(results);
      setTotal(count);
    } catch (error: any) {
      toast.error(t('expenses.loadError', 'Failed to load expenses'));
      console.error('Load expenses error:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters, t]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await fetchExpenseCategories();
      setCategories(data);
    } catch (error: any) {
      console.error('Load categories error:', error);
    }
  }, []);

  const loadSources = useCallback(async () => {
    try {
      const data = await fetchFinanceSources({ is_active: true });
      setSources(data);
    } catch (error: any) {
      console.error('Load sources error:', error);
    }
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  useEffect(() => {
    loadCategories();
    loadSources();
  }, [loadCategories, loadSources]);

  const handleCreate = () => {
    setEditingExpense(null);
    form.resetFields();
    form.setFieldsValue({
      expense_date: dayjs(),
      currency: 'USD',
    });
    setFileList([]);
    setModalVisible(true);
  };

  const handleEdit = (expense: Expense) => {
    if (expense.status !== 'pending') {
      toast.error(t('expenses.cannotEditApproved', 'Cannot edit approved/rejected expenses'));
      return;
    }
    setEditingExpense(expense);
    form.setFieldsValue({
      ...expense,
      expense_date: dayjs(expense.expense_date),
    });
    setFileList(
      expense.receipt_image_url
        ? [
            {
              uid: '-1',
              name: 'receipt.jpg',
              status: 'done',
              url: expense.receipt_image_url,
            },
          ]
        : []
    );
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteExpense(id);
      toast.success(t('expenses.deleteSuccess', 'Expense deleted successfully'));
      loadExpenses();
    } catch (error: any) {
      toast.error(t('expenses.deleteError', 'Failed to delete expense'));
      console.error('Delete expense error:', error);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await approveExpense(id);
      toast.success(t('expenses.approveSuccess', 'Expense approved successfully'));
      loadExpenses();
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message;
      toast.error(t('expenses.approveError', `Failed to approve: ${errorMessage}`));
      console.error('Approve expense error:', error);
    }
  };

  const handleReject = async (id: number, reason?: string) => {
    try {
      await rejectExpense(id, reason);
      toast.success(t('expenses.rejectSuccess', 'Expense rejected successfully'));
      loadExpenses();
    } catch (error: any) {
      toast.error(t('expenses.rejectError', 'Failed to reject expense'));
      console.error('Reject expense error:', error);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const formData = new FormData();
      formData.append('source', values.source);
      formData.append('category', values.category);
      formData.append('amount', values.amount);
      formData.append('currency', values.currency);
      formData.append('expense_date', values.expense_date.format('YYYY-MM-DD'));
      formData.append('description', values.description || '');

      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append('receipt_image', fileList[0].originFileObj);
      }

      if (editingExpense) {
        await updateExpense(editingExpense.id, formData);
        toast.success(t('expenses.updateSuccess', 'Expense updated successfully'));
      } else {
        await createExpense(formData);
        toast.success(t('expenses.createSuccess', 'Expense created successfully'));
      }
      setModalVisible(false);
      loadExpenses();
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message;
      toast.error(t('expenses.saveError', `Failed to save: ${errorMessage}`));
      console.error('Save expense error:', error);
    }
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'pending':
        return <Tag color="orange">{t('expenses.statusPending', 'Pending')}</Tag>;
      case 'approved':
        return <Tag color="green">{t('expenses.statusApproved', 'Approved')}</Tag>;
      case 'rejected':
        return <Tag color="red">{t('expenses.statusRejected', 'Rejected')}</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const selectedSource = sources.find((s) => s.id === form.getFieldValue('source'));

  const columns: ColumnsType<Expense> = [
    {
      title: t('expenses.date', 'Date'),
      dataIndex: 'expense_date',
      key: 'expense_date',
      render: (date) => formatDate(date),
      width: 120,
    },
    {
      title: t('expenses.source', 'Source'),
      dataIndex: 'source_name',
      key: 'source_name',
    },
    {
      title: t('expenses.category', 'Category'),
      dataIndex: 'category_name',
      key: 'category_name',
    },
    {
      title: t('expenses.amount', 'Amount'),
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (amount, record) => (
        <Text strong>{formatCurrency(amount, record.currency)}</Text>
      ),
    },
    {
      title: t('expenses.description', 'Description'),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: t('expenses.status', 'Status'),
      dataIndex: 'status',
      key: 'status',
      render: (_, record) => getStatusTag(record.status),
      width: 120,
    },
    {
      title: t('expenses.createdBy', 'Created By'),
      dataIndex: 'created_by_fullname',
      key: 'created_by_fullname',
    },
    {
      title: t('expenses.approvedBy', 'Approved By'),
      dataIndex: 'approved_by_fullname',
      key: 'approved_by_fullname',
      render: (text) => text || '-',
    },
    {
      title: t('common.actions', 'Actions'),
      key: 'actions',
      fixed: 'right',
      width: 200,
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && canApprove && (
            <>
              <Button
                type="link"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => handleApprove(record.id)}
              >
                {t('common.approve', 'Approve')}
              </Button>
              <Popconfirm
                title={t('expenses.rejectConfirm', 'Are you sure to reject this expense?')}
                onConfirm={() => handleReject(record.id)}
                okText={t('common.yes', 'Yes')}
                cancelText={t('common.no', 'No')}
              >
                <Button type="link" size="small" danger icon={<CloseOutlined />}>
                  {t('common.reject', 'Reject')}
                </Button>
              </Popconfirm>
            </>
          )}
          {record.status === 'pending' && canApprove && (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                {t('common.edit', 'Edit')}
              </Button>
              <Popconfirm
                title={t('expenses.deleteConfirm', 'Are you sure to delete this expense?')}
                onConfirm={() => handleDelete(record.id)}
                okText={t('common.yes', 'Yes')}
                cancelText={t('common.no', 'No')}
              >
                <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                  {t('common.delete', 'Delete')}
                </Button>
              </Popconfirm>
            </>
          )}
          {record.receipt_image_url && (
            <a href={record.receipt_image_url} target="_blank" rel="noopener noreferrer">
              <Button type="link" size="small" icon={<DownloadOutlined />}>
                {t('expenses.receipt', 'Receipt')}
              </Button>
            </a>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2}>{t('expenses.title', 'Expenses')}</Title>
          {canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              {t('expenses.addExpense', 'Add Expense')}
            </Button>
          )}
        </div>

        <Card>
          <Row gutter={16}>
            <Col span={6}>
              <Select
                placeholder={t('expenses.filterSource', 'Filter by Source')}
                allowClear
                style={{ width: '100%' }}
                value={filters.source}
                onChange={(value) => setFilters({ ...filters, source: value })}
              >
                {sources.map((s) => (
                  <Select.Option key={s.id} value={s.id}>
                    {s.name}
                  </Select.Option>
                ))}
              </Select>
            </Col>
            <Col span={6}>
              <Select
                placeholder={t('expenses.filterCategory', 'Filter by Category')}
                allowClear
                style={{ width: '100%' }}
                value={filters.category}
                onChange={(value) => setFilters({ ...filters, category: value })}
              >
                {categories.map((c) => (
                  <Select.Option key={c.id} value={c.id}>
                    {c.name}
                  </Select.Option>
                ))}
              </Select>
            </Col>
            <Col span={6}>
              <Select
                placeholder={t('expenses.filterStatus', 'Filter by Status')}
                allowClear
                style={{ width: '100%' }}
                value={filters.status}
                onChange={(value) => setFilters({ ...filters, status: value })}
              >
                <Select.Option value="pending">{t('expenses.statusPending', 'Pending')}</Select.Option>
                <Select.Option value="approved">{t('expenses.statusApproved', 'Approved')}</Select.Option>
                <Select.Option value="rejected">{t('expenses.statusRejected', 'Rejected')}</Select.Option>
              </Select>
            </Col>
            <Col span={6}>
              <RangePicker
                style={{ width: '100%' }}
                value={filters.dateRange}
                onChange={(dates) => setFilters({ ...filters, dateRange: dates as any })}
              />
            </Col>
          </Row>
        </Card>

        <Table
          columns={columns}
          dataSource={expenses}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 1200 }}
        />

        <PaginationControls
          page={page}
          pageSize={pageSize}
          total={total}
          setPage={setPage}
          setPageSize={setPageSize}
        />
      </Space>

      <Modal
        title={
          editingExpense
            ? t('expenses.editExpense', 'Edit Expense')
            : t('expenses.addExpense', 'Add Expense')
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={700}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="source"
            label={t('expenses.source', 'Finance Source')}
            rules={[{ required: true, message: t('expenses.sourceRequired', 'Source is required') }]}
          >
            <Select
              placeholder={t('expenses.selectSource', 'Select finance source')}
              onChange={() => {
                const source = sources.find((s) => s.id === form.getFieldValue('source'));
                if (source) {
                  form.setFieldsValue({ currency: source.currency });
                }
              }}
            >
              {sources.map((s) => (
                <Select.Option key={s.id} value={s.id}>
                  {s.name} ({formatCurrency(s.balance, s.currency)})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {selectedSource && (
            <Card size="small" style={{ marginBottom: 16, background: '#f0f2f5' }}>
              <Text type="secondary">
                {t('expenses.availableBalance', 'Available Balance')}:{' '}
                <Text strong>{formatCurrency(selectedSource.balance, selectedSource.currency)}</Text>
              </Text>
            </Card>
          )}

          <Form.Item
            name="category"
            label={t('expenses.category', 'Category')}
            rules={[{ required: true, message: t('expenses.categoryRequired', 'Category is required') }]}
          >
            <Select placeholder={t('expenses.selectCategory', 'Select category')}>
              {categories.map((c) => (
                <Select.Option key={c.id} value={c.id}>
                  {c.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="amount"
                label={t('expenses.amount', 'Amount')}
                rules={[{ required: true, message: t('expenses.amountRequired', 'Amount is required') }]}
              >
                <InputNumber
                  min={0}
                  precision={2}
                  style={{ width: '100%' }}
                  placeholder="0.00"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="currency"
                label={t('expenses.currency', 'Currency')}
                rules={[{ required: true }]}
              >
                <Select disabled>
                  <Select.Option value="USD">USD</Select.Option>
                  <Select.Option value="UZS">UZS</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="expense_date"
            label={t('expenses.date', 'Expense Date')}
            rules={[{ required: true, message: t('expenses.dateRequired', 'Date is required') }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="description" label={t('expenses.description', 'Description')}>
            <TextArea rows={3} placeholder={t('expenses.descriptionPlaceholder', 'Enter details')} />
          </Form.Item>

          <Form.Item label={t('expenses.receipt', 'Receipt Image')}>
            <Upload
              listType="picture-card"
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
              beforeUpload={() => false}
              maxCount={1}
            >
              {fileList.length === 0 && '+ Upload'}
            </Upload>
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
    </div>
  );
};

export default ExpensesPage;
