import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table,
  Card,
  Button,
  Select,
  DatePicker,
  Space,
  message,
  Row,
  Col,
  Tag,
  Statistic,
  Tooltip,
  Popconfirm,
  Collapse,
} from 'antd';
import {
  PlusOutlined,
  MinusOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
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
import CreateExpenseForm from './Expenses/components/CreateExpenseForm';
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
  fetchExpenseCategories,
  fetchExpenseStats,
  fetchExpenseTrend,
  fetchExpenseDistribution,
  deleteExpense,
  approveExpense,
  exportExpensesPdf,
  exportExpensesExcel,
} from '../services/expenseApi';
import type {
  Expense,
  ExpenseCategory,
  ExpenseStats,
  ExpenseTrend,
  ExpenseDistribution,
  ExpenseFilters,
} from '../services/expenseApi';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../auth/useAuthStore';

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

const { RangePicker } = DatePicker;

const CREATE_FORM_PANEL_KEY = 'create-expense';

export default function ExpensesPage() {
  const { t } = useTranslation();
  const { isMobile } = useIsMobile();

  // ========== STATE ==========
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [trendData, setTrendData] = useState<ExpenseTrend[]>([]);
  const [distributionData, setDistributionData] = useState<ExpenseDistribution[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState({ pdf: false, xlsx: false });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filters
  const [currency, setCurrency] = useState<'USD' | 'UZS'>('USD');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [filterCategory, setFilterCategory] = useState<number | undefined>();
  const [filterCashbox, setFilterCashbox] = useState<number | undefined>();
  const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | undefined>();

  const role = useAuthStore((state) => state.role);
  const canCreate = ['admin', 'accountant', 'owner'].includes(role || '');

  // ========== LOAD DATA ==========
  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadData();
  }, [dateRange, filterCategory, filterCashbox, filterStatus]);

  const loadCategories = async () => {
    try {
      const types = await fetchExpenseCategories();
      setCategories(Array.isArray(types) ? types.filter(t => t.is_active) : []);
    } catch (error) {
      console.error('Failed to load expense categories:', error);
      message.error(t('expenses.messages.loadTypesError'));
      setCategories([]);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const filters: ExpenseFilters = {
        date_from: dateRange?.[0]?.format('YYYY-MM-DD'),
        date_to: dateRange?.[1]?.format('YYYY-MM-DD'),
        category: filterCategory,
        cashbox: filterCashbox,
        status: filterStatus,
      };

      const [expensesData, statsData, trendDataResult, distributionDataResult] = await Promise.all([
        fetchExpenses(filters),
        fetchExpenseStats(),
        fetchExpenseTrend(30),
        fetchExpenseDistribution('month'),
      ]);

      setExpenses(Array.isArray(expensesData) ? expensesData : []);
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
      console.error('Load data error:', error);
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
    }
  };

  // ========== CRUD OPERATIONS ==========
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

  const handleToggleCreateForm = () => {
    setShowCreateForm((prev) => !prev);
  };

  const handleCollapseChange = (keys: string | string[]) => {
    if (Array.isArray(keys)) {
      setShowCreateForm(keys.includes(CREATE_FORM_PANEL_KEY));
    } else {
      setShowCreateForm(keys === CREATE_FORM_PANEL_KEY);
    }
  };

  const handleFormSuccess = () => {
    setShowCreateForm(false);
    loadData();
  };

  const handleFormCancel = () => {
    setShowCreateForm(false);
  };

  // ========== EXPORT ==========
  const handleExport = async (format: 'pdf' | 'xlsx') => {
    setExporting((prev) => ({ ...prev, [format]: true }));
    try {
      const filters: ExpenseFilters = {
        date_from: dateRange?.[0]?.format('YYYY-MM-DD'),
        date_to: dateRange?.[1]?.format('YYYY-MM-DD'),
        category: filterCategory,
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
      dataIndex: 'category_name',
      key: 'category_name',
    },
    {
      title: t('expenses.table.cashbox'),
      dataIndex: 'cashbox_name',
      key: 'cashbox_name',
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
          {canCreate && record.status === 'pending' && (
            <Tooltip title={t('expenses.actions.approve')}>
              <Button
                type="link"
                icon={<CheckCircleOutlined />}
                onClick={() => handleApprove(record.id)}
              />
            </Tooltip>
          )}
          {canCreate && (
            <Popconfirm
              title={t('expenses.confirmDelete')}
              onConfirm={() => handleDelete(record.id)}
              okText={t('actions.yes')}
              cancelText={t('actions.no')}
            >
              <Button type="link" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // ========== MOBILE HANDLERS ==========
  const mobileHandlers: ExpensesMobileHandlers = {
    onView: (expenseId) => {
      // For mobile, we can show details in a modal if needed
      console.log('View expense:', expenseId);
    },
    onEdit: (expenseId) => {
      // Editing not supported in inline form yet
      console.log('Edit expense:', expenseId);
    },
    onDelete: (expenseId) => {
      handleDelete(expenseId);
    },
  };

  const mobilePermissions = {
    canEdit: canCreate,
    canDelete: canCreate,
  };

  const filtersContent = (
    <Space direction="vertical" style={{ width: '100%' }}>
      <div>
        <label className="mb-2 block text-sm font-medium">{t('expenses.filters.type')}</label>
        <Select
          value={filterCategory}
          onChange={setFilterCategory}
          placeholder={t('expenses.filters.allTypes')}
          allowClear
          style={{ width: '100%' }}
        >
          {categories.map((type) => (
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
          onChange={(dates: any) => setDateRange(dates as [Dayjs, Dayjs] | null)}
          style={{ width: '100%' }}
        />
      </div>
    </Space>
  );

  // ========== MOBILE VIEW ==========
  if (isMobile) {
    return (
      <div className="space-y-4 px-4 pb-6">
        <header className="flex items-center justify-between py-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t('expenses.title')}</h1>
          </div>
          {canCreate && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleToggleCreateForm}
            >
              {t('expenses.new')}
            </Button>
          )}
        </header>

        {canCreate && showCreateForm && (
          <CreateExpenseForm
            categories={categories}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
            onCategoriesReload={loadCategories}
          />
        )}

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
              category: { name: e.category_name || undefined },
              description: e.description || '',
              amount: e.amount,
              currency: e.currency,
              amount_usd: e.amount_usd,
              amount_uzs: e.amount_uzs,
              expense_date: e.date,
              note: e.description,
              created_by: { full_name: '' },
              status: e.status,
            }))}
            handlers={mobileHandlers}
            permissions={mobilePermissions}
          />
        )}
      </div>
    );
  }

  // ========== DESKTOP VIEW ==========
  return (
    <section className="page-wrapper space-y-6">
      {/* HEADER */}
      <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('expenses.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('expenses.subtitle')}</p>
        </div>
        <Space>
          <Select value={currency} onChange={setCurrency} style={{ width: 100 }}>
            <Select.Option value="USD">USD</Select.Option>
            <Select.Option value="UZS">UZS</Select.Option>
          </Select>
        </Space>
      </header>

      {/* CREATE FORM TOGGLE */}
      {canCreate && (
        <div className="mb-4 flex justify-end">
          <Button
            type={showCreateForm ? 'default' : 'primary'}
            icon={showCreateForm ? <MinusOutlined /> : <PlusOutlined />}
            onClick={handleToggleCreateForm}
          >
            {t(showCreateForm ? 'expenses.hideForm' : 'expenses.new')}
          </Button>
        </div>
      )}

      {/* INLINE CREATE FORM */}
      {canCreate && (
        <Collapse
          className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
          activeKey={showCreateForm ? [CREATE_FORM_PANEL_KEY] : []}
          onChange={(key) => handleCollapseChange(key as string[] | string)}
          items={[
            {
              key: CREATE_FORM_PANEL_KEY,
              label: t('expenses.form.title'),
              children: showCreateForm ? (
                <CreateExpenseForm
                  categories={categories}
                  onSuccess={handleFormSuccess}
                  onCancel={handleFormCancel}
                  onCategoriesReload={loadCategories}
                />
              ) : null,
            },
          ]}
        />
      )}

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
              onChange={(dates: any) => setDateRange(dates as [Dayjs, Dayjs] | null)}
              format="DD.MM.YYYY"
              style={{ width: '100%' }}
              placeholder={[t('expenses.filters.startDate'), t('expenses.filters.endDate')]}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder={t('expenses.filters.type')}
              allowClear
              value={filterCategory}
              onChange={setFilterCategory}
              style={{ width: '100%' }}
            >
              {categories.map(type => (
                <Select.Option key={type.id} value={type.id}>
                  {type.name}
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
    </section>
  );
}
