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
  Collapse,
} from 'antd';
import { useIsMobile } from '../hooks/useIsMobile';
import FilterDrawer from '../components/responsive/filters/FilterDrawer';
import FilterTrigger from '../components/responsive/filters/FilterTrigger';
import CashboxManagementSection from '../components/CashboxManagementSection';
import {
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  WalletOutlined,
  ReloadOutlined,
  SettingOutlined,
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
import type { Dayjs } from 'dayjs';
import {
  fetchLedgerSummary,
  fetchCardBalances,
  fetchExpensesByCategory,
  type LedgerSummary,
  type CardBalance,
  type CategoryExpense,
} from '../services/ledgerApi';
import { fetchCashboxSummary, type CashboxSummary } from '../services/cashboxApi';
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
  const { isMobile } = useIsMobile();
  
  // ========== STATE ==========
  const [ledgerData, setLedgerData] = useState<LedgerSummary | null>(null);
  const [cardBalances, setCardBalances] = useState<CardBalance[]>([]);
  const [categories, setCategories] = useState<CategoryExpense[]>([]);
  const [cashboxSummary, setCashboxSummary] = useState<{
    card_uzs: number;
    cash_uzs: number;
    cash_usd: number;
    total_usd: number;
    total_uzs: number;
    usd_rate?: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [currency, setCurrency] = useState<'USD' | 'UZS'>('USD');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

  // ========== LOAD DATA ==========
  useEffect(() => {
    loadAllData();
  }, [dateRange]);

  const aggregateCashboxSummary = (items: CashboxSummary[]) => {
    const summary = {
      card_uzs: 0,
      cash_uzs: 0,
      cash_usd: 0,
      total_usd: 0,
      total_uzs: 0,
      usd_rate: undefined as number | undefined,
    };

    items.forEach((item) => {
      const balance = Number(item.balance) || 0;
      if (item.cashbox_type === 'CARD') {
        if (item.currency === 'USD') {
          summary.cash_usd += balance;
          summary.total_usd += balance;
        } else {
          summary.card_uzs += balance;
          summary.total_uzs += balance;
        }
      } else if (item.cashbox_type === 'CASH_USD') {
        summary.cash_usd += balance;
        summary.total_usd += balance;
      } else if (item.cashbox_type === 'CASH_UZS') {
        summary.cash_uzs += balance;
        summary.total_uzs += balance;
      }
    });

    return summary;
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const filters = {
        from: dateRange?.[0]?.format('YYYY-MM-DD'),
        to: dateRange?.[1]?.format('YYYY-MM-DD'),
      };

      const [summary, cards, cats, cashbox] = await Promise.all([
        fetchLedgerSummary(filters),
        fetchCardBalances(),
        fetchExpensesByCategory(filters),
        fetchCashboxSummary(),
      ]);

      setLedgerData(summary);
      setCardBalances(cards);
      setCategories(cats);
      setCashboxSummary(aggregateCashboxSummary(cashbox.cashboxes || []));
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

  const formatUZS = (n: number) => n.toLocaleString('ru-RU') + ' so\'m';
  const formatUSD = (n: number) => '$' + n.toFixed(2);

  const filtersContent = (
    <Space direction="vertical" style={{ width: '100%' }}>
      <div>
        <label className="mb-2 block text-sm font-medium">{t('ledger.currency')}</label>
        <Select
          value={currency}
          onChange={setCurrency}
          style={{ width: '100%' }}
          options={[
            { value: 'USD', label: 'USD' },
            { value: 'UZS', label: 'UZS' },
          ]}
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium">{t('ledger.dateRange')}</label>
        <RangePicker
          value={dateRange}
          onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
          format="YYYY-MM-DD"
          placeholder={[t('ledger.from'), t('ledger.to')]}
          style={{ width: '100%' }}
        />
      </div>
    </Space>
  );

  // ========== MOBILE VIEW ==========
  if (isMobile) {
    return (
      <div className="space-y-4 px-4 pb-6">
        <header className="py-4">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t('ledger.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('ledger.subtitle')}</p>
        </header>

        <FilterTrigger onClick={() => setFiltersOpen(true)} />
        <FilterDrawer
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title={t('ledger.filters')}
        >
          {filtersContent}
        </FilterDrawer>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            {t('ledger.loading')}
          </div>
        ) : (
          <div className="space-y-4">
            <Card>
              <Statistic
                title={t('ledger.totalIncome')}
                value={currency === 'USD' ? ledgerData?.total_income_usd || 0 : ledgerData?.total_income_uzs || 0}
                precision={2}
                valueStyle={{ color: '#10b981' }}
                prefix={<ArrowUpOutlined />}
                suffix={currency}
              />
            </Card>
            <Card>
              <Statistic
                title={t('ledger.totalExpense')}
                value={currency === 'USD' ? ledgerData?.total_expense_usd || 0 : ledgerData?.total_expense_uzs || 0}
                precision={2}
                valueStyle={{ color: '#ef4444' }}
                prefix={<ArrowDownOutlined />}
                suffix={currency}
              />
            </Card>
            <Card>
              <Statistic
                title={t('ledger.balance')}
                value={
                  currency === 'USD'
                    ? (ledgerData?.total_income_usd || 0) - (ledgerData?.total_expense_usd || 0)
                    : (ledgerData?.total_income_uzs || 0) - (ledgerData?.total_expense_uzs || 0)
                }
                precision={2}
                valueStyle={{ color: '#3b82f6' }}
                prefix={<WalletOutlined />}
                suffix={currency}
              />
            </Card>
          </div>
        )}
      </div>
    );
  }

  // ========== DESKTOP VIEW ==========
  return (
    <section className="page-wrapper space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
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

      {/* OPENING BALANCES */}
      {cashboxSummary && (
        <Card
          title={
            <span>
              <WalletOutlined style={{ marginRight: 8 }} />
              Kassa balansi (Opening Balance)
            </span>
          }
          style={{ marginBottom: '24px' }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Card size="small" style={{ backgroundColor: '#f0f9ff' }}>
                <Statistic
                  title="Karta (UZS)"
                  value={cashboxSummary.card_uzs}
                  precision={2}
                  valueStyle={{ color: '#0369a1' }}
                  formatter={(value) => formatUZS(value as number)}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small" style={{ backgroundColor: '#f0fdf4' }}>
                <Statistic
                  title="Naqd pul (UZS)"
                  value={cashboxSummary.cash_uzs}
                  precision={2}
                  valueStyle={{ color: '#15803d' }}
                  formatter={(value) => formatUZS(value as number)}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small" style={{ backgroundColor: '#fef3c7' }}>
                <Statistic
                  title="Naqd pul (USD)"
                  value={cashboxSummary.cash_usd}
                  precision={2}
                  valueStyle={{ color: '#a16207' }}
                  formatter={(value) => formatUSD(value as number)}
                />
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12}>
              <Card size="small" style={{ backgroundColor: '#eff6ff', borderLeft: '4px solid #3b82f6' }}>
                <Statistic
                  title="Umumiy balans"
                  value={cashboxSummary.total_usd}
                  precision={2}
                  valueStyle={{ color: '#1e40af', fontSize: 24 }}
                  suffix="USD"
                  prefix="$"
                />
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card size="small" style={{ backgroundColor: '#f5f3ff', borderLeft: '4px solid #8b5cf6' }}>
                <Statistic
                  title="UZS ekvivalenti"
                  value={cashboxSummary.total_uzs}
                  precision={2}
                  valueStyle={{ color: '#6d28d9', fontSize: 24 }}
                  formatter={(value) => formatUZS(value as number)}
                />
                {typeof cashboxSummary.usd_rate === 'number' && Number.isFinite(cashboxSummary.usd_rate) && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Kurs: 1 USD = {formatMoney(cashboxSummary.usd_rate)} UZS
                  </Text>
                )}
              </Card>
            </Col>
          </Row>
        </Card>
      )}

      {/* CASHBOX MANAGEMENT SECTION */}
      <Collapse
        items={[
          {
            key: 'management',
            label: (
              <span>
                <SettingOutlined style={{ marginRight: 8 }} />
                <span style={{ fontWeight: 600 }}>Kassa balanslarini boshqarish</span>
                <span style={{ marginLeft: 8, fontSize: 12, color: '#64748b' }}>
                  (Opening balances ni qo'shish, o'zgartirish va o'chirish)
                </span>
              </span>
            ),
            children: <CashboxManagementSection onUpdate={loadAllData} />,
          },
        ]}
        defaultActiveKey={[]}
        style={{ marginBottom: 24 }}
      />

      {/* STATISTICS CARDS */}
      <Row gutter={[16, 16]}>
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
    </section>
  );
}
