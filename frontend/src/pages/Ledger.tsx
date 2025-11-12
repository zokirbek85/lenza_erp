import { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Select, DatePicker, Modal, Form, InputNumber, Input, message, Badge, Row, Col, Statistic, Typography, Descriptions, Tag, Divider } from 'antd';
import { PlusOutlined, DollarOutlined, BankOutlined, CreditCardOutlined, FilePdfOutlined, FileExcelOutlined, EyeOutlined, CheckCircleOutlined, LineChartOutlined } from '@ant-design/icons';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import http from '../app/http';
import dayjs, { Dayjs } from 'dayjs';
import { useAuthStore } from '../auth/useAuthStore';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTitle,
  Tooltip,
  Legend,
  Filler
);

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

interface LedgerAccount {
  id: number;
  name: string;
  type: 'cash' | 'bank' | 'card';
  currency: string;
  balance_usd: number;
  balance_uzs: number;
  card_name?: string | null;
}

interface BalanceResponse {
  rate: number;
  total_balance: number;
  cash_balance: number;
  bank_balance: number;
  card_balance: number;
  accounts: LedgerAccount[];
}

interface LedgerEntry {
  id: number;
  account: number;
  account_name: string;
  kind: 'payment_in' | 'expense_out' | 'adjustment';
  ref_app: string;
  ref_id: string;
  date: string;
  currency: string;
  amount: number;
  amount_usd: number;
  note: string;
  reconciled: boolean;
  reconciled_at?: string | null;
  reconciled_by?: number | null;
  reconciled_by_name?: string | null;
  created_by: number;
  created_by_name?: string;
}

export default function LedgerPage() {
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [balanceData, setBalanceData] = useState<BalanceResponse | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [detailModal, setDetailModal] = useState<{ visible: boolean; data: any; type: 'payment' | 'expense' | null }>({ 
    visible: false, 
    data: null, 
    type: null 
  });
  const [flowData, setFlowData] = useState<Array<{ date: string; balance_usd: number }>>([]);
  const [form] = Form.useForm();
  const { role } = useAuthStore();

  const canWrite = role === 'admin' || role === 'accountant';

  const [filters, setFilters] = useState<{
    account?: number | null;
    range?: [Dayjs, Dayjs] | null;
  }>({});

  const fetchAccounts = async () => {
    try {
      const res = await http.get('/api/ledger-accounts/balances/');
      setBalanceData(res.data);
      setAccounts(res.data.accounts ?? []);
    } catch (e) {
      console.error(e);
      message.error("Hisoblarni olishda xatolik");
    }
  };

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filters.account) params.account = filters.account;
      if (filters.range && filters.range.length === 2) {
        params.from = filters.range[0].format('YYYY-MM-DD');
        params.to = filters.range[1].format('YYYY-MM-DD');
      }
      const res = await http.get('/api/ledger-entries/', { params });
      setEntries(res.data?.results ?? res.data ?? []);
    } catch (e) {
      console.error(e);
      message.error("Yozuvlarni olishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchEntries();
    fetchFlowData();
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [filters]);

  const fetchFlowData = async () => {
    try {
      const res = await http.get('/api/ledger-entries/flow/?days=30');
      setFlowData(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  // Chart configuration
  const chartData = {
    labels: flowData.map(d => d.date),
    datasets: [
      {
        label: 'Balans (USD)',
        data: flowData.map(d => d.balance_usd),
        borderColor: '#4ade80',
        backgroundColor: 'rgba(74, 222, 128, 0.1)',
        fill: true,
        tension: 0.3,
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
            return `Balans: $${Number(context.parsed.y || 0).toFixed(2)}`;
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

  const handleAccountClick = (accountId: number) => {
    setSelectedAccount(accountId);
    setFilters((f) => ({ ...f, account: accountId }));
  };

  const handleAdjustment = async (values: any) => {
    try {
      await http.post('/api/ledger-entries/adjustment/', {
        account: values.account,
        amount: values.amount,
        currency: values.currency,
        note: values.note || 'Qo\'lda sozlash',
        date: values.date ? values.date.format('YYYY-MM-DD') : undefined,
      });
      message.success('Sozlash qo\'shildi');
      setAdjustmentOpen(false);
      form.resetFields();
      fetchAccounts();
      fetchEntries();
    } catch (e) {
      console.error(e);
      message.error('Sozlashda xatolik');
    }
  };

  const handleRefClick = async (refApp: string, refId: string) => {
    if (!refApp || !refId) return;
    
    try {
      if (refApp === 'payments') {
        const res = await http.get(`/api/payments/${refId}/`);
        setDetailModal({ visible: true, data: res.data, type: 'payment' });
      } else if (refApp === 'expenses') {
        const res = await http.get(`/api/expenses/${refId}/`);
        setDetailModal({ visible: true, data: res.data, type: 'expense' });
      }
    } catch (e) {
      console.error(e);
      message.error('Tafsilotlarni olishda xatolik');
    }
  };

  const handleReconcile = async (entryId: number) => {
    try {
      await http.post(`/api/ledger-entries/${entryId}/reconcile/`);
      message.success('Yozuv muvofiqlashtirildi');
      fetchEntries();
    } catch (e) {
      console.error(e);
      message.error('Muvofiqlashtirish xatolik');
    }
  };

  const handleUnreconcile = async (entryId: number) => {
    try {
      await http.post(`/api/ledger-entries/${entryId}/unreconcile/`);
      message.success('Muvofiqlashtirish bekor qilindi');
      fetchEntries();
    } catch (e) {
      console.error(e);
      message.error('Bekor qilish xatolik');
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'cash':
        return <DollarOutlined style={{ fontSize: 20, color: '#52c41a' }} />;
      case 'bank':
        return <BankOutlined style={{ fontSize: 20, color: '#1890ff' }} />;
      case 'card':
        return <CreditCardOutlined style={{ fontSize: 20, color: '#722ed1' }} />;
      default:
        return null;
    }
  };

  const getKindBadge = (kind: string) => {
    switch (kind) {
      case 'payment_in':
        return <Badge status="success" text="Kirim" />;
      case 'expense_out':
        return <Badge status="error" text="Chiqim" />;
      case 'adjustment':
        return <Badge status="processing" text="Sozlash" />;
      default:
        return kind;
    }
  };

  const totalBalance = balanceData?.total_balance ?? 0;
  const currentRate = balanceData?.rate ?? 12500;

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card bordered={false}>
            <Space style={{ width: '100%', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Space direction="vertical" size={0}>
                <Title level={4} style={{ margin: 0 }}>💼 Kassa balans</Title>
                {balanceData && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Kurs: 1 USD = {Number(currentRate || 0).toLocaleString('en-US')} so'm
                  </Text>
                )}
              </Space>
              <Space direction="vertical" size={0} align="end">
                <Statistic
                  title="Umumiy balans (USD)"
                  value={Number(totalBalance || 0).toFixed(2)}
                  prefix="$"
                  valueStyle={{ color: totalBalance >= 0 ? '#3f8600' : '#cf1322', fontSize: 24 }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ≈ {(Number(totalBalance || 0) * Number(currentRate || 0)).toLocaleString('en-US', { maximumFractionDigits: 0 })} so'm
                </Text>
              </Space>
            </Space>
          </Card>
        </Col>

        {/* Accounts Panel */}
        <Col xs={24} md={8}>
          <Card
            title="Hisoblar"
            bordered={false}
            style={{ minHeight: 400 }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {accounts.map((acc) => (
                <Card
                  key={acc.id}
                  size="small"
                  hoverable
                  onClick={() => handleAccountClick(acc.id)}
                  style={{
                    border: selectedAccount === acc.id ? '2px solid #1890ff' : '1px solid #d9d9d9',
                    cursor: 'pointer',
                  }}
                >
                  <Space direction="vertical" style={{ width: '100%' }} size={2}>
                    <Space>
                      {getAccountIcon(acc.type)}
                      <Text strong>{acc.name}</Text>
                    </Space>
                    {acc.card_name && <Text type="secondary" style={{ fontSize: 12 }}>{acc.card_name}</Text>}
                    <Statistic
                      value={Number(acc.balance_usd || 0).toFixed(2)}
                      prefix="$"
                      valueStyle={{
                        fontSize: 18,
                        color: (acc.balance_usd || 0) >= 0 ? '#3f8600' : '#cf1322',
                      }}
                    />
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      ≈ {Number(acc.balance_uzs || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} so'm
                    </Text>
                  </Space>
                </Card>
              ))}
            </Space>
          </Card>
        </Col>

        {/* Entries Table */}
        <Col xs={24} md={16}>
          <Card
            title={
              <Space>
                <span>Tarix</span>
                <Badge 
                  count={entries.filter(e => !e.reconciled).length}
                  showZero
                  style={{ backgroundColor: '#faad14' }}
                  title="Muvofiqlashtirilmagan yozuvlar"
                />
              </Space>
            }
            bordered={false}
            extra={
              <Space>
                {canWrite && (
                  <>
                    <Button
                      icon={<CheckCircleOutlined />}
                      onClick={() => setReconcileOpen(true)}
                    >
                      Muvofiqlashtirish
                    </Button>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setAdjustmentOpen(true)}
                    >
                      Sozlash
                    </Button>
                  </>
                )}
              </Space>
            }
          >
            <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
              <Space wrap>
                <Select
                  placeholder="Hisob"
                  allowClear
                  style={{ width: 200 }}
                  value={filters.account}
                  onChange={(val) => setFilters((f) => ({ ...f, account: val ?? null }))}
                  options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                />
                <RangePicker
                  value={filters.range as any}
                  onChange={(rng) => setFilters((f) => ({ ...f, range: (rng as any) ?? null }))}
                />
                <Button
                  onClick={() => {
                    setFilters({});
                    setSelectedAccount(null);
                  }}
                >
                  Tozalash
                </Button>
              </Space>
              <Space>
                <Button
                  icon={<FilePdfOutlined />}
                  onClick={() => {
                    const params = new URLSearchParams();
                    if (filters.account) params.append('account', filters.account.toString());
                    if (filters.range?.[0]) params.append('from', filters.range[0].format('YYYY-MM-DD'));
                    if (filters.range?.[1]) params.append('to', filters.range[1].format('YYYY-MM-DD'));
                    window.open(`/api/ledger/report/pdf/?${params.toString()}`, '_blank');
                  }}
                >
                  PDF
                </Button>
                <Button
                  icon={<FileExcelOutlined />}
                  onClick={() => {
                    const params = new URLSearchParams();
                    if (filters.account) params.append('account', filters.account.toString());
                    if (filters.range?.[0]) params.append('from', filters.range[0].format('YYYY-MM-DD'));
                    if (filters.range?.[1]) params.append('to', filters.range[1].format('YYYY-MM-DD'));
                    window.open(`/api/ledger/export/excel/?${params.toString()}`, '_blank');
                  }}
                >
                  Excel
                </Button>
              </Space>
            </Space>

            <Table
              rowKey="id"
              dataSource={entries}
              loading={loading}
              columns={[
                {
                  title: 'Sana',
                  dataIndex: 'date',
                  render: (v: string) => dayjs(v).format('DD.MM.YYYY'),
                  width: 110,
                },
                {
                  title: 'Hisob',
                  dataIndex: 'account_name',
                  width: 150,
                },
                {
                  title: 'Tur',
                  dataIndex: 'kind',
                  render: (kind: string) => getKindBadge(kind),
                  width: 120,
                },
                {
                  title: 'Miqdor',
                  dataIndex: 'amount',
                  render: (amount: number, record: LedgerEntry) => {
                    const amt = Number(amount || 0);
                    return (
                      <Space direction="vertical" size={0}>
                        <span style={{ color: amt >= 0 ? '#3f8600' : '#cf1322', fontWeight: 'bold' }}>
                          {amt >= 0 ? '+' : ''}{amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {record.currency}
                        </span>
                        {record.currency === 'UZS' && (
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            ≈ ${Number(record.amount_usd || 0).toFixed(2)}
                          </Text>
                        )}
                      </Space>
                    );
                  },
                  width: 150,
                },
                {
                  title: 'USD Ekvivalent',
                  dataIndex: 'amount_usd',
                  render: (val: number) => {
                    const usd = Number(val || 0);
                    return (
                      <span style={{ color: usd >= 0 ? '#3f8600' : '#cf1322', fontWeight: 'bold' }}>
                        ${usd >= 0 ? '+' : ''}{Math.abs(usd).toFixed(2)}
                      </span>
                    );
                  },
                  width: 130,
                },
                {
                  title: 'Izoh',
                  dataIndex: 'note',
                  ellipsis: true,
                },
                {
                  title: 'Ref',
                  dataIndex: 'ref_app',
                  render: (app: string, record: LedgerEntry) => {
                    if (!app || !record.ref_id) return '-';
                    return (
                      <Button 
                        type="link" 
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handleRefClick(app, record.ref_id)}
                      >
                        {app} #{record.ref_id}
                      </Button>
                    );
                  },
                  width: 140,
                },
                {
                  title: 'Status',
                  dataIndex: 'reconciled',
                  render: (reconciled: boolean) => (
                    <Tag color={reconciled ? 'success' : 'default'}>
                      {reconciled ? '✓ Muvofiqlashgan' : 'Kutilmoqda'}
                    </Tag>
                  ),
                  width: 140,
                },
                ...(canWrite ? [{
                  title: 'Amallar',
                  key: 'actions',
                  render: (_: any, record: LedgerEntry) => (
                    <Space size="small">
                      {!record.reconciled ? (
                        <Button 
                          size="small"
                          type="link"
                          onClick={() => handleReconcile(record.id)}
                        >
                          Muvofiqlashtirish
                        </Button>
                      ) : (
                        <Button 
                          size="small"
                          type="link"
                          danger
                          onClick={() => handleUnreconcile(record.id)}
                        >
                          Bekor qilish
                        </Button>
                      )}
                    </Space>
                  ),
                  width: 150,
                }] : []),
              ]}
              pagination={{ pageSize: 20 }}
              scroll={{ x: 1200 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Cash Flow Chart */}
      <Divider orientation="left">
        <Space>
          <LineChartOutlined />
          Cash Flow Trend (So'nggi 30 kun)
        </Space>
      </Divider>
      
      <Card bordered={false} style={{ marginTop: 16 }}>
        <div style={{ height: 300 }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </Card>

      {/* Adjustment Modal */}
      <Modal
        open={adjustmentOpen}
        title="Qo'lda sozlash"
        onCancel={() => setAdjustmentOpen(false)}
        onOk={() => form.submit()}
        okText="Saqlash"
        destroyOnClose
      >
        <Form layout="vertical" form={form} onFinish={handleAdjustment}>
          <Form.Item name="account" label="Hisob" rules={[{ required: true, message: 'Hisobni tanlang' }]}>
            <Select
              placeholder="Hisob tanlang"
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            />
          </Form.Item>
          <Form.Item
            name="amount"
            label="Miqdor (+kirim / -chiqim)"
            rules={[{ required: true, message: 'Miqdorni kiriting' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Masalan: +1000 yoki -500"
            />
          </Form.Item>
          <Form.Item name="currency" label="Valyuta" rules={[{ required: true, message: 'Valyutani tanlang' }]}>
            <Select
              options={[
                { value: 'USD', label: 'USD' },
                { value: 'UZS', label: 'UZS' },
              ]}
            />
          </Form.Item>
          <Form.Item name="note" label="Izoh">
            <Input.TextArea rows={3} placeholder="Opening balance, tuzatish, va h.k." />
          </Form.Item>
          <Form.Item name="date" label="Sana">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Transaction Detail Modal */}
      <Modal
        open={detailModal.visible}
        title={detailModal.type === 'payment' ? 'To\'lov tafsilotlari' : 'Chiqim tafsilotlari'}
        onCancel={() => setDetailModal({ visible: false, data: null, type: null })}
        footer={[
          <Button key="close" onClick={() => setDetailModal({ visible: false, data: null, type: null })}>
            Yopish
          </Button>
        ]}
        width={700}
      >
        {detailModal.data && detailModal.type === 'payment' && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="ID">{detailModal.data.id}</Descriptions.Item>
            <Descriptions.Item label="Sana">{dayjs(detailModal.data.date).format('DD.MM.YYYY')}</Descriptions.Item>
            <Descriptions.Item label="Diler">{detailModal.data.dealer_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Summa">
              <Tag color={detailModal.data.amount >= 0 ? 'green' : 'red'}>
                {detailModal.data.amount} {detailModal.data.currency}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="USD">
              <Tag color="blue">${Number(detailModal.data.amount_usd || 0).toFixed(2)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Usul">
              <Tag>{detailModal.data.method === 'naqd' ? '💵 Naqd' : detailModal.data.method === 'karta' ? '💳 Karta' : '🏦 Bank'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={detailModal.data.status === 'tasdiqlangan' ? 'success' : 'default'}>
                {detailModal.data.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Yaratgan">{detailModal.data.created_by_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Izoh" span={2}>{detailModal.data.note || '-'}</Descriptions.Item>
          </Descriptions>
        )}
        {detailModal.data && detailModal.type === 'expense' && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="ID">{detailModal.data.id}</Descriptions.Item>
            <Descriptions.Item label="Sana">{dayjs(detailModal.data.date).format('DD.MM.YYYY')}</Descriptions.Item>
            <Descriptions.Item label="Turi">{detailModal.data.expense_type_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Summa">
              <Tag color="red">{detailModal.data.amount} {detailModal.data.currency}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="USD">
              <Tag color="blue">${Number(detailModal.data.amount_usd || 0).toFixed(2)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="To'lov usuli">
              <Tag>{detailModal.data.payment_method === 'naqd' ? '💵 Naqd' : detailModal.data.payment_method === 'karta' ? '💳 Karta' : '🏦 Bank'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={detailModal.data.status === 'tasdiqlangan' ? 'success' : 'warning'}>
                {detailModal.data.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Yaratgan">{detailModal.data.created_by_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Tafsilot" span={2}>{detailModal.data.description || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Bank Reconciliation Modal */}
      <Modal
        open={reconcileOpen}
        title="Bank muvofiqlashtirish"
        onCancel={() => setReconcileOpen(false)}
        footer={[
          <Button key="close" onClick={() => setReconcileOpen(false)}>
            Yopish
          </Button>
        ]}
        width={1000}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            Quyida bank hisobidan bo'lgan muvofiqlashtirilmagan yozuvlar ko'rsatilgan. 
            Bank balansingiz bilan taqqoslang va tasdiqlang.
          </Text>
        </div>
        <Table
          rowKey="id"
          dataSource={entries.filter(e => !e.reconciled && e.account_name?.includes('Bank'))}
          size="small"
          pagination={false}
          columns={[
            {
              title: 'Sana',
              dataIndex: 'date',
              render: (v: string) => dayjs(v).format('DD.MM.YYYY'),
              width: 100,
            },
            {
              title: 'Tur',
              dataIndex: 'kind',
              render: (kind: string) => getKindBadge(kind),
              width: 110,
            },
            {
              title: 'Miqdor',
              dataIndex: 'amount',
              render: (amount: number, record: LedgerEntry) => {
                const amt = Number(amount || 0);
                return (
                  <span style={{ color: amt >= 0 ? '#3f8600' : '#cf1322', fontWeight: 'bold' }}>
                    {amt >= 0 ? '+' : ''}{amt.toFixed(2)} {record.currency}
                  </span>
                );
              },
              width: 130,
            },
            {
              title: 'Izoh',
              dataIndex: 'note',
              ellipsis: true,
            },
            {
              title: 'Amal',
              key: 'action',
              render: (_: any, record: LedgerEntry) => (
                <Button 
                  size="small"
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => {
                    handleReconcile(record.id);
                  }}
                >
                  Tasdiqlash
                </Button>
              ),
              width: 130,
            },
          ]}
        />
      </Modal>
    </div>
  );
}
