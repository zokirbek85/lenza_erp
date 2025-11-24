import { useCallback, useEffect, useState } from 'react';
import { Card, DatePicker, Statistic, Spin, Alert, Row, Col } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import dayjs, { Dayjs } from 'dayjs';
import {
  fetchTodayRate,
  fetchLastNDays,
  fetchRatesRange,
  formatRate,
} from '@/services/cbuApi';
import type { ProcessedRate } from '@/services/cbuApi';

const { RangePicker } = DatePicker;

/**
 * CbuRateWidget - Informational widget displaying exchange rates from Central Bank of Uzbekistan
 * 
 * ⚠️ CRITICAL: This component is READ-ONLY and purely informational
 * - Does NOT write to database
 * - Does NOT affect business logic calculations
 * - Does NOT override manual exchange rates
 * - Used ONLY for reference/comparison purposes
 */
const CbuRateWidget = () => {
  const { t } = useTranslation();
  const [todayRate, setTodayRate] = useState<ProcessedRate | null>(null);
  const [historicalRates, setHistoricalRates] = useState<ProcessedRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(7, 'days'),
    dayjs(),
  ]);

  // Load today's rate
  const loadTodayRate = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const rate = await fetchTodayRate();
      setTodayRate(rate);
    } catch (err) {
      setError(t('currency.errors.fetchFailed'));
      console.error('Error loading CBU rate:', err);
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Load historical rates
  const loadHistoricalRates = useCallback(async () => {
    try {
      setChartLoading(true);
      const rates = await fetchLastNDays(7);
      setHistoricalRates(rates);
    } catch (err) {
      console.error('Error loading historical CBU rates:', err);
    } finally {
      setChartLoading(false);
    }
  }, []);

  // Load rates for custom date range
  const loadCustomRange = useCallback(async (from: Dayjs, to: Dayjs) => {
    try {
      setChartLoading(true);
      const fromDate = from.format('YYYY-MM-DD');
      const toDate = to.format('YYYY-MM-DD');
      const rates = await fetchRatesRange(fromDate, toDate);
      setHistoricalRates(rates);
    } catch (err) {
      console.error('Error loading custom CBU range:', err);
    } finally {
      setChartLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadTodayRate();
    loadHistoricalRates();
  }, [loadTodayRate, loadHistoricalRates]);

  // Handle date range change
  const handleDateRangeChange = (dates: null | [Dayjs | null, Dayjs | null]) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([dates[0], dates[1]]);
      loadCustomRange(dates[0], dates[1]);
    }
  };

  // Prepare chart data
  const chartData = historicalRates.map((rate) => ({
    date: dayjs(rate.date).format('DD.MM'),
    rate: rate.rate,
    fullDate: rate.date,
  }));

  // Calculate rate change indicator
  const getRateChangeColor = (diff: number) => {
    if (diff > 0) return '#3f8600';
    if (diff < 0) return '#cf1322';
    return '#666';
  };

  const getRateChangeIcon = (diff: number) => {
    if (diff > 0) return <ArrowUpOutlined />;
    if (diff < 0) return <ArrowDownOutlined />;
    return null;
  };

  return (
    <div className="cbu-widget-container mt-8 space-y-6">
      {/* Warning Banner */}
      <Alert
        message={
          <div className="flex items-center gap-2">
            <InfoCircleOutlined />
            <span className="font-medium">{t('currency.cbuWidget.title')}</span>
          </div>
        }
        description={t('currency.cbuWidget.description')}
        type="info"
        showIcon={false}
        className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
      />

      {/* Error Alert */}
      {error && (
        <Alert
          message={t('currency.errors.title')}
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
        />
      )}

      {/* Main Rate Card */}
      <Card
        className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
        loading={loading}
        title={
          <span className="text-base font-semibold text-slate-900 dark:text-white">
            {t('currency.cbuWidget.currentRate')}
          </span>
        }
      >
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} md={12}>
            <div className="text-center">
              <div className="mb-2 text-sm text-slate-600 dark:text-slate-400">
                {t('currency.usdToUzs')}
              </div>
              {todayRate && (
                <>
                  <div className="text-3xl font-bold text-slate-900 dark:text-white">
                    {formatRate(todayRate.rate)} {t('currency.uzs')}
                  </div>
                  <div
                    className="mt-2 text-sm"
                    style={{ color: getRateChangeColor(todayRate.diff) }}
                  >
                    {getRateChangeIcon(todayRate.diff)}{' '}
                    {todayRate.diff > 0 ? '+' : ''}
                    {formatRate(todayRate.diff)} {t('currency.fromYesterday')}
                  </div>
                </>
              )}
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div className="text-center">
              <div className="text-xs text-slate-500 dark:text-slate-500">
                {t('currency.source')}
              </div>
              <div className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('currency.centralBank')}
              </div>
              {todayRate && (
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-500">
                  {t('currency.lastUpdated')}: {dayjs(todayRate.date).format('DD.MM.YYYY')}
                </div>
              )}
            </div>
          </Col>
        </Row>
      </Card>

      {/* Historical Data Card */}
      <Card
        className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
        title={
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-slate-900 dark:text-white">
              {t('currency.historicalData')}
            </span>
            <RangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              format="DD.MM.YYYY"
              allowClear={false}
              size="small"
              className="dark:bg-slate-800"
              disabledDate={(current) => current && current > dayjs().endOf('day')}
            />
          </div>
        }
      >
        {chartLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Spin size="large" />
          </div>
        ) : historicalRates.length === 0 ? (
          <Alert
            message={t('currency.noData')}
            description={t('currency.noDataDescription')}
            type="info"
            showIcon
          />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  domain={['dataMin - 10', 'dataMax + 10']}
                  tickFormatter={(value) => value.toFixed(0)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                  }}
                  formatter={(value: number) => [
                    `${formatRate(value)} ${t('currency.uzs')}`,
                    t('currency.rate'),
                  ]}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      const data = payload[0].payload as { fullDate: string };
                      return dayjs(data.fullDate).format('DD MMMM YYYY');
                    }
                    return label;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Statistics */}
            <Row gutter={16} className="mt-4">
              <Col xs={8}>
                <Statistic
                  title={t('currency.minRate')}
                  value={formatRate(Math.min(...historicalRates.map((r) => r.rate)))}
                  suffix={t('currency.uzs')}
                  valueStyle={{ fontSize: '16px', color: '#cf1322' }}
                />
              </Col>
              <Col xs={8}>
                <Statistic
                  title={t('currency.maxRate')}
                  value={formatRate(Math.max(...historicalRates.map((r) => r.rate)))}
                  suffix={t('currency.uzs')}
                  valueStyle={{ fontSize: '16px', color: '#3f8600' }}
                />
              </Col>
              <Col xs={8}>
                <Statistic
                  title={t('currency.avgRate')}
                  value={formatRate(
                    historicalRates.reduce((sum, r) => sum + r.rate, 0) /
                      historicalRates.length
                  )}
                  suffix={t('currency.uzs')}
                  valueStyle={{ fontSize: '16px', color: '#1890ff' }}
                />
              </Col>
            </Row>
          </>
        )}
      </Card>
    </div>
  );
};

export default CbuRateWidget;
