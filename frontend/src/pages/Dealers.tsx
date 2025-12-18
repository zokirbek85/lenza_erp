import type { ChangeEvent, FormEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Select } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';

import http from '../app/http';
import { useAuthStore } from '../auth/useAuthStore';
import Modal from '../components/Modal';
import PaginationControls from '../components/PaginationControls';
import { usePersistedPageSize } from '../hooks/usePageSize';
import { useIsMobile } from '../hooks/useIsMobile';
import { toArray } from '../utils/api';
import { formatCurrency } from '../utils/formatters';
import { downloadFile } from '../utils/download';
import Money from '../components/Money';
import FilterDrawer from '../components/responsive/filters/FilterDrawer';
import FilterTrigger from '../components/responsive/filters/FilterTrigger';
import DealersMobileCards from './_mobile/DealersMobileCards';
import type { DealersMobileHandlers } from './_mobile/DealersMobileCards';

interface Region {
  id: number;
  name: string;
}

interface Manager {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  full_name?: string;
}

interface Dealer {
  id: number;
  code: string;
  name: string;
  region: string;
  region_id?: number | null;
  manager: string;
  manager_user_id?: number | null;
  opening_balance_usd: number;
  opening_balance_uzs: number;
  current_balance_usd: number;
  current_balance_uzs: number;
  converted_balance_uzs: number;
  is_active: boolean;
  include_in_manager_kpi: boolean;
  phone: string;
  address: string;
  contact: string;
  created_at: string;
  balance?: number;
  current_debt_usd?: number;
  current_debt_uzs?: number;
}

interface OrderSummary {
  id: number;
  display_no: string;
  status: string;
  total_usd: number;
  value_date: string;
}

interface PaymentSummary {
  id: number;
  pay_date: string;
  amount: number;
  currency: string;
  method: string;
}

interface RefundSummary {
  id: number;
  date: string;
  amount: number;
  currency: string;
  method: string;
  description?: string;
}

interface FinanceTransaction {
  id: number;
  type: 'income' | 'expense';
  type_display: string;
  dealer: number | null;
  dealer_name: string | null;
  dealer_detail?: Dealer;
  account: number;
  account_name: string;
  date: string;
  currency: 'USD' | 'UZS';
  amount: number;
  amount_usd: number;
  exchange_rate?: number | null;
  exchange_rate_date?: string | null;
  category: string | null;
  comment: string;
  status: 'draft' | 'approved' | 'cancelled';
  status_display: string;
  created_by: number | null;
  created_by_name: string | null;
  approved_by: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

const emptyForm = {
  name: '',
  code: '',
  contact: '',
  phone: '',
  address: '',
  opening_balance_usd: '',
  opening_balance_uzs: '',
  region_id: '' as number | '',
  manager_user_id: '' as number | '',
};

const DealersPage = () => {
  const { t } = useTranslation();
  const role = useAuthStore((state) => state.role);
  const { isMobile } = useIsMobile();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  
  // Default to current month
  const getDefaultDates = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start_date: firstDay.toISOString().split('T')[0],
      end_date: lastDay.toISOString().split('T')[0],
    };
  };
  
  const [filter, setFilter] = useState({ 
    region_id: '', 
    ...getDefaultDates() 
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editing, setEditing] = useState<Dealer | null>(null);
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [payments, setPayments] = useState<PaymentSummary[]>([]);
  const [refunds, setRefunds] = useState<RefundSummary[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePersistedPageSize('dealers_page_size');
  const [total, setTotal] = useState(0);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{ created: number; updated: number; skipped?: number } | null>(null);

  const loadDealers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await http.get('/dealers/', {
        params: {
          page,
          page_size: pageSize,
          ...(filter.region_id ? { region_id: filter.region_id } : {}),
        },
      });
      const data = response.data;
      let normalized: Dealer[];
      if (data && typeof data === 'object' && Array.isArray(data.results)) {
        normalized = data.results as Dealer[];
        setTotal(Number(data.count) || 0);
      } else {
        normalized = toArray<Dealer>(data);
        setTotal(normalized.length);
      }
      setDealers(normalized);
    } catch (error) {
      console.error(error);
      toast.error(t('messages.error'));
    } finally {
      setLoading(false);
    }
  }, [filter, page, pageSize, t]);

  const canLoadRegions = role === 'admin' || role === 'owner';
  const canLoadSalesManagers = role === 'admin' || role === 'owner' || role === 'accountant' || role === 'warehouse';

  const loadRegions = useCallback(async () => {
    try {
      const response = await http.get('/regions/');
      setRegions(toArray<Region>(response.data));
    } catch (error) {
      console.error(error);
    }
  }, []);

  const loadManagers = useCallback(async () => {
    try {
      const response = await http.get('/users/', { params: { role: 'sales' } });
      setManagers(toArray<Manager>(response.data));
    } catch (error) {
      console.warn('Unable to load managers', error);
    }
  }, []);

  useEffect(() => {
    if (canLoadRegions) {
      loadRegions();
    } else {
      setRegions([]);
    }
    if (canLoadSalesManagers) {
      loadManagers();
    } else {
      setManagers([]);
    }
  }, [canLoadRegions, canLoadSalesManagers, loadRegions, loadManagers]);

  useEffect(() => {
    loadDealers();
  }, [loadDealers]);

  useEffect(() => {
    if (total === 0) {
      if (page !== 1) setPage(1);
      return;
    }
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [total, pageSize, page]);

  const handleFilterChange = (field: string, value: string) => {
    setFilter(prev => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openModal = (dealer?: Dealer) => {
    if (dealer) {
      setEditing(dealer);
      setForm({
        name: dealer.name,
        code: dealer.code,
        contact: dealer.contact || '',
        phone: dealer.phone || '',
        address: dealer.address || '',
        opening_balance_usd: String(dealer.opening_balance_usd ?? 0),
        opening_balance_uzs: String(dealer.opening_balance_uzs ?? 0),
        region_id: dealer.region_id ?? '',
        manager_user_id: dealer.manager_user_id ?? '',
      });
    } else {
      setEditing(null);
      setForm(emptyForm);
    }
    setModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      code: form.code,
      contact: form.contact,
      phone: form.phone,
      address: form.address,
      opening_balance_usd: Number(form.opening_balance_usd || 0),
      opening_balance_uzs: Number(form.opening_balance_uzs || 0),
      region_id: form.region_id || null,
      manager_user_id: form.manager_user_id || null,
    };
    try {
      if (editing) {
        await http.put(`/dealers/${editing.id}/`, payload);
        toast.success(t('dealers.messages.updated'));
      } else {
        await http.post('/dealers/', payload);
        toast.success(t('dealers.messages.created'));
      }
      setModalOpen(false);
      setForm(emptyForm);
      setEditing(null);
      loadDealers();
    } catch (error) {
      console.error(error);
      toast.error(t('dealers.messages.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dealer: Dealer) => {
    if (!window.confirm(t('dealers.confirmDelete', { name: dealer.name }))) return;
    try {
      await http.delete(`/dealers/${dealer.id}/`);
      toast.success(t('dealers.messages.deleted'));
      loadDealers();
    } catch (error) {
      console.error(error);
      toast.error(t('dealers.messages.deleteError'));
    }
  };

  const handleKPIToggle = async (dealerId: number, includeInKPI: boolean) => {
    try {
      await http.patch(`/dealers/${dealerId}/`, {
        include_in_manager_kpi: includeInKPI
      });
      toast.success(includeInKPI ? 'Menejer KPI ga qo\'shildi' : 'Menejer KPI dan olib tashlandi');
      loadDealers();
    } catch (error) {
      console.error(error);
      toast.error('KPI sozlamalarini yangilashda xatolik');
    }
  };

  const openDetails = async (dealer: Dealer) => {
    setSelectedDealer(dealer);
    setDetailOpen(true);
    setDetailLoading(true);
    
    try {
      const [ordersRes, financeRes, refundsRes] = await Promise.allSettled([
        http.get('/orders/', { 
          params: { 
            dealer: dealer.id, 
            ordering: '-created_at',
            page_size: 10
          } 
        }),
        http.get('/finance/transactions/', {
          params: {
            dealer: dealer.id,
            type: 'income',
            ordering: '-date',
            page_size: 10
          }
        }),
        http.get('/finance/dealer-refund/', {
          params: {
            dealer_id: dealer.id,
            ordering: '-date',
            page_size: 10
          }
        })
      ]);
      
      if (ordersRes.status === 'fulfilled') {
        setOrders(toArray<OrderSummary>(ordersRes.value.data));
      } else {
        console.warn('Orders fetch failed:', ordersRes.reason);
        setOrders([]);
      }
      
      if (financeRes.status === 'fulfilled') {
        const responseData = financeRes.value.data as PaginatedResponse<FinanceTransaction> | FinanceTransaction[];
        const transactions: FinanceTransaction[] = Array.isArray(responseData)
          ? responseData
          : responseData?.results ?? [];
        const mappedPayments: PaymentSummary[] = transactions.map(mapTransactionToPayment);
        setPayments(mappedPayments);
      } else {
        console.warn('Finance transactions fetch failed:', financeRes.reason);
        setPayments([]);
      }
      
      if (refundsRes.status === 'fulfilled') {
        const responseData = refundsRes.value.data as any;
        const refundsData: any[] = Array.isArray(responseData)
          ? responseData
          : responseData?.results ?? [];
        const mappedRefunds: RefundSummary[] = refundsData.map((r: any) => ({
          id: r.id,
          date: r.date || r.created_at,
          amount: r.amount_usd ?? r.amount ?? 0,
          currency: r.currency || 'USD',
          method: r.account_name || 'Cash',
          description: r.description || '',
        }));
        setRefunds(mappedRefunds);
      } else {
        console.warn('Refunds fetch failed:', refundsRes.reason);
        setRefunds([]);
      }
    } catch (error) {
      console.error('Failed to load dealer details:', error);
      toast.error(t('dealers.messages.loadHistoryError'));
      setOrders([]);
      setPayments([]);
      setRefunds([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const mapTransactionToPayment = (transaction: FinanceTransaction): PaymentSummary => {
    return {
      id: transaction.id,
      pay_date: transaction.date || transaction.created_at,
      amount: transaction.amount_usd ?? transaction.amount ?? 0,
      currency: transaction.currency || 'USD',
      method: transaction.type_display || (transaction.type === 'income' ? 'Income' : 'Expense'),
    };
  };

  const handleExport = async () => {
    try {
      await downloadFile('/dealers/export/excel/', 'dealers.xlsx');
    } catch (error) {
      console.error(error);
      toast.error(t('dealers.messages.exportError'));
    }
  };

  const handleExportPDF = async () => {
    try {
      const params = new URLSearchParams({
        start_date: filter.start_date,
        end_date: filter.end_date,
      });
      await downloadFile(`/dealers/export/pdf/?${params.toString()}`, 'dealers_report.pdf');
      toast.success(t('dealers.messages.pdfExportSuccess'));
    } catch (error) {
      console.error(error);
      toast.error(t('dealers.messages.pdfExportError'));
    }
  };

  const handleTemplateDownload = async () => {
    try {
      await downloadFile('/dealers/import/template/', 'dealers_import_template.xlsx');
    } catch (error) {
      console.error(error);
      toast.error(t('dealers.messages.templateError'));
    }
  };

  const handleImportSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!importFile) {
      toast.error(t('dealers.messages.selectFile'));
      return;
    }
    const formData = new FormData();
    formData.append('file', importFile);
    setImporting(true);
    try {
      const response = await http.post('/dealers/import/excel/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportSummary(response.data);
      toast.success(t('dealers.messages.importSuccess'));
      setImportFile(null);
      loadDealers();
    } catch (error) {
      console.error(error);
      toast.error(t('dealers.messages.importError'));
    } finally {
      setImporting(false);
    }
  };

  const closeImportModal = () => {
    setImportModalOpen(false);
    setImportFile(null);
    setImportSummary(null);
  };

  const mobileHandlers: DealersMobileHandlers = {
    onView: (dealerId) => {
      const dealer = dealers.find((d) => d.id === dealerId);
      if (dealer) openDetails(dealer);
    },
    onEdit: (dealerId) => {
      const dealer = dealers.find((d) => d.id === dealerId);
      if (dealer) openModal(dealer);
    },
    onDelete: (dealerId) => {
      const dealer = dealers.find((d) => d.id === dealerId);
      if (dealer) handleDelete(dealer);
    },
  };

  const mobilePermissions = {
    canEdit: true,
    canDelete: true,
  };

  const filtersContent = (
    <div className="space-y-4">
      <div>
        <label className="text-label">
          {t('dealers.filters.region')}
        </label>
        <Select
          value={filter.region_id}
          onChange={(val) => handleFilterChange('region_id', String(val))}
          className="mt-1 w-full"
          options={[{ label: t('dealers.filters.allRegions'), value: '' }, ...regions.map(r => ({ label: r.name, value: String(r.id) }))]}
          placeholder={t('dealers.filters.allRegions')}
          allowClear
        />
      </div>
      <div>
        <label className="text-label">
          {t('dealers.filters.startDate', 'Boshlanish sanasi')}
        </label>
        <input
          type="date"
          value={filter.start_date}
          onChange={(e) => handleFilterChange('start_date', e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
        />
      </div>
      <div>
        <label className="text-label">
          {t('dealers.filters.endDate', 'Tugash sanasi')}
        </label>
        <input
          type="date"
          value={filter.end_date}
          onChange={(e) => handleFilterChange('end_date', e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
        />
      </div>
    </div>
  );

  // Mobile view
  if (isMobile) {
    return (
      <div className="space-y-4 px-4 pb-24">
        <header className="flex items-center justify-between py-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t('dealers.title')}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('dealers.subtitle')}</p>
          </div>
        </header>

        <FilterTrigger onClick={() => setFiltersOpen(true)} />
        <FilterDrawer
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title={t('dealers.filters.title')}
        >
          {filtersContent}
        </FilterDrawer>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-12">
            <div className="spinner" />
            <span className="text-sm text-slate-500">{t('dealers.messages.loading')}</span>
          </div>
        ) : (
          <DealersMobileCards
            data={dealers}
            handlers={mobileHandlers}
            permissions={mobilePermissions}
          />
        )}

        <button
          onClick={() => openModal()}
          className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 active:scale-95 transition-all dark:bg-emerald-500"
          aria-label={t('dealers.new')}
        >
          <PlusOutlined className="text-2xl" />
        </button>

        <PaginationControls
          page={page}
          pageSize={pageSize}
          total={total}
          setPage={setPage}
          setPageSize={setPageSize}
        />
      </div>
    );
  }

  // Desktop view
  return (
    <section className="page-wrapper space-y-6">
      {/* Header */}
      <header className="card animate-fadeInUp">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('dealers.title')}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('dealers.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <div className="flex flex-col">
                <label className="text-xs text-slate-500 mb-1">{t('dealers.filters.startDate', 'Boshlanish')}</label>
                <input
                  type="date"
                  value={filter.start_date}
                  onChange={(e) => handleFilterChange('start_date', e.target.value)}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-slate-500 mb-1">{t('dealers.filters.endDate', 'Tugash')}</label>
                <input
                  type="date"
                  value={filter.end_date}
                  onChange={(e) => handleFilterChange('end_date', e.target.value)}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                />
              </div>
            </div>
            <Select
              value={filter.region_id}
              onChange={(val) => handleFilterChange('region_id', String(val))}
              style={{ width: 200 }}
              options={[{ label: t('dealers.filters.allRegions'), value: '' }, ...regions.map(r => ({ label: r.name, value: String(r.id) }))]}
              placeholder={t('dealers.filters.allRegions')}
              allowClear
            />
            <button
              onClick={handleExportPDF}
              className="btn btn-ghost btn-sm"
              title={t('dealers.exportPdf', 'PDF yuklab olish')}
            >
              📄 PDF
            </button>
            <button
              onClick={handleTemplateDownload}
              className="btn btn-ghost btn-sm"
            >
              {t('dealers.importTemplate')}
            </button>
            <button
              onClick={handleExport}
              className="btn btn-ghost btn-sm"
            >
              {t('dealers.exportExcel')}
            </button>
            <button
              onClick={() => setImportModalOpen(true)}
              className="btn btn-secondary btn-sm"
            >
              {t('dealers.importExcel')}
            </button>
            <button
              onClick={() => openModal()}
              className="btn btn-primary"
            >
              <PlusOutlined />
              <span className="ml-2">{t('dealers.new')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Table */}
      <div className="card overflow-x-auto animate-fadeInUp">
        <table className="modern-table">
          <thead>
            <tr>
              <th>{t('dealers.table.dealer')}</th>
              <th>{t('dealers.table.region')}</th>
              <th>{t('dealers.table.manager')}</th>
              <th className="text-right">{t('dealers.table.balanceUsd')}</th>
              <th className="text-right">{t('dealers.table.balanceUzs')}</th>
              <th>{t('dealers.table.phone')}</th>
              <th>{t('dealers.table.address')}</th>
              <th className="text-center">{t('dealers.table.status')}</th>
              <th className="text-center">KPI</th>
              <th className="text-right">{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={10}>
                  <div className="flex items-center justify-center gap-3 py-12">
                    <div className="spinner" />
                    <span>{t('dealers.messages.loading')}</span>
                  </div>
                </td>
              </tr>
            )}
            {!loading &&
              dealers.map((dealer) => {
                const balanceUsd = dealer.current_balance_usd ?? 0;
                const balanceUzs = (dealer.current_balance_uzs && dealer.current_balance_uzs !== 0) 
                  ? dealer.current_balance_uzs 
                  : dealer.converted_balance_uzs;
                
                const balanceUsdClass =
                  balanceUsd < 0
                    ? 'text-rose-600 dark:text-rose-300'
                    : balanceUsd > 0
                      ? 'text-emerald-600 dark:text-emerald-300'
                      : 'text-slate-600 dark:text-slate-200';
                const balanceUzsClass =
                  balanceUzs < 0
                    ? 'text-rose-600 dark:text-rose-300'
                    : balanceUzs > 0
                      ? 'text-emerald-600 dark:text-emerald-300'
                      : 'text-slate-600 dark:text-slate-200';
                
                return (
                  <tr key={dealer.id}>
                    <td>
                      <div className="font-semibold">{dealer.name}</div>
                      <p className="text-xs text-slate-500">{dealer.code}</p>
                    </td>
                    <td>{dealer.region}</td>
                    <td>{dealer.manager}</td>
                    <td className={`text-right font-semibold ${balanceUsdClass}`}>
                      <span className="text-number">
                        ${balanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className={`text-right font-semibold ${balanceUzsClass}`}>
                      <span className="text-number">
                        {balanceUzs.toLocaleString('uz-UZ')} so'm
                      </span>
                    </td>
                    <td>{dealer.phone || '—'}</td>
                    <td>
                      <div className="max-w-xs truncate" title={dealer.address}>
                        {dealer.address || '—'}
                      </div>
                    </td>
                    <td className="text-center">
                      {dealer.is_active ? (
                        <span className="badge badge-success">
                          {t('dealers.status.active')}
                        </span>
                      ) : (
                        <span className="badge badge-info">
                          {t('dealers.status.inactive')}
                        </span>
                      )}
                    </td>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={dealer.include_in_manager_kpi ?? true}
                        onChange={(e) => handleKPIToggle(dealer.id, e.target.checked)}
                        className="checkbox checkbox-sm"
                        title={dealer.include_in_manager_kpi ? 'Menejer KPI ga kiradi' : 'Menejer KPI ga kirmaydi'}
                      />
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          className="btn btn-ghost btn-sm" 
                          onClick={() => openDetails(dealer)}
                        >
                          {t('dealers.viewDetails')}
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          onClick={() => openModal(dealer)}
                        >
                          {t('actions.edit')}
                        </button>
                        <button 
                          className="btn btn-danger btn-sm" 
                          onClick={() => handleDelete(dealer)}
                        >
                          {t('actions.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            {!loading && dealers.length === 0 && (
              <tr>
                <td colSpan={9}>
                  <div className="card border-dashed text-center py-12">
                    <p className="text-slate-500 dark:text-slate-400">
                      {t('dealers.messages.noDealers')}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="sticky bottom-0 card bg-white/90 dark:bg-slate-900/90 backdrop-blur">
        <PaginationControls
          page={page}
          pageSize={pageSize}
          total={total}
          setPage={setPage}
          setPageSize={setPageSize}
        />
      </div>

      {/* Import Modal */}
      <Modal
        open={importModalOpen}
        onClose={closeImportModal}
        title={t('dealers.importTitle')}
        footer={
          <>
            <button
              type="button"
              onClick={closeImportModal}
              className="btn btn-secondary"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              form="dealer-import-form"
              disabled={importing}
              className="btn btn-success"
            >
              {importing ? (
                <>
                  <div className="spinner" />
                  <span>{t('dealers.importing')}</span>
                </>
              ) : (
                t('dealers.startImport')
              )}
            </button>
          </>
        }
      >
        <form id="dealer-import-form" onSubmit={handleImportSubmit} className="space-y-4">
          <div>
            <label className="text-label">{t('dealers.form.excelFile')}</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
              className="input-field mt-1 w-full"
            />
          </div>
          {importSummary && (
            <div className="card bg-slate-50 dark:bg-slate-800">
              <p>{t('dealers.importSummary.created')}: {importSummary.created}</p>
              <p>{t('dealers.importSummary.updated')}: {importSummary.updated}</p>
              {typeof importSummary.skipped === 'number' && <p>{t('dealers.importSummary.skipped')}: {importSummary.skipped}</p>}
            </div>
          )}
        </form>
      </Modal>

      {/* Edit/Create Modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          if (!saving) {
            setModalOpen(false);
            setForm(emptyForm);
            setEditing(null);
          }
        }}
        title={editing ? t('dealers.editTitle') : t('dealers.addTitle')}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                setForm(emptyForm);
                setEditing(null);
              }}
              className="btn btn-secondary"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              form="dealer-form"
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? (
                <>
                  <div className="spinner" />
                  <span>{t('actions.saving')}</span>
                </>
              ) : (
                t('actions.save')
              )}
            </button>
          </>
        }
      >
        <form id="dealer-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-label">{t('dealers.form.name')}</label>
              <input
                required
                name="name"
                value={form.name}
                onChange={handleChange}
                className="input-field mt-1 w-full"
              />
            </div>
            <div>
              <label className="text-label">{t('dealers.form.code')}</label>
              <input
                required
                name="code"
                value={form.code}
                onChange={handleChange}
                className="input-field mt-1 w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-label">{t('dealers.form.phone')}</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder={t('dealers.form.phonePlaceholder')}
                className="input-field mt-1 w-full"
              />
            </div>
            <div>
              <label className="text-label">{t('dealers.form.contact')}</label>
              <input
                name="contact"
                value={form.contact}
                onChange={handleChange}
                className="input-field mt-1 w-full"
              />
            </div>
          </div>
          <div>
            <label className="text-label">{t('dealers.form.address')}</label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange as any}
              rows={2}
              placeholder={t('dealers.form.addressPlaceholder')}
              className="input-field mt-1 w-full"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-label">{t('dealers.form.region')}</label>
              <Select
                value={form.region_id === '' ? '' : String(form.region_id)}
                onChange={(val) => setForm((prev) => ({ ...prev, region_id: val ? Number(val) : '' }))}
                className="mt-1 w-full"
                options={[{ label: t('dealers.form.selectRegion'), value: '' }, ...regions.map(r => ({ label: r.name, value: String(r.id) }))]}
                placeholder={t('dealers.form.selectRegion')}
                allowClear
              />
            </div>
            <div>
              <label className="text-label">{t('dealers.form.manager')}</label>
              <Select
                value={form.manager_user_id === '' ? '' : String(form.manager_user_id)}
                onChange={(val) => setForm((prev) => ({ ...prev, manager_user_id: val ? Number(val) : '' }))}
                className="mt-1 w-full"
                options={[{ label: t('dealers.form.unassigned'), value: '' }, ...managers.map(m => ({ label: (m.first_name || m.last_name) ? `${m.first_name} ${m.last_name}`.trim() : m.username, value: String(m.id) }))]}
                placeholder={t('dealers.form.unassigned')}
                allowClear
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-label">{t('dealers.form.openingBalanceUsd')}</label>
              <input
                type="number"
                step="0.01"
                name="opening_balance_usd"
                value={form.opening_balance_usd}
                onChange={handleChange}
                placeholder={t('dealers.form.balancePlaceholder')}
                className="input-field mt-1 w-full"
              />
            </div>
            <div>
              <label className="text-label">{t('dealers.form.openingBalanceUzs')}</label>
              <input
                type="number"
                step="0.01"
                name="opening_balance_uzs"
                value={form.opening_balance_uzs}
                onChange={handleChange}
                placeholder={t('dealers.form.balancePlaceholder')}
                className="input-field mt-1 w-full"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setOrders([]);
          setPayments([]);
        }}
        title={selectedDealer ? `${selectedDealer.name} ${t('dealers.overview')}` : t('dealers.overview')}
        widthClass="max-w-4xl"
      >
        {detailLoading && (
          <div className="flex items-center justify-center gap-3 py-8">
            <div className="spinner" />
            <span>{t('dealers.messages.loadingDetails')}</span>
          </div>
        )}
        {!detailLoading && selectedDealer && (
          <div className="space-y-6">
            {/* Recent Orders */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300 mb-3">
                {t('dealers.recentOrders')}
              </h4>
              {orders.length === 0 && (
                <div className="card border-dashed text-center py-8">
                  <p className="text-sm text-slate-500">{t('dealers.messages.noOrders')}</p>
                </div>
              )}
              {orders.length > 0 && (
                <div className="card">
                  <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                    {orders.slice(0, 5).map((order) => (
                      <li key={order.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="font-semibold">{order.display_no}</p>
                          <p className="text-xs text-slate-500 uppercase">
                            {t('dealers.status')}: <span className="badge badge-info">{order.status}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-number">{formatCurrency(order.total_usd)}</p>
                          <p className="text-xs text-slate-500">{order.value_date}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Recent Payments */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300 mb-3">
                {t('dealers.recentPayments')}
              </h4>
              {payments.length === 0 && (
                <div className="card border-dashed text-center py-8">
                  <p className="text-sm text-slate-500">{t('dealers.messages.noPayments')}</p>
                </div>
              )}
              {payments.length > 0 && (
                <div className="space-y-3">
                  {payments.slice(0, 5).map((payment) => (
                    <div key={payment.id} className="card bg-slate-50 dark:bg-slate-800">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-lg font-bold text-number">
                            <Money value={payment.amount} currency={payment.currency || 'USD'} />
                          </p>
                          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                            {payment.method}
                          </p>
                        </div>
                        <div className="badge badge-success">
                          {payment.pay_date}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Refunds */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300 mb-3">
                {t('dealers.recentRefunds')}
              </h4>
              {refunds.length === 0 && (
                <div className="card border-dashed text-center py-8">
                  <p className="text-sm text-slate-500">{t('dealers.messages.noRefunds')}</p>
                </div>
              )}
              {refunds.length > 0 && (
                <div className="space-y-3">
                  {refunds.slice(0, 5).map((refund) => (
                    <div key={refund.id} className="card bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-lg font-bold text-number text-orange-600 dark:text-orange-400">
                            <Money value={refund.amount} currency={refund.currency || 'USD'} />
                          </p>
                          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                            {refund.method}
                          </p>
                          {refund.description && (
                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                              {refund.description}
                            </p>
                          )}
                        </div>
                        <div className="badge badge-warning">
                          {refund.date}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
};

export default DealersPage;