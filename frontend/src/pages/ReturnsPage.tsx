import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

import http from '../app/http';
import { downloadFile } from '../utils/download';
import { formatDate, formatQuantity } from '../utils/formatters';

ChartJS.register(ArcElement, Tooltip, Legend);

interface DealerOption {
  id: number;
  name: string;
}

interface ProductOption {
  id: number;
  name: string;
}

interface ReturnRecord {
  id: number;
  dealer: number | null;
  dealer_name: string | null;
  product: number | null;
  product_name: string | null;
  quantity: string;
  return_type: 'good' | 'defective';
  reason: string | null;
  created_at: string;
}

const RETURNS_TYPE_OPTIONS = [
  { label: "Sog'lom", value: 'good' },
  { label: 'Nuqsonli', value: 'defective' },
];

const ReturnsPage = () => {
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [dealers, setDealers] = useState<DealerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState<{ good: number; defective: number }>({ good: 0, defective: 0 });
  const [form] = Form.useForm();

  const dealerOptions = useMemo(
    () => dealers.map((dealer) => ({ label: dealer.name, value: dealer.id })),
    [dealers]
  );
  const productOptions = useMemo(
    () => products.map((product) => ({ label: product.name, value: product.id })),
    [products]
  );

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const response = await http.get('/api/returns/');
      const payload = response.data;
      // Backend may return paginated { results: [...] } or direct array
      const list: ReturnRecord[] = Array.isArray(payload) ? payload : (payload.results || []);
      console.log('Returns API response:', payload);
      console.log('Extracted returns list:', list);
      setReturns(list);
      fetchStats();
    } catch (error) {
      console.error('Error fetching returns:', error);
      message.error('Qaytishlarni yuklab bo\'lmadi');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await http.get<{ good: number; defective: number }>('/api/returns/stats/');
      const payload = response.data || { good: 0, defective: 0 };
      setStats({
        good: Number(payload.good ?? 0),
        defective: Number(payload.defective ?? 0),
      });
    } catch (error) {
      console.error(error);
    }
  };

  const fetchDealers = async () => {
    try {
      const response = await http.get('/api/dealers/', { params: { limit: 'all' } });
      const payload = response.data;
      const list: DealerOption[] = Array.isArray(payload) ? payload : payload.results || [];
      setDealers(list);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await http.get('/api/products/', { params: { limit: 'all' } });
      const payload = response.data;
      const list: ProductOption[] = Array.isArray(payload) ? payload : payload.results || [];
      setProducts(list);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchReturns();
    fetchDealers();
    fetchProducts();
    fetchStats();
  }, []);

  const handleSubmit = async (values: { dealer: number; product: number; quantity: number; return_type: string; reason?: string }) => {
    setSubmitting(true);
    try {
      await http.post('/api/returns/', values);
      message.success('Qaytish muvaffaqiyatli qo\'shildi');
      setModalOpen(false);
      form.resetFields();
      fetchReturns();
      fetchStats();
    } catch (error) {
      console.error(error);
      message.error('Qaytish qo\'shishda xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportPdf = () => {
      downloadFile('/api/returns/export/pdf/', 'returns_report.pdf');
  };

  const handleExportExcel = () => {
      downloadFile('/api/returns/export/excel/', 'returns.xlsx');
  };

  const chartData = useMemo(() => {
    const values = [stats.good, stats.defective];
    return {
      labels: ["Sog'lom", 'Nuqsonli'],
      datasets: [
        {
          data: values,
          backgroundColor: ['#10b981', '#f87171'],
          borderColor: ['#065f46', '#b91c1c'],
          borderWidth: 1,
        },
      ],
    };
  }, [stats]);

  const chartOptions = useMemo(
    () => ({
      plugins: {
        legend: {
          position: 'bottom' as const,
        },
      },
    }),
    []
  );

  const columns: ColumnsType<ReturnRecord> = [
    {
      title: 'Diler',
      dataIndex: 'dealer_name',
      render: (value: string | null) => value || '—',
    },
    {
      title: 'Mahsulot',
      dataIndex: 'product_name',
      render: (value: string | null) => value || '—',
    },
    {
      title: 'Miqdor',
      dataIndex: 'quantity',
      render: (value: string) => formatQuantity(value),
    },
    {
      title: 'Turi',
      dataIndex: 'return_type',
      render: (value: ReturnRecord['return_type']) => (
        <Tag color={value === 'defective' ? 'red' : 'green'}>
          {value === 'defective' ? 'Nuqsonli' : "Sog'lom"}
        </Tag>
      ),
    },
    {
      title: 'Sabab',
      dataIndex: 'reason',
      render: (value: string | null) => value || '—',
    },
    {
      title: 'Sana',
      dataIndex: 'created_at',
      render: (value: string) => formatDate(value),
    },
  ];

  return (
    <Card
      title="↩️ Qaytishlar"
      className="rounded-2xl border border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      extra={
        <Space>
          <Button onClick={handleExportPdf}>PDF</Button>
          <Button onClick={handleExportExcel}>Excel</Button>
          <Button type="primary" onClick={() => setModalOpen(true)}>
            Yangi qaytish
          </Button>
        </Space>
      }
    >
      <div className="mb-6 grid gap-4 md:grid-cols-[1fr,320px]">
        <Table<ReturnRecord>
          rowKey="id"
          columns={columns}
          dataSource={returns}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
        <Card
          title="Qaytishlar statistikasi"
          className="border border-slate-200 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          bodyStyle={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 260 }}
        >
          {stats.good === 0 && stats.defective === 0 ? (
            <div className="text-center text-sm text-slate-500 dark:text-slate-300">Ma'lumot mavjud emas</div>
          ) : (
            <Doughnut data={chartData} options={chartOptions} />
          )}
        </Card>
      </div>

      <Modal
        title="Yangi qaytish qo'shish"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        okText="Saqlash"
        cancelText="Bekor qilish"
        confirmLoading={submitting}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form layout="vertical" form={form} onFinish={handleSubmit}>
          <Form.Item name="dealer" label="Diler" rules={[{ required: true, message: 'Diler tanlang' }]}>
            <Select
              showSearch
              placeholder="Dilerni tanlang"
              options={dealerOptions}
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="product" label="Mahsulot" rules={[{ required: true, message: 'Mahsulot tanlang' }]}>
            <Select
              showSearch
              placeholder="Mahsulotni tanlang"
              options={productOptions}
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="quantity" label="Miqdor" rules={[{ required: true, message: 'Miqdor kiriting' }]}>
            <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} placeholder="0.00" />
          </Form.Item>
          <Form.Item name="return_type" label="Qaytish turi" initialValue="good">
            <Select options={RETURNS_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="reason" label="Sabab">
            <Input.TextArea rows={2} placeholder="Qo'shimcha izoh (ixtiyoriy)" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ReturnsPage;
