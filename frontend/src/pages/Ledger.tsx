import { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Select,
  DatePicker,
  Button,
  Space,
  message,
  Typography,
} from 'antd';
import {
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  WalletOutlined,
  ReloadOutlined,
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
import {
  fetchLedgerSummary,
  fetchCardBalances,
  fetchExpensesByCategory,
  type LedgerSummary,
  type CardBalance,
  type CategoryExpense,
} from '../services/ledgerApi';
import { useTranslation } from 'react-i18next';

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

export default function LedgerPage() {
  const { t } = useTranslation();
  
  // ========== STATE ==========
  const [ledgerData, setLedgerData] = useState<LedgerSummary | null>(null);
  const [cardBalances, setCardBalances] = useState<CardBalance[]>([]);
  const [categories, setCategories] = useState<CategoryExpense[]>([]);
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState<'USD' | 'UZS'>('USD');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

  // ========== LOAD DATA ==========
  useEffect(() => {
    loadAllData();
  }, [dateRange]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const filters = {
        from: dateRange?.[0]?.format('YYYY-MM-DD'),
        to: dateRange?.[1]?.format('YYYY-MM-DD'),
      };

      const [summary, cards, cats] = await Promise.all([
        fetchLedgerSummary(filters),
        fetchCardBalances(),
        fetchExpensesByCategory(filters),
      ]);

      setLedgerData(summary);
      setCardBalances(cards);
      setCategories(cats);
    } catch (error) {
      message.error(t('ledger.errorLoading'));
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  // ========== CHART DATA ==========
  const chartData = {
    labels: ledgerData?.history.map((item) => item.date) || [],
    datasets: [
      {
        label: t('ledger.income'),
        data: ledgerData?.history.map((item) =>
          currency === 'USD' ? item.income_usd : item.income_uzs
        ) || [],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: t('ledger.expense'),
        data: ledgerData?.history.map((item) =>
          currency === 'USD' ? item.expense_usd : item.expense_uzs
        ) || [],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: t('ledger.balance'),
        data: ledgerData?.history.map((item) =>
          currency === 'USD' ? item.balance_usd : item.balance_uzs
        ) || [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  // ========== FORMATTERS ==========
  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* HEADER */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            {t('ledger.title')}
          </Title>
          <Text type="secondary">{t('ledger.subtitle')}</Text>
        </div>

        <Space>
          <Select
            value={currency}
            onChange={setCurrency}
            style={{ width: 100 }}
            options={[
              { value: 'USD', label: 'USD' },
              { value: 'UZS', label: 'UZS' },
            ]}
          />
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
            format="YYYY-MM-DD"
            placeholder={[t('ledger.from'), t('ledger.to')]}
          />
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={loadAllData}
            loading={loading}
          >
            {t('ledger.refresh')}
          </Button>
        </Space>
      </div>

      {/* STATISTICS CARDS */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title={t('ledger.totalIncome')}
              value={
                currency === 'USD'
                  ? ledgerData?.total_income_usd || 0
                  : ledgerData?.total_income_uzs || 0
              }
              precision={2}
              valueStyle={{ color: '#10b981' }}
              prefix={<ArrowUpOutlined />}
              suffix={currency}
              formatter={(value) => formatMoney(value as number)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title={t('ledger.totalExpense')}
              value={
                currency === 'USD'
                  ? ledgerData?.total_expense_usd || 0
                  : ledgerData?.total_expense_uzs || 0
              }
              precision={2}
              valueStyle={{ color: '#ef4444' }}
              prefix={<ArrowDownOutlined />}
              suffix={currency}
              formatter={(value) => formatMoney(value as number)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={24} lg={8}>
          <Card>
            <Statistic
              title={t('ledger.balance')}
              value={
                currency === 'USD'
                  ? ledgerData?.balance_usd || 0
                  : ledgerData?.balance_uzs || 0
              }
              precision={2}
              valueStyle={{
                color:
                  (currency === 'USD'
                    ? ledgerData?.balance_usd || 0
                    : ledgerData?.balance_uzs || 0) >= 0
                    ? '#10b981'
                    : '#ef4444',
              }}
              prefix={<DollarOutlined />}
              suffix={currency}
              formatter={(value) => formatMoney(value as number)}
            />
          </Card>
        </Col>
      </Row>

      {/* TREND CHART */}
      <Card
        title={t('ledger.trendChart')}
        style={{ marginBottom: '24px' }}
        loading={loading}
      >
        <Line data={chartData} options={chartOptions} />
      </Card>

      {/* CARD BALANCES */}
      <Card title={t('ledger.cardBalances')} style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          {cardBalances.map((card) => (
            <Col xs={24} sm={12} lg={8} key={card.card_id}>
              <Card
                size="small"
                title={card.card_name}
                extra={<WalletOutlined style={{ fontSize: 18 }} />}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">{t('ledger.income')}:</Text>
                    <Text strong style={{ color: '#10b981' }}>
                      {formatMoney(
                        currency === 'USD' ? card.income_usd : card.income_uzs
                      )}{' '}
                      {currency}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">{t('ledger.expense')}:</Text>
                    <Text strong style={{ color: '#ef4444' }}>
                      {formatMoney(
                        currency === 'USD' ? card.expense_usd : card.expense_uzs
                      )}{' '}
                      {currency}
                    </Text>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderTop: '1px solid #f0f0f0',
                      paddingTop: '8px',
                    }}
                  >
                    <Text strong>{t('ledger.balance')}:</Text>
                    <Text
                      strong
                      style={{
                        color:
                          (currency === 'USD' ? card.balance_usd : card.balance_uzs) >= 0
                            ? '#10b981'
                            : '#ef4444',
                      }}
                    >
                      {formatMoney(
                        currency === 'USD' ? card.balance_usd : card.balance_uzs
                      )}{' '}
                      {currency}
                    </Text>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* EXPENSES BY CATEGORY */}
      <Card title={t('ledger.expensesByCategory')}>
        <Row gutter={[16, 16]}>
          {categories.map((cat, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <Card size="small">
                <Statistic
                  title={cat.category}
                  value={currency === 'USD' ? cat.total_usd : cat.total_uzs}
                  precision={2}
                  suffix={currency}
                  formatter={(value) => formatMoney(value as number)}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {cat.count} {t('ledger.transactions')}
                </Text>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
}
