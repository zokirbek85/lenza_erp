import axios from 'axios';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import http from '../../app/http';
import KpiCard from '../../components/kpi/KpiCard';
import KpiSection from '../../components/kpi/KpiSection';
import ChartBar from '../../components/kpi/ChartBar';
import { formatCurrency, formatQuantity } from '../../utils/formatters';

interface OwnerKpi {
  total_sales_usd: number;
  total_payments_usd: number;
  top_dealers: { dealer: string; total_usd: number }[];
  balances: { dealer: string; balance_usd: number }[];
}

const OwnerKpiPage = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<OwnerKpi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await http.get<OwnerKpi>('/kpis/owner/', { signal: controller.signal });
        setData(response.data);
      } catch (err) {
        if (axios.isCancel(err)) return;
        if (controller.signal.aborted) return;
        setError(t('kpi.messages.loadError'));
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };
    load();
    return () => controller.abort();
  }, []);

  const renderSkeleton = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800"
          />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[...Array(2)].map((_, index) => (
          <div
            key={index}
            className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800"
          />
        ))}
      </div>
    </div>
  );

  if (loading) {
    return renderSkeleton();
  }

  if (error) {
    return <p className="text-sm text-rose-500 dark:text-rose-400">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard title={t('kpi.owner.totalSales')} value={formatCurrency(data?.total_sales_usd ?? 0)} />
        <KpiCard title={t('kpi.owner.totalPayments')} value={formatCurrency(data?.total_payments_usd ?? 0)} />
        <KpiCard
          title={t('kpi.owner.dealersCount')}
          value={formatQuantity(data?.balances.length ?? 0)}
          subtitle={t('kpi.owner.activeDealers')}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <KpiSection title={t('kpi.owner.topDealers')}>
          <div className="space-y-3">
            {data?.top_dealers.map((dealer) => (
              <div key={dealer.dealer} className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{dealer.dealer}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('kpi.sales')}</p>
                </div>
                <p className="font-semibold text-slate-900 dark:text-white">{formatCurrency(dealer.total_usd)}</p>
              </div>
            )) ?? <p className="text-sm text-slate-500 dark:text-slate-400">{t('kpi.noData')}</p>}
          </div>
        </KpiSection>

        <KpiSection title={t('kpi.owner.balances')} description={t('kpi.owner.balancesDesc')}>
          <div className="space-y-2">
            {data?.balances.map((balance) => (
              <div key={balance.dealer} className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">{balance.dealer}</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(balance.balance_usd)}
                </span>
              </div>
            )) ?? <p className="text-sm text-slate-500 dark:text-slate-400">{t('kpi.noData')}</p>}
          </div>
        </KpiSection>
      </div>

      <KpiSection title={t('kpi.owner.salesDistribution')} description={t('kpi.owner.salesByTopDealers')}>
        <ChartBar
          data={(data?.top_dealers ?? []).map((dealer) => ({
            name: dealer.dealer,
            total: dealer.total_usd,
          }))}
          xKey="name"
          yKey="total"
          color="#0ea5e9"
          legendLabel={t('kpi.salesUsd')}
        />
      </KpiSection>
    </div>
  );
};

export default OwnerKpiPage;
