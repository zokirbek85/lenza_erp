import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import http from '../../app/http';
import KpiCard from '../../components/kpi/KpiCard';
import KpiSection from '../../components/kpi/KpiSection';
import ChartBar from '../../components/kpi/ChartBar';
import ChartPie from '../../components/kpi/ChartPie';
import { formatCurrency, formatQuantity } from '../../utils/formatters';

interface ManagerKpi {
  my_sales_usd: number;
  my_payments_usd: number;
  my_dealers_count: number;
  my_regions: { region: string; total_usd: number }[];
  my_top_dealers: { dealer: string; total_usd: number }[];
  top_categories?: { category: string; amount: number }[];
}

const ManagerKpiPage = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<ManagerKpi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await http.get<ManagerKpi>('/kpis/sales-manager/', { signal: controller.signal });
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

  const barData = useMemo(
    () => (data?.my_regions ?? []).map((region) => ({ name: region.region, total: region.total_usd })),
    [data?.my_regions]
  );

  const pieData = useMemo(
    () => (data?.my_top_dealers ?? []).map((dealer) => ({ name: dealer.dealer, value: dealer.total_usd })),
    [data?.my_top_dealers]
  );

  const categoryPieData = useMemo(
    () => (data?.top_categories ?? []).map((cat) => ({ name: cat.category, value: cat.amount })),
    [data?.top_categories]
  );

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
        {[...Array(3)].map((_, index) => (
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
        <KpiCard title={t('kpi.manager.mySales')} value={formatCurrency(data?.my_sales_usd ?? 0)} />
        <KpiCard title={t('kpi.manager.myPayments')} value={formatCurrency(data?.my_payments_usd ?? 0)} />
        <KpiCard
          title={t('kpi.manager.myDealers')}
          value={formatQuantity(data?.my_dealers_count ?? 0)}
          subtitle={t('kpi.manager.assignedToMe')}
        />
      </div>

      <KpiSection title={t('kpi.manager.topDealers')}>
        <div className="space-y-3">
          {(data?.my_top_dealers ?? []).length ? (
            data?.my_top_dealers?.map((dealer) => (
              <div key={dealer.dealer} className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{dealer.dealer}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('kpi.sales')}</p>
                </div>
                <p className="font-semibold text-slate-900 dark:text-white">{formatCurrency(dealer.total_usd)}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('kpi.noData')}</p>
          )}
        </div>
      </KpiSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <KpiSection title={t('kpi.manager.salesByRegion')} description={t('kpi.manager.myRegions')}>
          <ChartBar data={barData} xKey="name" yKey="total" legendLabel={t('kpi.salesUsd')} />
        </KpiSection>
        <KpiSection title={t('kpi.manager.topDealersShare')}>
          <ChartPie data={pieData} nameKey="name" valueKey="value" />
        </KpiSection>
      </div>

      <KpiSection title={t('kpi.manager.topCategories')} description={t('kpi.manager.categoriesBySales')}>
        {(data?.top_categories ?? []).length > 0 ? (
          <ChartPie data={categoryPieData} nameKey="name" valueKey="value" />
        ) : (
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">{t('kpi.noData')}</p>
        )}
      </KpiSection>
    </div>
  );
};

export default ManagerKpiPage;
