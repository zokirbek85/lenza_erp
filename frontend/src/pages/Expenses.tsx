import { useEffect, useState } from 'react';
import { Table, Card, Button, Modal, Form, Input, Select, DatePicker, InputNumber, Typography, Space, message, Divider, Row, Col } from 'antd';
import { PlusOutlined, FilePdfOutlined, FileExcelOutlined, LineChartOutlined, PieChartOutlined } from '@ant-design/icons';
import { Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  Filler,
  ArcElement
} from 'chart.js';
import http from '../app/http';
import dayjs from 'dayjs';
import { useAuthStore } from '../auth/useAuthStore';
import { downloadFile } from '../utils/download';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTitle,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

interface ExpenseType { id: number; name: string; is_active: boolean }
interface PaymentCard { id: number; name: string }
interface Expense {
  id: number;
  date: string;
  type: number;
  type_name?: string;
  method: 'naqd' | 'karta';
  card?: number | null;
  card_name?: string | null;
  currency: 'USD' | 'UZS';
  amount: number;
  comment?: string;
  status: 'yaratilgan' | 'tasdiqlangan';
}

interface ExpenseStats {
  today?: number;
  week?: number;
  month?: number;
  rate?: number;
}

export default function ExpensesPage() {
  const [data, setData] = useState<Expense[]>([]);
  const [types, setTypes] = useState<ExpenseType[]>([]);
  const [cards, setCards] = useState<PaymentCard[]>([]);
  const [stats, setStats] = useState<ExpenseStats>({});
  const [trendData, setTrendData] = useState<Array<{ date: string; total_usd: number }>>([]);
  const [trendTotal, setTrendTotal] = useState<number>(0);
  const [distributionData, setDistributionData] = useState<Array<{ type: string; amount_usd: number; percent: number }>>([]);
  const [open, setOpen] = useState(false);
  const [openTypeModal, setOpenTypeModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<Expense>();
  const [typeForm] = Form.useForm<{ name: string }>();
  const { role } = useAuthStore();

  const canWrite = role === 'admin' || role === 'accountant';

  const [filter, setFilter] = useState<{ type?: number | null; method?: 'naqd' | 'karta' | null; range?: [dayjs.Dayjs, dayjs.Dayjs] | null }>({});
  
  // Trend filters state
  const [trendFilters, setTrendFilters] = useState<{
    type?: number | null;
    method?: 'naqd' | 'karta' | null;
    currency?: 'USD' | 'UZS' | null;
    range?: [dayjs.Dayjs, dayjs.Dayjs] | null;
  }>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filter.type) params.type = filter.type;
      if (filter.method) params.method = filter.method;
      if (filter.range && filter.range.length === 2) {
        params['date__gte'] = filter.range[0].format('YYYY-MM-DD');
        params['date__lte'] = filter.range[1].format('YYYY-MM-DD');
      }
      const [res, typ, card, stat] = await Promise.all([
        http.get('/api/expenses/', { params }),
        http.get('/api/expense-types/'),
        http.get('/api/payment-cards/', { params: { is_active: true } }),
        http.get('/api/expenses/stats/'),
      ]);
      setData(res.data?.results ?? res.data ?? []);
      setTypes(typ.data?.results ?? typ.data ?? []);
      setCards(card.data?.results ?? card.data ?? []);
      setStats(stat.data ?? {});
    } catch (e) {
      console.error(e);
      message.error("Ma'lumotlarni olishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
    fetchTrendData();
    fetchDistributionData();
  }, []);

  const fetchTrendData = async () => {
    try {
      const params: any = {};
      
      // Apply trend filters
      if (trendFilters.type) params.type = trendFilters.type;
      if (trendFilters.method) params.method = trendFilters.method;
      if (trendFilters.currency) params.currency = trendFilters.currency;
      if (trendFilters.range && trendFilters.range.length === 2) {
        params.start_date = trendFilters.range[0].format('YYYY-MM-DD');
        params.end_date = trendFilters.range[1].format('YYYY-MM-DD');
      }
      
      const res = await http.get('/api/expenses/trend/', { params });
      setTrendData(res.data.data || []);
      setTrendTotal(res.data.total_usd || 0);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDistributionData = async () => {
    try {
      const res = await http.get('/api/expenses/distribution/');
      setDistributionData(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Chart configuration
  const chartData = {
    labels: trendData.map(d => d.date),
    datasets: [
      {
        label: 'Xarajatlar (USD)',
        data: trendData.map(d => d.total_usd),
        borderColor: '#f87171',
        backgroundColor: 'rgba(248, 113, 113, 0.1)',
        fill: true,
        tension: 0.35,
        pointRadius: 2,
        pointHoverRadius: 5,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function(context: any) {
            return `Xarajatlar: $${Number(context.parsed.y || 0).toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
        }
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          callback: function(value: any) {
            return '$' + Number(value || 0).toFixed(0);
          }
        }
      }
    }
  };

  // Pie chart configuration for distribution
  const pieChartData = {
    labels: distributionData.map(d => d.type),
    datasets: [
      {
        label: 'Xarajatlar (USD)',
        data: distributionData.map(d => d.amount_usd),
        backgroundColor: [
          '#3b82f6', // Blue
          '#10b981', // Green
          '#f59e0b', // Amber
          '#ef4444', // Red
          '#8b5cf6', // Purple
          '#06b6d4', // Cyan
          '#ec4899', // Pink
          '#14b8a6', // Teal
        ],
        hoverOffset: 8,
        borderWidth: 2,
        borderColor: '#fff',
      }
    ]
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const data = distributionData[context.dataIndex];
            return `${data.type}: $${data.amount_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${data.percent}%)`;
          }
        }
      }
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const payload = {
        ...values,
        date: values.date ? values.date.format('YYYY-MM-DD') : undefined,
      };
      await http.post('/api/expenses/', payload);
      message.success('Chiqim yozildi');
      setOpen(false);
      form.resetFields();
      fetchData();
    } catch (e) {
      console.error(e);
      message.error("Saqlashda xatolik");
    }
  };

  const handleCreateType = async () => {
    try {
      const values = await typeForm.validateFields();
      const res = await http.post('/api/expense-types/', { name: values.name, is_active: true });
      const created = res.data;
      setTypes((prev) => [...prev, created]);
      // Prefer setting into the expense form if open, else set as active filter
      if (open) {
        form.setFieldsValue({ type: created.id });
      } else {
        setFilter((f) => ({ ...f, type: created.id }));
      }
      setOpenTypeModal(false);
      typeForm.resetFields();
      message.success("Chiqim turi qo'shildi");
    } catch (e: any) {
      if (e?.errorFields) return; // form validation error
      console.error(e);
      message.error("Chiqim turini qo'shishda xatolik");
    }
  };

  const buildExportQuery = () => {
    const q: string[] = [];
    if (filter.type) q.push(`type=${filter.type}`);
    if (filter.method) q.push(`method=${filter.method}`);
    if (filter.range && filter.range.length === 2) {
      q.push(`from=${filter.range[0].format('YYYY-MM-DD')}`);
      q.push(`to=${filter.range[1].format('YYYY-MM-DD')}`);
    }
    return q.length ? `?${q.join('&')}` : '';
  };
  const handleExportPdf = async () => {
    await downloadFile(`/api/expenses/export/${buildExportQuery()}${buildExportQuery() ? '&' : '?'}format=pdf`, 'chiqimlar.pdf');
  };
  const handleExportExcel = async () => {
    await downloadFile(`/api/expenses/export/${buildExportQuery()}${buildExportQuery() ? '&' : '?'}format=xlsx`, 'chiqimlar.xlsx');
  };

  const handleStatusChange = async (expenseId: number, newStatus: 'yaratilgan' | 'tasdiqlangan') => {
    try {
      await http.post(`/api/expenses/${expenseId}/update-status/`, { status: newStatus });
      message.success('Holat o\'zgartirildi');
      fetchData();
    } catch (e) {
      console.error(e);
      message.error('Holatni o\'zgartirishda xatolik');
    }
  };

  return (
    <Card
      title="💸 Chiqimlar"
      extra={
        <Space>
          <Space direction="vertical" size={0} align="end">
            <Typography.Text strong>
              Bugun: ${(stats.today ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | 
              Haftalik: ${(stats.week ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | 
              Oylik: ${(stats.month ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography.Text>
            {stats.rate && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Kurs: 1 USD = {stats.rate.toLocaleString('en-US')} so'm
              </Typography.Text>
            )}
          </Space>
          <Button icon={<FilePdfOutlined />} onClick={handleExportPdf}>PDF</Button>
          <Button icon={<FileExcelOutlined />} onClick={handleExportExcel}>Excel</Button>
          {canWrite && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
              Yangi chiqim
            </Button>
          )}
        </Space>
      }
      loading={loading}
      bordered={false}
      style={{ borderRadius: 12 }}
    >
      <Space style={{ marginBottom: 12 }} wrap>
        <Select
          placeholder="Turi"
          allowClear
          style={{ width: 200 }}
          options={types.map((t) => ({ value: t.id, label: t.name }))}
          value={filter.type ?? null}
          onChange={(val) => setFilter((f) => ({ ...f, type: val ?? null }))}
        />
        {types.length === 0 && role === 'admin' && (
          <Button size="small" icon={<PlusOutlined />} onClick={() => setOpenTypeModal(true)}>
            Turi qo'shish
          </Button>
        )}
        <Select
          placeholder="Usul"
          allowClear
          style={{ width: 160 }}
          options={[{ value: 'naqd', label: 'Naqd' }, { value: 'karta', label: 'Karta' }]}
          value={filter.method ?? null}
          onChange={(val) => setFilter((f) => ({ ...f, method: (val as any) ?? null }))}
        />
        <DatePicker.RangePicker
          value={filter.range as any}
          onChange={(rng) => setFilter((f) => ({ ...f, range: (rng as any) ?? null }))}
        />
        <Button onClick={fetchData}>Filtrlash</Button>
        <Button onClick={() => { setFilter({}); fetchData(); }}>
          Tozalash
        </Button>
      </Space>

      {/* Expense Trend Chart */}
      <Divider orientation="left">
        <Space>
          <LineChartOutlined />
          Expense Trend
        </Space>
      </Divider>

      {/* Trend Filters */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="Turi"
          allowClear
          style={{ width: 180 }}
          options={types.map((t) => ({ value: t.id, label: t.name }))}
          value={trendFilters.type ?? null}
          onChange={(val) => setTrendFilters((f) => ({ ...f, type: val ?? null }))}
        />
        <Select
          placeholder="Usul"
          allowClear
          style={{ width: 140 }}
          options={[
            { value: 'naqd', label: '💵 Naqd' },
            { value: 'karta', label: '💳 Karta' },
          ]}
          value={trendFilters.method ?? null}
          onChange={(val) => setTrendFilters((f) => ({ ...f, method: (val as any) ?? null }))}
        />
        <Select
          placeholder="Valyuta"
          allowClear
          style={{ width: 120 }}
          options={[
            { value: 'USD', label: '💵 USD' },
            { value: 'UZS', label: '💸 UZS' },
          ]}
          value={trendFilters.currency ?? null}
          onChange={(val) => setTrendFilters((f) => ({ ...f, currency: (val as any) ?? null }))}
        />
        <DatePicker.RangePicker
          placeholder={['Boshlanish', 'Tugash']}
          format="DD.MM.YYYY"
          value={trendFilters.range as any}
          onChange={(rng) => setTrendFilters((f) => ({ ...f, range: (rng as any) ?? null }))}
        />
        <Button type="primary" onClick={fetchTrendData}>
          Filtrlash
        </Button>
        <Button 
          onClick={() => { 
            setTrendFilters({}); 
            setTimeout(fetchTrendData, 100);
          }}
        >
          Tozalash
        </Button>
        {trendTotal > 0 && (
          <Typography.Text strong style={{ marginLeft: 8 }}>
            Jami: ${trendTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Typography.Text>
        )}
      </Space>
      
      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <div style={{ height: 280, marginBottom: 24 }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </Col>
        
        <Col xs={24} lg={8}>
          <Divider orientation="left">
            <Space>
              <PieChartOutlined />
              Expense Distribution (So'nggi 30 kun)
            </Space>
          </Divider>
          <div style={{ height: 280, marginBottom: 24 }}>
            <Pie data={pieChartData} options={pieChartOptions} />
          </div>
        </Col>
      </Row>

      <Table
        rowKey="id"
        dataSource={data}
        columns={[
          { title: 'Sana', dataIndex: 'date', render: (v: string) => dayjs(v).format('DD.MM.YYYY') },
          { title: 'Turi', dataIndex: 'type_name' },
          { title: 'Usul', dataIndex: 'method' },
          { title: 'Karta', dataIndex: 'card_name' },
          { title: 'Valyuta', dataIndex: 'currency' },
          { title: 'Miqdor', dataIndex: 'amount' },
          { title: 'Izoh', dataIndex: 'comment' },
          {
            title: 'Holat',
            dataIndex: 'status',
            render: (status: 'yaratilgan' | 'tasdiqlangan', record: Expense) =>
              canWrite ? (
                <Select
                  value={status}
                  style={{ width: 140 }}
                  onChange={(val) => handleStatusChange(record.id, val)}
                  options={[
                    { value: 'yaratilgan', label: 'Yaratilgan' },
                    { value: 'tasdiqlangan', label: 'Tasdiqlangan' },
                  ]}
                />
              ) : (
                status
              ),
          },
        ]}
        pagination={{ pageSize: 25 }}
      />

      <Modal
        open={open}
        title="Yangi chiqim"
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        okText="Saqlash"
        destroyOnClose
      >
        <Form layout="vertical" form={form} onFinish={handleSubmit}>
          <Form.Item name="date" label="Sana">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="type"
            label={
              <Space>
                Turi
                {types.length === 0 && role === 'admin' && (
                  <Button size="small" type="link" icon={<PlusOutlined />} onClick={() => setOpenTypeModal(true)}>
                    qo'shish
                  </Button>
                )}
              </Space>
            }
            rules={[{ required: true }] }
          >
            <Select options={types.map((t) => ({ value: t.id, label: t.name }))} showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item name="method" label="To‘lov usuli" rules={[{ required: true }] }>
            <Select options={[{ value: 'naqd', label: 'Naqd' }, { value: 'karta', label: 'Karta' }]} />
          </Form.Item>
          <Form.Item shouldUpdate noStyle>
            {() => (
              <Form.Item name="card" label="Karta" rules={form.getFieldValue('method') === 'karta' ? [{ required: true }] : []}>
                <Select allowClear options={cards.map((c) => ({ value: c.id, label: c.name }))} placeholder="Karta faqat 'karta' usulida" />
              </Form.Item>
            )}
          </Form.Item>
          <Form.Item name="currency" label="Valyuta" rules={[{ required: true }]}>
            <Select options={[{ value: 'USD', label: 'USD' }, { value: 'UZS', label: 'UZS' }]} />
          </Form.Item>
          <Form.Item name="amount" label="Miqdor" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="comment" label="Izoh">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={openTypeModal}
        title="Chiqim turi qo'shish"
        onCancel={() => setOpenTypeModal(false)}
        onOk={handleCreateType}
        okText="Saqlash"
        destroyOnClose
      >
        <Form layout="vertical" form={typeForm}>
          <Form.Item name="name" label="Nomi" rules={[{ required: true, message: 'Nomini kiriting' }]}>
            <Input placeholder="Masalan: Ijara, Uskuna ta’miri..." />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
