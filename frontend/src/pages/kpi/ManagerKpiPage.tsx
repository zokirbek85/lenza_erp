import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import http from '../../app/http';
import KpiCard from '../../components/kpi/KpiCard';
import KpiSection from '../../components/kpi/KpiSection';
import ChartBar from '../../components/kpi/ChartBar';
import ChartPie from '../../components/kpi/ChartPie';
import BonusDetailModal from '../../components/kpi/BonusDetailModal';
import { formatCurrency, formatQuantity } from '../../utils/formatters';
import { exportManagerKPIToPDF } from '../../utils/exportUtils';

interface ManagerKpi {
  my_sales_usd: number;
  my_payments_usd: number;
  my_dealers_count: number;
  my_regions: { region: string; total_usd: number }[];
  my_top_dealers: { dealer: string; total_usd: number }[];
  top_categories?: { category: string; amount: number }[];
}

// Helper function to get default date range
const getDefaultDateRange = () => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    startDate: firstDayOfMonth,
    endDate: today,
  };
};

// Format date to YYYY-MM-DD
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Parse date string to Date object
const parseDate = (dateStr: string | null): Date | null => {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
};

const ManagerKpiPage = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize date range from URL params or use defaults
  const getInitialDateRange = () => {
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    
    const parsedStart = parseDate(startParam);
    const parsedEnd = parseDate(endParam);
    
    if (parsedStart && parsedEnd) {
      return { startDate: parsedStart, endDate: parsedEnd };
    }
    
    return getDefaultDateRange();
  };

  const [dateRange, setDateRange] = useState<{ startDate: Date; endDate: Date }>(getInitialDateRange);
  const [data, setData] = useState<ManagerKpi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [bonusModalOpen, setBonusModalOpen] = useState(false);
  const [bonusDetailData, setBonusDetailData] = useState<any>(null);
  const [bonusDetailLoading, setBonusDetailLoading] = useState(false);

  // Update URL params when date range changes
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('start', formatDate(dateRange.startDate));
    newParams.set('end', formatDate(dateRange.endDate));
    setSearchParams(newParams, { replace: true });
  }, [dateRange, searchParams, setSearchParams]);

  // Fetch data when date range changes
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = {
          from_date: formatDate(dateRange.startDate),
          to_date: formatDate(dateRange.endDate),
        };
        const response = await http.get<ManagerKpi>('/kpis/sales-manager/', { 
          params,
          signal: controller.signal 
        });
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
  }, [dateRange, t]);

  const barData = useMemo(
    () => (data?.my_regions ?? []).map((region) => ({ name: region.region, total: Number(region.total_usd) || 0 })),
    [data?.my_regions]
  );

  const pieData = useMemo(
    () => (data?.my_top_dealers ?? []).map((dealer) => ({ name: dealer.dealer, value: Number(dealer.total_usd) || 0 })),
    [data?.my_top_dealers]
  );

  const categoryPieData = useMemo(
    () => (data?.top_categories ?? []).map((cat) => ({ name: cat.category, value: Number(cat.amount) || 0 })),
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

  const handleDateChange = (start: Date, end: Date) => {
    setDateRange({ startDate: start, endDate: end });
  };

  const handleResetDates = () => {
    setDateRange(getDefaultDateRange());
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const params = {
        from_date: formatDate(dateRange.startDate),
        to_date: formatDate(dateRange.endDate),
      };
      const response = await http.get('/kpis/sales-manager/detail/', { params });
      exportManagerKPIToPDF(response.data);
    } catch (err) {
      console.error('PDF export error:', err);
      alert(t('kpi.messages.exportError', 'PDF export xatolik yuz berdi'));
    } finally {
      setExportingPDF(false);
    }
  };

  const handleBonusCardClick = async () => {
    if (!data) {
      return;
    }
    setBonusModalOpen(true);
    setBonusDetailLoading(true);
    try {
      const params = {
        from_date: formatDate(dateRange.startDate),
        to_date: formatDate(dateRange.endDate),
      };
      const response = await http.get('/kpis/sales-manager/detail/', { params });
      setBonusDetailData(response.data);
    } catch (err) {
      console.error('Bonus detail fetch error:', err);
      alert(t('kpi.messages.loadError', "Ma'lumotlarni yuklashda xatolik"));
    } finally {
      setBonusDetailLoading(false);
    }
  };

  const handleCloseBonusModal = () => {
    setBonusModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Date Range Picker */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {t('common.startDate', 'Boshlanish sanasi')}
              </label>
              <input
                type="date"
                value={formatDate(dateRange.startDate)}
                onChange={(e) => {
                  const newStart = parseDate(e.target.value);
                  if (newStart && newStart <= dateRange.endDate) {
                    handleDateChange(newStart, dateRange.endDate);
                  }
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {t('common.endDate', 'Tugash sanasi')}
              </label>
              <input
                type="date"
                value={formatDate(dateRange.endDate)}
                onChange={(e) => {
                  const newEnd = parseDate(e.target.value);
                  if (newEnd && newEnd >= dateRange.startDate) {
                    handleDateChange(dateRange.startDate, newEnd);
                  }
                }}
                max={formatDate(new Date())}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={handleExportPDF}
                disabled={exportingPDF}
                className="rounded-lg border border-emerald-500 bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {exportingPDF ? t('common.exporting', 'Yuklanmoqda...') : '📄 PDF Export'}
              </button>
              <button
                onClick={handleResetDates}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 whitespace-nowrap"
              >
                {t('common.reset', 'Qayta tiklash')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard title={t('kpi.manager.mySales')} value={formatCurrency(data?.my_sales_usd ?? 0)} />
        <KpiCard title={t('kpi.manager.myPayments')} value={formatCurrency(data?.my_payments_usd ?? 0)} />
        <KpiCard
          title={t('kpi.manager.bonus', 'Bonus')}
          value={formatCurrency((data?.my_payments_usd ?? 0) * 0.01)}
          subtitle={t('kpi.manager.bonusFormula', 'bonusFormula: 1% of Payments')}
          accentColor="text-amber-600"
          onClick={handleBonusCardClick}
          clickable={true}
        />
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

      <BonusDetailModal
        isOpen={bonusModalOpen}
        onClose={handleCloseBonusModal}
        data={bonusDetailData}
        loading={bonusDetailLoading}
      />
    </div>
  );
};

export default ManagerKpiPage;
