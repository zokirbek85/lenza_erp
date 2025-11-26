import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table,
  Card,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Typography,
  Space,
  message,
  Row,
  Col,
  Tag,
  Statistic,
  Tooltip,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { Line, Pie } from 'react-chartjs-2';
import { useIsMobile } from '../hooks/useIsMobile';
import FilterDrawer from '../components/responsive/filters/FilterDrawer';
import FilterTrigger from '../components/responsive/filters/FilterTrigger';
import ExpensesMobileCards from './_mobile/ExpensesMobileCards';
import type { ExpensesMobileHandlers } from './_mobile/ExpensesMobileCards';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
  ArcElement,
} from 'chart.js';
import dayjs, { Dayjs } from 'dayjs';
import {
  fetchExpenses,
  fetchExpenseTypes,
  fetchExpenseStats,
  fetchExpenseTrend,
  fetchExpenseDistribution,
  createExpense,
  updateExpense,
  deleteExpense,
  approveExpense,
  exportExpensesPdf,
  exportExpensesExcel,
} from '../services/expenseApi';
import type {
  Expense,
  ExpenseType,
  ExpenseStats,
  ExpenseTrend,
  ExpenseDistribution,
  ExpenseFilters,
} from '../services/expenseApi';
import { fetchCashboxes } from '../services/cashboxApi';
import type { Cashbox } from '../services/cashboxApi';
import type { ColumnsType } from 'antd/es/table';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTitle,
  ChartTooltip,
  Legend,
  Filler,
  ArcElement
);

const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function ExpensesPage() {
  const { t } = useTranslation();
  const { isMobile } = useIsMobile();
  
  // ========== STATE ==========
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [cashboxes, setCashboxes] = useState<Cashbox[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [trendData, setTrendData] = useState<ExpenseTrend[]>([]);
  const [distributionData, setDistributionData] = useState<ExpenseDistribution[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState({ pdf: false, xlsx: false });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [form] = Form.useForm();

  // Filters
  const [currency, setCurrency] = useState<'USD' | 'UZS'>('USD');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [filterType, setFilterType] = useState<number | undefined>();
  const [filterCashbox, setFilterCashbox] = useState<number | undefined>();
  const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | undefined>();

  // ========== LOAD DATA ==========
  useEffect(() => {
    loadExpenseTypes();
    loadCashboxes();
  }, []);

  useEffect(() => {
    loadData();
  }, [dateRange, filterType, filterCashbox, filterStatus]);

  const loadExpenseTypes = async () => {
    try {
      const types = await fetchExpenseTypes();
      setExpenseTypes(Array.isArray(types) ? types.filter(t => t.is_active) : []);
    } catch (error) {
      console.error('Failed to load expense types:', error);
      message.error(t('expenses.messages.loadTypesError'));
      setExpenseTypes([]);
    }
  };

  const loadCashboxes = async () => {
    try {
      const data = await fetchCashboxes();
      setCashboxes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load cashboxes:', error);
      message.error(t('expenses.messages.loadCashboxesError'));
      setCashboxes([]);
    }
  };

  const loadData = async () => {
    setLoading(true);
    console.log('рџ”„ loadData started...');
    try {
      const filters: ExpenseFilters = {
        date_from: dateRange?.[0]?.format('YYYY-MM-DD'),
        date_to: dateRange?.[1]?.format('YYYY-MM-DD'),
        type: filterType,
        cashbox: filterCashbox,
        status: filterStatus,
      };
      console.log('📋 Filters:', filters);

      const [expensesData, statsData, trendDataResult, distributionDataResult] = await Promise.all([
        fetchExpenses(filters),
        fetchExpenseStats(),
        fetchExpenseTrend(30),
        fetchExpenseDistribution('month'),
      ]);
      
      console.log('вњ… All data loaded:', {
        expenses: expensesData.length,
        stats: statsData,
        trend: trendDataResult.length,
        distribution: distributionDataResult.length,
      });

      setExpenses(Array.isArray(expensesData) ? expensesData : []);
      console.log('рџ“ќ Expenses set to state:', expensesData.length, 'items');
      
      // Fallback - agar backend bo'sh object qaytarsa
      setStats(statsData || {
        today: { count: 0, total_usd: 0, total_uzs: 0 },
        week: { count: 0, total_usd: 0, total_uzs: 0 },
        month: { count: 0, total_usd: 0, total_uzs: 0 },
        total: { count: 0, total_usd: 0, total_uzs: 0 },
      });
      
      setTrendData(trendDataResult || []);
      setDistributionData(distributionDataResult || []);
    } catch (error) {
      message.error(t('expenses.messages.loadError'));
      console.error('вќЊ Load data error:', error);
      
      // Xatolik bo'lsa ham default qiymatlar
      setExpenses([]);
      setStats({
        today: { count: 0, total_usd: 0, total_uzs: 0 },
        week: { count: 0, total_usd: 0, total_uzs: 0 },
        month: { count: 0, total_usd: 0, total_uzs: 0 },
        total: { count: 0, total_usd: 0, total_uzs: 0 },
      });
      setTrendData([]);
      setDistributionData([]);
    } finally {
      setLoading(false);
      console.log('вњ… loadData finished');
    }
  };

  // ========== CRUD OPERATIONS ==========
  const handleCreate = () => {
    form.resetFields();
    setEditingExpense(null);
    setModalOpen(true);
  };

  const handleEdit = (expense: Expense) => {
    form.setFieldsValue({
      ...expense,
      date: dayjs(expense.date),
    });
    setEditingExpense(expense);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteExpense(id);
      message.success(t('expenses.messages.deleted'));
      loadData();
    } catch (error) {
      message.error(t('expenses.messages.deleteError'));
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await approveExpense(id);
      message.success(t('expenses.messages.approved'));
      loadData();
    } catch (error) {
      message.error(t('expenses.messages.approveError'));
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
      };

      if (editingExpense) {
        await updateExpense(editingExpense.id, data);
        message.success(t('expenses.messages.updated'));
      } else {
        await createExpense(data);
        message.success(t('expenses.messages.created'));
      }

      setModalOpen(false);
      loadData();
    } catch (error) {
      message.error(t('expenses.messages.saveError'));
    }
  };

  // ========== EXPORT ==========
  const handleExport = async (format: 'pdf' | 'xlsx') => {
    setExporting((prev) => ({ ...prev, [format]: true }));
    try {
      const filters: ExpenseFilters = {
        date_from: dateRange?.[0]?.format('YYYY-MM-DD'),
        date_to: dateRange?.[1]?.format('YYYY-MM-DD'),
        type: filterType,
        cashbox: filterCashbox,
        status: filterStatus,
        currency,
      };

      const exporter = format === 'pdf' ? exportExpensesPdf : exportExpensesExcel;
      const blob = await exporter(filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `expenses_${dayjs().format('YYYY-MM-DD')}.${format}`;
      link.click();
      window.URL.revokeObjectURL(url);
      message.success(t('expenses.messages.exportSuccess', { format: format.toUpperCase() }));
    } catch (error) {
      message.error(t('expenses.messages.exportError'));
    } finally {
      setExporting((prev) => ({ ...prev, [format]: false }));
    }
  };

  // ========== CHARTS ==========
  const trendChartData = {
    labels: trendData.map(d => dayjs(d.date).format('DD MMM')),
    datasets: [
      {
        label: t('expenses.chart.expenses', { currency }),
        data: trendData.map(d => (currency === 'USD' ? d.total_usd : d.total_uzs)),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const pieChartData = {
    labels: distributionData.map(d => d.type_name),
    datasets: [
      {
        data: distributionData.map(d => (currency === 'USD' ? d.total_usd : d.total_uzs)),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // ========== TABLE COLUMNS ==========
  // ========== MOBILE HANDLERS ==========
  const mobileHandlers: ExpensesMobileHandlers = {
    onView: (expenseId) => {
      const expense = expenses.find((e) => e.id === expenseId);
      if (expense) handleEdit(expense);
    },
    onEdit: (expenseId) => {
      const expense = expenses.find((e) => e.id === expenseId);
      if (expense) handleEdit(expense);
    },
    onDelete: (expenseId) => {
      handleDelete(expenseId);
    },
  };

  const mobilePermissions = {
    canEdit: true,
    canDelete: true,
  };

  const filtersContent = (
    <Space direction="vertical" style={{ width: '100%' }}>
      <div>
        <label className="mb-2 block text-sm font-medium">{t('expenses.filters.type')}</label>
        <Select
          value={filterType}
          onChange={setFilterType}
          placeholder={t('expenses.filters.allTypes')}
          allowClear
          style={{ width: '100%' }}
        >
          {expenseTypes.map((type) => (
            <Select.Option key={type.id} value={type.id}>
              {type.name}
            </Select.Option>
          ))}
        </Select>
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium">{t('expenses.filters.dateRange')}</label>
        <RangePicker
          value={dateRange}
          onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
          style={{ width: '100%' }}
        />
      </div>
    </Space>
  );

  const columns: ColumnsType<Expense> = [
    {
      title: t('expenses.table.date'),
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
    },
    {
      title: t('expenses.table.type'),
      dataIndex: 'type_name',
      key: 'type_name',
    },
    {
      title: t('expenses.table.method'),
      dataIndex: 'method',
      key: 'method',
      render: (method: string) => (
        <Tag color={method === 'cash' ? 'green' : 'blue'}>
          {method === 'cash' ? t('expenses.method.cash') : t('expenses.method.card')}
        </Tag>
      ),
    },
    {
      title: t('expenses.table.card'),
      dataIndex: 'card_name',
      key: 'card_name',
      render: (name: string | null) => name || '-',
    },
    {
      title: t('expenses.table.amount'),
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number, record: Expense) => (
        <span>
          {new Intl.NumberFormat('en-US').format(amount)} {record.currency}
        </span>
      ),
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'USD',
      dataIndex: 'amount_usd',
      key: 'amount_usd',
      render: (amount: number) => (
        <strong style={{ color: '#10b981' }}>
          ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}
        </strong>
      ),
      sorter: (a, b) => a.amount_usd - b.amount_usd,
    },
    {
      title: 'UZS',
      dataIndex: 'amount_uzs',
      key: 'amount_uzs',
      render: (amount: number) => (
        <strong style={{ color: '#3b82f6' }}>
          {new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)}
        </strong>
      ),
      sorter: (a, b) => a.amount_uzs - b.amount_uzs,
    },
    {
      title: t('expenses.table.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag
          icon={status === 'approved' ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
          color={status === 'approved' ? 'success' : 'warning'}
        >
          {status === 'approved' ? t('expenses.status.approved') : t('expenses.status.pending')}
        </Tag>
      ),
    },
    {
      title: t('expenses.table.description'),
      dataIndex: 'description',
      key: 'description',
      render: (desc: string | null) => desc || '-',
    },
    {
      title: t('table.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <Tooltip title={t('expenses.actions.approve')}>
              <Button
                type="link"
                icon={<CheckCircleOutlined />}
                onClick={() => handleApprove(record.id)}
              />
            </Tooltip>
          )}
          <Tooltip title={t('actions.edit')}>
            <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Popconfirm
            title={t('expenses.confirmDelete')}
            onConfirm={() => handleDelete(record.id)}
            okText={t('actions.yes')}
            cancelText={t('actions.no')}
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ========== MOBILE VIEW ==========
  if (isMobile) {
    return (
      <div className="space-y-4 px-4 pb-6">
        <header className="flex items-center justify-between py-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t('expenses.title')}</h1>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            {t('expenses.new')}
          </Button>
        </header>

        <FilterTrigger onClick={() => setFiltersOpen(true)} />
        <FilterDrawer
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title={t('expenses.filters.title')}
        >
          {filtersContent}
        </FilterDrawer>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            {t('expenses.messages.loading')}
          </div>
        ) : (
          <ExpensesMobileCards
            data={expenses.map((e) => ({
              id: e.id,
              category: { name: e.type_name || undefined },
              description: e.description || '',
              amount: e.amount,
              currency: e.currency,
              amount_usd: e.amount_usd,
              amount_uzs: e.amount_uzs,
              expense_date: e.date,
              note: e.description,
              created_by: { full_name: '' },
            }))}
            handlers={mobileHandlers}
            permissions={mobilePermissions}
          />
        )}

        {/* Modal (shared with desktop) */}
        <Modal
          title={editingExpense ? t('expenses.edit') : t('expenses.new')}
          open={modalOpen}
          onOk={handleSubmit}
          onCancel={() => setModalOpen(false)}
          okText={t('actions.save')}
          cancelText={t('actions.cancel')}
        >
          <Form form={form} layout="vertical">
            {/* ... form fields will render ... */}
          </Form>
        </Modal>
      </div>
    );
  }

  // ========== DESKTOP VIEW ==========
  return (
    <section className="page-wrapper space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Title level={2}>{t('expenses.title')}</Title>
        <Space>
          <Select value={currency} onChange={setCurrency} style={{ width: 100 }}>
            <Select.Option value="USD">USD</Select.Option>
            <Select.Option value="UZS">UZS</Select.Option>
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            {t('expenses.new')}
          </Button>
        </Space>
      </div>

      {/* STATISTICS CARDS */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('expenses.stats.today')}
              value={stats ? (currency === 'USD' ? stats.today.total_usd : stats.today.total_uzs) : 0}
              suffix={currency}
              precision={2}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('expenses.stats.week')}
              value={stats ? (currency === 'USD' ? stats.week.total_usd : stats.week.total_uzs) : 0}
              suffix={currency}
              precision={2}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('expenses.stats.month')}
              value={stats ? (currency === 'USD' ? stats.month.total_usd : stats.month.total_uzs) : 0}
              suffix={currency}
              precision={2}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('expenses.stats.total')}
              value={stats ? (currency === 'USD' ? stats.total.total_usd : stats.total.total_uzs) : 0}
              suffix={currency}
              precision={2}
            />
          </Card>
        </Col>
      </Row>

      {/* CHARTS */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title={t('expenses.chart.trend')}>
            <Line data={trendChartData} options={{ responsive: true, maintainAspectRatio: true }} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title={t('expenses.chart.distribution')}>
            <Pie data={pieChartData} options={{ responsive: true, maintainAspectRatio: true }} />
          </Card>
        </Col>
      </Row>

      {/* FILTERS & EXPORT */}
      <Card>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
              format="DD.MM.YYYY"
              style={{ width: '100%' }}
              placeholder={[t('expenses.filters.startDate'), t('expenses.filters.endDate')]}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder={t('expenses.filters.type')}
              allowClear
              value={filterType}
              onChange={setFilterType}
              style={{ width: '100%' }}
            >
              {expenseTypes.map(type => (
                <Select.Option key={type.id} value={type.id}>
                  {type.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder={t('expenses.filters.cashbox')}
              allowClear
              value={filterCashbox}
              onChange={setFilterCashbox}
              style={{ width: '100%' }}
              showSearch
              optionFilterProp="children"
            >
              {Array.isArray(cashboxes) && cashboxes.map(cashbox => (
                <Select.Option key={cashbox.id} value={cashbox.id}>
                  {cashbox.name} ({cashbox.currency})
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder={t('expenses.filters.status')}
              allowClear
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: '100%' }}
            >
              <Select.Option value="pending">{t('expenses.status.pending')}</Select.Option>
              <Select.Option value="approved">{t('expenses.status.approved')}</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={2}>
            <Space>
              <Tooltip title={t('expenses.exportPdf')}>
                <Button
                  icon={<FilePdfOutlined />}
                  onClick={() => handleExport('pdf')}
                  loading={exporting.pdf}
                />
              </Tooltip>
              <Tooltip title={t('expenses.exportExcel')}>
                <Button
                  icon={<FileExcelOutlined />}
                  onClick={() => handleExport('xlsx')}
                  loading={exporting.xlsx}
                />
              </Tooltip>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* TABLE */}
      <div className="table-wrapper">
        <Card variant="borderless">
          <Table
            columns={columns}
            dataSource={expenses}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => t('table.total', { count: total }) }}
          />
        </Card>
      </div>

      {/* CREATE/EDIT MODAL */}
      <Modal
        title={editingExpense ? t('expenses.editTitle') : t('expenses.createTitle')}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={600}
        okText={t('actions.save')}
        cancelText={t('actions.cancel')}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          <Form.Item name="date" label={t('expenses.form.date')} rules={[{ required: true, message: t('expenses.form.dateRequired') }]}>
            <DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="type" label={t('expenses.form.type')} rules={[{ required: true, message: t('expenses.form.typeRequired') }]}>
            <Select placeholder={t('expenses.form.selectType')}>
              {expenseTypes.map(type => (
                <Select.Option key={type.id} value={type.id}>
                  {type.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="cashbox" label={t('expenses.form.cashbox')} rules={[{ required: true, message: t('expenses.form.cashboxRequired') }]}>
            <Select 
              placeholder={t('expenses.form.selectCashbox')}
              showSearch
              optionFilterProp="children"
            >
              {Array.isArray(cashboxes) && cashboxes.map(cashbox => (
                <Select.Option key={cashbox.id} value={cashbox.id}>
                  {cashbox.name} ({cashbox.currency})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="currency" label={t('expenses.form.currency')} rules={[{ required: true, message: t('expenses.form.currencyRequired') }]}>
            <Select placeholder={t('expenses.form.selectCurrency')}>
              <Select.Option value="USD">USD</Select.Option>
              <Select.Option value="UZS">UZS</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="amount" label={t('expenses.form.amount')} rules={[{ required: true, message: t('expenses.form.amountRequired') }]}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="0.00" />
          </Form.Item>

          <Form.Item name="description" label={t('expenses.form.description')}>
            <Input.TextArea rows={3} placeholder={t('expenses.form.descriptionPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}

