import type { ChangeEvent, FormEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

import http from '../app/http';
import { useAuthStore } from '../auth/useAuthStore';
import Modal from '../components/Modal';
import PaginationControls from '../components/PaginationControls';
import { usePersistedPageSize } from '../hooks/usePageSize';
import { toArray } from '../utils/api';
import { formatCurrency } from '../utils/formatters';
import { downloadFile } from '../utils/download';
import Money from '../components/Money';

interface Region {
  id: number;
  name: string;
}

interface Manager {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
}

interface Dealer {
  id: number;
  name: string;
  code: string;
  contact: string;
  opening_balance_usd: number;
  region: Region | null;
  region_id?: number | null;
  manager_user?: string | null;
  manager_user_id?: number | null;
  balance: string | number;
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

const emptyForm = {
  name: '',
  code: '',
  contact: '',
  opening_balance_usd: '',
  region_id: '' as number | '',
  manager_user_id: '' as number | '',
};

const DealersPage = () => {
  const { t } = useTranslation();
  const role = useAuthStore((state) => state.role);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [filter, setFilter] = useState({ region_id: '' });
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editing, setEditing] = useState<Dealer | null>(null);
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [payments, setPayments] = useState<PaymentSummary[]>([]);
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
  }, [filter, page, pageSize]);

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

  const handleFilterChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setFilter({ region_id: event.target.value });
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
        opening_balance_usd: String(dealer.opening_balance_usd ?? 0),
        region_id: dealer.region?.id ?? '',
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
      opening_balance_usd: Number(form.opening_balance_usd || 0),
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

  const openDetails = async (dealer: Dealer) => {
    setSelectedDealer(dealer);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const [ordersRes, paymentsRes] = await Promise.all([
        http.get('/orders/', { params: { dealer: dealer.id, ordering: '-created_at' } }),
        http.get('/payments/', { params: { dealer: dealer.id, ordering: '-pay_date' } }),
      ]);
      setOrders(toArray<OrderSummary>(ordersRes.data));
      setPayments(toArray<PaymentSummary>(paymentsRes.data));
    } catch (error) {
      console.error(error);
      toast.error(t('dealers.messages.loadHistoryError'));
    } finally {
      setDetailLoading(false);
    }
  };

  const managerLabel = (manager?: Dealer['manager_user']) => manager ?? '—';

  const handleExport = async () => {
    try {
      await downloadFile('/dealers/export/excel/', 'dealers.xlsx');
    } catch (error) {
      console.error(error);
      toast.error(t('dealers.messages.exportError'));
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

  return (
    <section className="page-wrapper space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('dealers.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('dealers.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filter.region_id}
            onChange={handleFilterChange}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="">{t('dealers.filters.allRegions')}</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleTemplateDownload}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {t('dealers.importTemplate')}
          </button>
          <button
            onClick={handleExport}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {t('dealers.exportExcel')}
          </button>
          <button
            onClick={() => setImportModalOpen(true)}
            className="rounded-lg border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-200 dark:hover:bg-emerald-900/30"
          >
            {t('dealers.importExcel')}
          </button>
          <button
            onClick={() => openModal()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-emerald-500 dark:text-slate-900"
          >
            {t('dealers.new')}
          </button>
        </div>
      </header>

      <div className="table-wrapper overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/40">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">{t('dealers.table.dealer')}</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">{t('dealers.table.region')}</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">{t('dealers.table.manager')}</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">{t('dealers.table.balanceUsd')}</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                  {t('dealers.messages.loading')}
                </td>
              </tr>
            )}
            {!loading &&
              dealers.map((dealer) => {
                const rawBalance = typeof dealer.balance === 'string' ? parseFloat(dealer.balance) : dealer.balance ?? 0;
                const balanceValue = Number.isFinite(rawBalance) ? rawBalance : 0;
                const balanceClass =
                  balanceValue < 0
                    ? 'text-rose-600 dark:text-rose-300'
                    : balanceValue > 0
                      ? 'text-emerald-600 dark:text-emerald-300'
                      : 'text-slate-600 dark:text-slate-200';
                return (
                  <tr key={dealer.id}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{dealer.name}</div>
                      <p className="text-xs text-slate-500">{dealer.code}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-200">{dealer.region?.name ?? 'вЂ”'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-200">{managerLabel(dealer.manager_user)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${balanceClass}`}>
                      {formatCurrency(balanceValue ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button className="text-slate-600 hover:text-slate-900 dark:text-slate-300" onClick={() => openDetails(dealer)}>
                          {t('dealers.viewDetails')}
                        </button>
                        <button className="text-slate-600 hover:text-slate-900 dark:text-slate-300" onClick={() => openModal(dealer)}>
                          {t('actions.edit')}
                        </button>
                        <button className="text-rose-600 hover:text-rose-800 dark:text-rose-300" onClick={() => handleDelete(dealer)}>
                          {t('actions.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            {!loading && dealers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                  {t('dealers.messages.noDealers')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-0 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
        <PaginationControls
          page={page}
          pageSize={pageSize}
          total={total}
          setPage={setPage}
          setPageSize={setPageSize}
        />
      </div>
      <Modal
        open={importModalOpen}
        onClose={closeImportModal}
        title={t('dealers.importTitle')}
        footer={
          <>
            <button
              type="button"
              onClick={closeImportModal}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              form="dealer-import-form"
              disabled={importing}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {importing ? t('dealers.importing') : t('dealers.startImport')}
            </button>
          </>
        }
      >
        <form id="dealer-import-form" onSubmit={handleImportSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('dealers.form.excelFile')}</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          {importSummary && (
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <p>{t('dealers.importSummary.created')}: {importSummary.created}</p>
              <p>{t('dealers.importSummary.updated')}: {importSummary.updated}</p>
              {typeof importSummary.skipped === 'number' && <p>{t('dealers.importSummary.skipped')}: {importSummary.skipped}</p>}
            </div>
          )}
        </form>
      </Modal>

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
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              form="dealer-form"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60 dark:bg-emerald-500 dark:text-slate-900"
            >
              {saving ? t('actions.saving') : t('actions.save')}
            </button>
          </>
        }
      >
        <form id="dealer-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('dealers.form.name')}</label>
              <input
                required
                name="name"
                value={form.name}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('dealers.form.code')}</label>
              <input
                required
                name="code"
                value={form.code}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('dealers.form.contact')}</label>
            <input
              name="contact"
              value={form.contact}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('dealers.form.region')}</label>
              <select
                name="region_id"
                value={form.region_id}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">{t('dealers.form.selectRegion')}</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('dealers.form.manager')}</label>
              <select
                name="manager_user_id"
                value={form.manager_user_id}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">{t('dealers.form.unassigned')}</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.first_name || manager.last_name ? `${manager.first_name} ${manager.last_name}`.trim() : manager.username}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('dealers.form.openingBalance')}</label>
            <input
              type="number"
              step="0.01"
              name="opening_balance_usd"
              value={form.opening_balance_usd}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </form>
      </Modal>

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
        {detailLoading && <p className="text-sm text-slate-500">{t('dealers.messages.loadingDetails')}</p>}
        {!detailLoading && selectedDealer && (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">{t('dealers.recentOrders')}</h4>
              {orders.length === 0 && <p className="text-sm text-slate-500">{t('dealers.messages.noOrders')}</p>}
              {orders.length > 0 && (
                <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                  {orders.slice(0, 5).map((order) => (
                    <li key={order.id} className="flex items-center justify-between px-4 py-2 text-sm">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{order.display_no}</p>
                        <p className="text-xs uppercase tracking-widest text-slate-500">{t('dealers.status')}: {order.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900 dark:text-white">{formatCurrency(order.total_usd)}</p>
                        <p className="text-xs text-slate-500">{order.value_date}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">{t('dealers.recentPayments')}</h4>
              {payments.length === 0 && <p className="text-sm text-slate-500">{t('dealers.messages.noPayments')}</p>}
              {payments.length > 0 && (
                <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                  {payments.slice(0, 5).map((payment) => (
                    <li key={payment.id} className="flex items-center justify-between px-4 py-2 text-sm">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                    <Money value={payment.amount} currency={payment.currency || 'USD'} />
                        </p>
                        <p className="text-xs uppercase tracking-widest text-slate-500">{payment.method}</p>
                      </div>
                      <p className="text-xs text-slate-500">{payment.pay_date}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
};

export default DealersPage;

