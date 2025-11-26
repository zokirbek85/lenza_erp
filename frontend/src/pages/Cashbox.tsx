import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  DatePicker,
  Select,
  Space,
  message,
  Typography,
  Tag,
  Spin,
  Empty,
  Table,
} from 'antd';
import {
  WalletOutlined,
  DollarOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import { Line } from 'react-chartjs-2';
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
} from 'chart.js';
import dayjs, { Dayjs } from 'dayjs';
import type { RangePickerProps } from 'antd/es/date-picker';
import type { ColumnsType } from 'antd/es/table';
import {
  fetchCashboxSummary,
  fetchCashboxHistory,
  exportCashboxExcel,
  exportCashboxPdf,
  type CashboxSummary,
  type CashboxHistory,
} from '../services/cashboxApi';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTitle,
  ChartTooltip,
  Legend,
  Filler
);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function CashboxPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [cashboxes, setCashboxes] = useState<CashboxSummary[]>([]);
  const [selectedCashbox, setSelectedCashbox] = useState<number | null>(null);
  const [history, setHistory] = useState<CashboxHistory | null>(null);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);

  // Fetch cashbox summary
  const loadSummary = async () => {
    setSummaryLoading(true);
    try {
      const data = await fetchCashboxSummary();
      setCashboxes(data.cashboxes);
      
      // Auto-select first cashbox
      if (data.cashboxes.length > 0 && !selectedCashbox) {
        setSelectedCashbox(data.cashboxes[0].id);
      }
    } catch (error) {
      message.error(t('errors.fetch_failed'));
      console.error('Failed to fetch cashbox summary:', error);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Fetch history for selected cashbox
  const loadHistory = async () => {
    if (!selectedCashbox) return;

    setHistoryLoading(true);
    try {
      const data = await fetchCashboxHistory(
        selectedCashbox,
        dateRange[0].format('YYYY-MM-DD'),
        dateRange[1].format('YYYY-MM-DD')
      );
      setHistory(data);
    } catch (error) {
      message.error(t('errors.fetch_failed'));
      console.error('Failed to fetch cashbox history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Export handlers
  const handleExportExcel = async () => {
    try {
      const blob = await exportCashboxExcel();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kassa_balans_${dayjs().format('YYYY-MM-DD')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      message.success(t('common.export_success'));
    } catch (error) {
      message.error(t('errors.export_failed'));
      console.error('Failed to export Excel:', error);
    }
  };

  const handleExportPdf = async () => {
    try {
      const blob = await exportCashboxPdf();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kassa_balans_${dayjs().format('YYYY-MM-DD')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      message.success(t('common.export_success'));
    } catch (error) {
      message.error(t('errors.export_failed'));
      console.error('Failed to export PDF:', error);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadSummary();
  }, []);

  // Load history when cashbox or date range changes
  useEffect(() => {
    if (selectedCashbox) {
      loadHistory();
    }
  }, [selectedCashbox, dateRange]);

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ' ' + currency;
  };

  // Get cashbox type icon and color
  const getCashboxTypeDisplay = (type: string) => {
    switch (type) {
      case 'CARD':
        return { icon: <WalletOutlined />, color: 'blue', text: t('cashbox.type.card') };
      case 'CASH_UZS':
        return { icon: <DollarOutlined />, color: 'green', text: t('cashbox.type.cash_uzs') };
      case 'CASH_USD':
        return { icon: <DollarOutlined />, color: 'gold', text: t('cashbox.type.cash_usd') };
      default:
        return { icon: <WalletOutlined />, color: 'default', text: type };
    }
  };

  // Chart data
  const chartData = {
    labels: history?.history.map(h => dayjs(h.date).format('DD.MM')) || [],
    datasets: [
      {
        label: t('cashbox.balance'),
        data: history?.history.map(h => h.balance) || [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.parsed.y;
            const currency = history?.currency || 'UZS';
            return formatCurrency(value, currency);
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => {
            return new Intl.NumberFormat('uz-UZ', {
              notation: 'compact',
              compactDisplay: 'short',
            }).format(value);
          },
        },
      },
    },
  };

  // Transactions table columns
  const transactionColumns: ColumnsType<any> = [
    {
      title: t('common.date'),
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
    },
    {
      title: t('common.type'),
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'income' ? 'green' : 'red'}>
          {type === 'income' ? t('cashbox.income') : t('cashbox.expense')}
        </Tag>
      ),
    },
    {
      title: t('common.amount'),
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (amount: number, record: any) => (
        <Text strong={Math.abs(amount) > 1000000}>
          {record.type === 'income' ? (
            <Text type="success">+{formatCurrency(amount, history?.currency || 'UZS')}</Text>
          ) : (
            <Text type="danger">-{formatCurrency(amount, history?.currency || 'UZS')}</Text>
          )}
        </Text>
      ),
    },
    {
      title: t('common.description'),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              💰 {t('cashbox.title')}
            </Title>
            <Text type="secondary">{t('cashbox.subtitle')}</Text>
          </div>
          <Space wrap>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadSummary}
              loading={summaryLoading}
            >
              {t('common.refresh')}
            </Button>
            <Button
              icon={<FileExcelOutlined />}
              onClick={handleExportExcel}
            >
              Excel
            </Button>
            <Button
              icon={<FilePdfOutlined />}
              onClick={handleExportPdf}
            >
              PDF
            </Button>
          </Space>
        </div>
      </div>

      {/* Cashbox Cards */}
      <Spin spinning={summaryLoading}>
        {cashboxes.length === 0 ? (
          <Empty description={t('cashbox.no_data')} />
        ) : (
          <Row gutter={[16, 16]}>
            {cashboxes.map((cashbox) => {
              const typeDisplay = getCashboxTypeDisplay(cashbox.cashbox_type);
              const isSelected = selectedCashbox === cashbox.id;

              return (
                <Col key={cashbox.id} xs={24} sm={12} lg={8}>
                  <Card
                    hoverable
                    onClick={() => setSelectedCashbox(cashbox.id)}
                    style={{
                      borderColor: isSelected ? '#1890ff' : undefined,
                      borderWidth: isSelected ? 2 : 1,
                    }}
                  >
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space>
                          {typeDisplay.icon}
                          <Text strong>{cashbox.name}</Text>
                        </Space>
                        <Tag color={typeDisplay.color}>{typeDisplay.text}</Tag>
                      </div>

                      <Statistic
                        title={t('cashbox.current_balance')}
                        value={cashbox.balance}
                        precision={2}
                        suffix={cashbox.currency}
                        valueStyle={{
                          color: cashbox.balance >= 0 ? '#3f8600' : '#cf1322',
                          fontSize: 24,
                        }}
                      />

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {t('cashbox.opening')}
                          </Text>
                          <div>
                            <Text strong>{formatCurrency(cashbox.opening_balance, cashbox.currency)}</Text>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <Text type="success" style={{ fontSize: 12 }}>
                            <ArrowUpOutlined /> {formatCurrency(cashbox.income_sum, cashbox.currency)}
                          </Text>
                          <br />
                          <Text type="danger" style={{ fontSize: 12 }}>
                            <ArrowDownOutlined /> {formatCurrency(cashbox.expense_sum, cashbox.currency)}
                          </Text>
                        </div>
                      </div>
                    </Space>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Spin>

      {/* Chart and Transactions */}
      {selectedCashbox && (
        <>
          {/* Filters */}
          <Card style={{ marginTop: 24 }}>
            <Space wrap>
              <Select
                style={{ width: 200 }}
                value={selectedCashbox}
                onChange={setSelectedCashbox}
                options={cashboxes.map(cb => ({
                  label: cb.name,
                  value: cb.id,
                }))}
              />
              <RangePicker
                value={dateRange}
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    setDateRange([dates[0], dates[1]]);
                  }
                }}
                format="DD.MM.YYYY"
              />
            </Space>
          </Card>

          {/* Balance Chart */}
          <Card
            title={t('cashbox.balance_history')}
            style={{ marginTop: 16 }}
            loading={historyLoading}
          >
            <div style={{ height: 300 }}>
              <Line data={chartData} options={chartOptions} />
            </div>
          </Card>

          {/* Recent Transactions */}
          {history && history.cashbox_type && (
            <Card
              title={t('cashbox.recent_transactions')}
              style={{ marginTop: 16 }}
            >
              <Table
                columns={transactionColumns}
                dataSource={cashboxes.find(cb => cb.id === selectedCashbox)?.history || []}
                rowKey={(record, index) => `${record.date}-${index}`}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total) => t('common.total_items', { count: total }),
                }}
                scroll={{ x: 800 }}
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
