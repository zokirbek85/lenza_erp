import { Card, Row, Col } from 'antd';
import { DollarOutlined, WalletOutlined, RiseOutlined } from '@ant-design/icons';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ExpenseSummary } from '../../api/expensesApi';
import { formatCurrency } from '../../utils/formatters';
import { useAutoscale } from '../../hooks/useAutoscale';

interface ExpenseMetricsProps {
  data: ExpenseSummary | null;
  loading?: boolean;
}

const ExpenseMetrics = ({ data, loading }: ExpenseMetricsProps) => {
  const { t } = useTranslation();
  
  // Autoscale: widget o'lchamiga qarab matn va icon o'lchamlarini moslashtirish
  const containerRef = useRef<HTMLDivElement>(null);
  const { fontSize, iconSize } = useAutoscale(containerRef);

  if (!data && !loading) {
    return null;
  }

  return (
    <div ref={containerRef} style={{ height: '100%', width: '100%' }}>
      <div className="space-y-4">
        <div>
          <h2 
            className="font-semibold text-slate-900 dark:text-white"
            style={{ fontSize: `${Math.max(16, fontSize * 1.2)}px` }} // Autoscale: title
          >
            💰 {t('expenses.dashboardTitle')}
          </h2>
          <p 
            className="text-slate-500 dark:text-slate-400"
            style={{ fontSize: `${Math.max(11, fontSize * 0.7)}px` }} // Autoscale: subtitle
          >
            {t('expenses.dashboardSubtitle')}
          </p>
        </div>

      <Row gutter={[16, 16]}>
        {/* Total USD */}
        <Col xs={24} sm={12} lg={8}>
          <Card className="shadow-sm hover:shadow-md transition-shadow" loading={loading}>
            <div className="flex items-center justify-between">
              <div>
                <p 
                  className="text-slate-500 dark:text-slate-400"
                  style={{ fontSize: `${Math.max(10, fontSize * 0.6)}px` }}
                >
                  {t('expenses.totalUSD')}
                </p>
                <p 
                  className="mt-2 font-bold text-red-600 dark:text-red-400"
                  style={{ fontSize: `${Math.max(18, fontSize * 1.5)}px` }} // Autoscale: value
                >
                  ${formatCurrency(data?.total_usd || 0)}
                </p>
                <p 
                  className="mt-1 text-slate-500 dark:text-slate-400"
                  style={{ fontSize: `${Math.max(10, fontSize * 0.6)}px` }}
                >
                  {data?.count || 0} {t('expenses.transactions')}
                </p>
              </div>
              <div 
                className="rounded-full bg-red-100 dark:bg-red-900"
                style={{ width: `${iconSize}px`, height: `${iconSize}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <DollarOutlined style={{ fontSize: `${iconSize * 0.5}px`, color: '#dc2626' }} />
              </div>
            </div>
          </Card>
        </Col>

        {/* Total UZS */}
        <Col xs={24} sm={12} lg={8}>
          <Card className="shadow-sm hover:shadow-md transition-shadow" loading={loading}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('expenses.totalUZS')}
                </p>
                <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(data?.total_uzs || 0)} {t('expenses.sum')}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t('expenses.approvedExpenses')}
                </p>
              </div>
              <div className="rounded-full bg-red-100 p-4 dark:bg-red-900">
                <WalletOutlined style={{ fontSize: '24px', color: '#dc2626' }} />
              </div>
            </div>
          </Card>
        </Col>

        {/* Top Category */}
        <Col xs={24} sm={12} lg={8}>
          <Card className="shadow-sm hover:shadow-md transition-shadow" loading={loading}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('expenses.topCategory')}
                </p>
                <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                  {data?.by_category?.[0]?.category || t('expenses.noData')}
                </p>
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  ${formatCurrency(data?.by_category?.[0]?.amount_usd || 0)}
                </p>
              </div>
              <div className="rounded-full bg-orange-100 p-4 dark:bg-orange-900">
                <RiseOutlined style={{ fontSize: '24px', color: '#ea580c' }} />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Category Breakdown */}
      {data && data.by_category && data.by_category.length > 0 && (
        <Card 
          title={t('expenses.categoryBreakdown')} 
          className="shadow-sm hover:shadow-md transition-shadow"
          loading={loading}
        >
          <div className="space-y-3">
            {data.by_category.map((item, index) => (
              <div key={index} className="flex items-center justify-between border-b border-slate-200 pb-3 last:border-0 dark:border-slate-700">
                <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-white">{item.category}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {item.count} {t('expenses.transactions')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-red-600 dark:text-red-400">
                    ${formatCurrency(item.amount_usd)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatCurrency(item.amount_uzs)} {t('expenses.sum')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Monthly Trend */}
      {data && data.monthly && data.monthly.length > 0 && (
        <Card 
          title={t('expenses.monthlyTrend')} 
          className="shadow-sm hover:shadow-md transition-shadow"
          loading={loading}
        >
          <div className="space-y-2">
            {data.monthly.map((item, index) => (
              <div key={index} className="flex items-center justify-between border-b border-slate-200 pb-2 last:border-0 dark:border-slate-700">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {new Date(item.month + '-01').toLocaleDateString(undefined, { 
                      year: 'numeric', 
                      month: 'long' 
                    })}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {item.count} {t('expenses.transactions')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                    ${formatCurrency(item.amount_usd)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatCurrency(item.amount_uzs)} {t('expenses.sum')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      </div>
    </div>
  );
};

export default ExpenseMetrics;
