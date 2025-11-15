import { useEffect, useState } from 'react';
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
import http from '../app/http';
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

interface PaymentCard {
  id: number;
  name: string;
  number: string;
  holder_name: string;
  is_active: boolean;
  masked_number?: string;
}

export default function ExpensesPage() {
  // ========== STATE ==========
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [paymentCards, setPaymentCards] = useState<PaymentCard[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [trendData, setTrendData] = useState<ExpenseTrend[]>([]);
  const [distributionData, setDistributionData] = useState<ExpenseDistribution[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState({ pdf: false, xlsx: false });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [form] = Form.useForm();

  // Filters
  const [currency, setCurrency] = useState<'USD' | 'UZS'>('USD');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [filterType, setFilterType] = useState<number | undefined>();
  const [filterMethod, setFilterMethod] = useState<'cash' | 'card' | undefined>();
  const [filterCard, setFilterCard] = useState<number | undefined>();
  const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | undefined>();

  // ========== LOAD DATA ==========
  useEffect(() => {
    loadExpenseTypes();
    loadPaymentCards();
  }, []);

  useEffect(() => {
    loadData();
  }, [dateRange, filterType, filterMethod, filterCard, filterStatus]); // currency o'chirildi

  const loadExpenseTypes = async () => {
    try {
      const types = await fetchExpenseTypes();
      setExpenseTypes(Array.isArray(types) ? types.filter(t => t.is_active) : []);
    } catch (error) {
      console.error('Failed to load expense types:', error);
      message.error('Chiqim turlarini yuklashda xatolik');
      setExpenseTypes([]);
    }
  };

  const loadPaymentCards = async () => {
    try {
      const response = await http.get('/api/payment-cards/');
      // Array tekshiruvi - DRF paginated bo'lsa results dan olish
      const rawData = response.data;
      const dataArray = Array.isArray(rawData) 
        ? rawData 
        : (Array.isArray(rawData?.results) ? rawData.results : []);
      
      // Faqat faol kartalarni filter qilish
      const activeCards = dataArray.filter((card: PaymentCard) => card.is_active !== false);
      setPaymentCards(activeCards);
    } catch (error) {
      console.error('Failed to load payment cards:', error);
      message.error('Kartalarni yuklashda xatolik');
      setPaymentCards([]);
    }
  };

  const loadData = async () => {
    setLoading(true);
    console.log('🔄 loadData started...');
    try {
      const filters: ExpenseFilters = {
        date_from: dateRange?.[0]?.format('YYYY-MM-DD'),
        date_to: dateRange?.[1]?.format('YYYY-MM-DD'),
        type: filterType,
        method: filterMethod,
        card: filterCard,
        status: filterStatus,
      };
      console.log('📋 Filters:', filters);

      const [expensesData, statsData, trendDataResult, distributionDataResult] = await Promise.all([
        fetchExpenses(filters),
        fetchExpenseStats(),
        fetchExpenseTrend(30),
        fetchExpenseDistribution('month'),
      ]);
      
      console.log('✅ All data loaded:', {
        expenses: expensesData.length,
        stats: statsData,
        trend: trendDataResult.length,
        distribution: distributionDataResult.length,
      });

      setExpenses(Array.isArray(expensesData) ? expensesData : []);
      console.log('📝 Expenses set to state:', expensesData.length, 'items');
      
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
      message.error("Ma'lumotlarni yuklashda xatolik");
      console.error('❌ Load data error:', error);
      
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
      console.log('✅ loadData finished');
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
      message.success("Chiqim o'chirildi");
      loadData();
    } catch (error) {
      message.error("O'chirishda xatolik");
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await approveExpense(id);
      message.success('Chiqim tasdiqlandi');
      loadData();
    } catch (error) {
      message.error('Tasdiqlashda xatolik');
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
        message.success("Chiqim o'zgartirildi");
      } else {
        await createExpense(data);
        message.success('Yangi chiqim yaratildi');
      }

      setModalOpen(false);
      loadData();
    } catch (error) {
      message.error('Saqlashda xatolik');
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
        method: filterMethod,
        card: filterCard,
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
      message.success(`${format.toUpperCase()} yuklandi`);
    } catch (error) {
      message.error('Eksport qilishda xatolik');
    } finally {
      setExporting((prev) => ({ ...prev, [format]: false }));
    }
  };

  // ========== CHARTS ==========
  const trendChartData = {
    labels: trendData.map(d => dayjs(d.date).format('DD MMM')),
    datasets: [
      {
        label: `Chiqimlar (${currency})`,
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
      title: 'Sana',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
    },
    {
      title: 'Tur',
      dataIndex: 'type_name',
      key: 'type_name',
    },
    {
      title: "To'lov usuli",
      dataIndex: 'method',
      key: 'method',
      render: (method: string) => (
        <Tag color={method === 'cash' ? 'green' : 'blue'}>
          {method === 'cash' ? 'Naqd' : 'Karta'}
        </Tag>
      ),
    },
    {
      title: 'Karta',
      dataIndex: 'card_name',
      key: 'card_name',
      render: (name: string | null) => name || '-',
    },
    {
      title: 'Summa',
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
      title: 'Holat',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag
          icon={status === 'approved' ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
          color={status === 'approved' ? 'success' : 'warning'}
        >
          {status === 'approved' ? 'Tasdiqlangan' : 'Kutilmoqda'}
        </Tag>
      ),
    },
    {
      title: 'Izoh',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string | null) => desc || '-',
    },
    {
      title: 'Amallar',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <Tooltip title="Tasdiqlash">
              <Button
                type="link"
                icon={<CheckCircleOutlined />}
                onClick={() => handleApprove(record.id)}
              />
            </Tooltip>
          )}
          <Tooltip title="O'zgartirish">
            <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="Ishonchingiz komilmi?"
            onConfirm={() => handleDelete(record.id)}
            okText="Ha"
            cancelText="Yo'q"
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <section className="page-wrapper space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Title level={2}>Chiqimlar</Title>
        <Space>
          <Select value={currency} onChange={setCurrency} style={{ width: 100 }}>
            <Select.Option value="USD">USD</Select.Option>
            <Select.Option value="UZS">UZS</Select.Option>
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Yangi chiqim
          </Button>
        </Space>
      </div>

      {/* STATISTICS CARDS */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Bugun"
              value={stats ? (currency === 'USD' ? stats.today.total_usd : stats.today.total_uzs) : 0}
              suffix={currency}
              precision={2}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Hafta"
              value={stats ? (currency === 'USD' ? stats.week.total_usd : stats.week.total_uzs) : 0}
              suffix={currency}
              precision={2}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Oy"
              value={stats ? (currency === 'USD' ? stats.month.total_usd : stats.month.total_uzs) : 0}
              suffix={currency}
              precision={2}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Jami"
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
          <Card title="30 kunlik tendensiya">
            <Line data={trendChartData} options={{ responsive: true, maintainAspectRatio: true }} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Oy bo'yicha taqsimot">
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
              placeholder={['Boshlanish', 'Tugash']}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Tur"
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
              placeholder="To'lov usuli"
              allowClear
              value={filterMethod}
              onChange={setFilterMethod}
              style={{ width: '100%' }}
            >
              <Select.Option value="cash">Naqd</Select.Option>
              <Select.Option value="card">Karta</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Karta"
              allowClear
              value={filterCard}
              onChange={setFilterCard}
              style={{ width: '100%' }}
              disabled={filterMethod !== 'card'}
              notFoundContent="Kartalar topilmadi"
              showSearch
              optionFilterProp="children"
            >
              {Array.isArray(paymentCards) && paymentCards.map(card => (
                <Select.Option key={card.id} value={card.id}>
                  {card.name} {card.masked_number ? `(${card.masked_number})` : ''}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Holat"
              allowClear
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: '100%' }}
            >
              <Select.Option value="pending">Kutilmoqda</Select.Option>
              <Select.Option value="approved">Tasdiqlangan</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={2}>
            <Space>
              <Tooltip title="PDF yuklab olish">
                <Button
                  icon={<FilePdfOutlined />}
                  onClick={() => handleExport('pdf')}
                  loading={exporting.pdf}
                />
              </Tooltip>
              <Tooltip title="Excel yuklab olish">
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
        <Card bordered={false}>
          <Table
            columns={columns}
            dataSource={expenses}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `Jami: ${total}` }}
          />
        </Card>
      </div>

      {/* CREATE/EDIT MODAL */}
      <Modal
        title={editingExpense ? "Chiqimni o'zgartirish" : 'Yangi chiqim yaratish'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={600}
        okText="Saqlash"
        cancelText="Bekor qilish"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          <Form.Item name="date" label="Sana" rules={[{ required: true, message: 'Sanani tanlang' }]}>
            <DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="type" label="Tur" rules={[{ required: true, message: 'Turni tanlang' }]}>
            <Select placeholder="Tanlang">
              {expenseTypes.map(type => (
                <Select.Option key={type.id} value={type.id}>
                  {type.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="method" label="To'lov usuli" rules={[{ required: true, message: "To'lov usulini tanlang" }]}>
            <Select placeholder="Tanlang">
              <Select.Option value="cash">Naqd pul</Select.Option>
              <Select.Option value="card">Karta</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.method !== currentValues.method}
          >
            {({ getFieldValue }) =>
              getFieldValue('method') === 'card' ? (
                <Form.Item name="card" label="Karta" rules={[{ required: true, message: 'Kartani tanlang' }]}>
                  <Select 
                    placeholder="Kartani tanlang"
                    notFoundContent="Kartalar topilmadi. Iltimos, avval karta qo'shing."
                    showSearch
                    optionFilterProp="children"
                  >
                    {Array.isArray(paymentCards) && paymentCards.map(card => (
                      <Select.Option key={card.id} value={card.id}>
                        {card.name} {card.masked_number ? `(${card.masked_number})` : ''}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item name="currency" label="Valyuta" rules={[{ required: true, message: 'Valyutani tanlang' }]}>
            <Select placeholder="Tanlang">
              <Select.Option value="USD">USD</Select.Option>
              <Select.Option value="UZS">UZS</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="amount" label="Summa" rules={[{ required: true, message: 'Summani kiriting' }]}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="0.00" />
          </Form.Item>

          <Form.Item name="description" label="Izoh">
            <Input.TextArea rows={3} placeholder="Qo'shimcha ma'lumot..." />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
