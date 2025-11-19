import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import http from '../../app/http';
import KpiSection from '../../components/kpi/KpiSection';
import ChartBar from '../../components/kpi/ChartBar';
import { formatQuantity } from '../../utils/formatters';

interface WarehouseKpi {
  low_stock: { sku: string; name: string; stock_ok: number }[];
  defect_stock: { sku: string; name: string; stock_defect: number }[];
}

const WarehouseKpiPage = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<WarehouseKpi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await http.get<WarehouseKpi>('/api/kpis/warehouse/', { signal: controller.signal });
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

  const lowStockChartData = useMemo(
    () =>
      (data?.low_stock ?? []).map((item) => ({
        name: item.name || item.sku,
        total: item.stock_ok,
      })),
    [data?.low_stock]
  );

  const riskItems = useMemo(
    () =>
      [
        {
          title: t('kpi.warehouse.criticalLowStock'),
          items: (data?.low_stock ?? [])
            .filter((item) => item.stock_ok < 5)
            .map((item) => ({
              sku: item.sku,
              name: item.name,
              value: item.stock_ok,
            })),
          highlightClass: 'text-amber-600',
          suffix: ` ${t('common.units')}`,
        },
        {
          title: t('kpi.warehouse.activeDefects'),
          items: (data?.defect_stock ?? [])
            .filter((item) => item.stock_defect > 0)
            .map((item) => ({
              sku: item.sku,
              name: item.name,
              value: item.stock_defect,
            })),
          highlightClass: 'text-rose-600',
          suffix: ` ${t('common.units')}`,
        },
      ],
    [data?.low_stock, data?.defect_stock, t]
  );

  const renderSkeleton = () => (
    <div className="space-y-6">
      {[...Array(3)].map((_, index) => (
        <div
          key={index}
          className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800"
        />
      ))}
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
      <div className="grid gap-6 lg:grid-cols-2">
        <KpiSection title={t('kpi.warehouse.lowStock')} description={t('kpi.warehouse.lowStockDesc')}>
          <div className="space-y-2 text-sm">
            {data?.low_stock.map((item) => (
              <div key={item.sku} className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{item.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.sku}</p>
                </div>
                <span className="font-semibold text-amber-600">{formatQuantity(item.stock_ok)} {t('common.units')}</span>
              </div>
            )) ?? <p className="text-sm text-slate-500 dark:text-slate-400">{t('kpi.warehouse.noHighRisk')}</p>}
          </div>
        </KpiSection>
        <KpiSection title={t('kpi.warehouse.defects')} description={t('kpi.warehouse.defectsDesc')}>
          <div className="space-y-2 text-sm">
            {data?.defect_stock.map((item) => (
              <div key={item.sku} className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{item.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.sku}</p>
                </div>
                <span className="font-semibold text-rose-600">{formatQuantity(item.stock_defect)} {t('common.units')}</span>
              </div>
            )) ?? <p className="text-sm text-slate-500 dark:text-slate-400">{t('kpi.warehouse.noDefects')}</p>}
          </div>
        </KpiSection>
      </div>

      <KpiSection title={t('kpi.warehouse.stockDistribution')} description={t('kpi.warehouse.stockDistributionDesc')}>
        <ChartBar data={lowStockChartData} xKey="name" yKey="total" color="#f97316" legendLabel={t('kpi.warehouse.stockUnits')} />
      </KpiSection>

      <div className="grid gap-6 lg:grid-cols-2">
        {riskItems.map((risk) => (
          <KpiSection key={risk.title} title={risk.title}>
            <div className="space-y-3 text-sm">
              {risk.items.length ? (
                risk.items.map((item) => (
                  <div key={item.sku} className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{item.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.sku}</p>
                    </div>
                    <span className={risk.highlightClass}>
                      {formatQuantity(item.value)}
                      {risk.suffix}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 dark:text-slate-400">{t('kpi.warehouse.noRisks')}</p>
              )}
            </div>
          </KpiSection>
        ))}
      </div>
    </div>
  );
};

export default WarehouseKpiPage;
