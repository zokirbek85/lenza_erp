import type { ChangeEvent, FormEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

import { useAuthStore } from '../auth/useAuthStore';
import http from '../app/http';
import { fetchAllDealers } from '../utils/api';
import PaginationControls from '../components/PaginationControls';
import { usePersistedPageSize } from '../hooks/usePageSize';
import { useIsMobile } from '../hooks/useIsMobile';
import { downloadFile } from '../utils/download';
import { formatCurrency, formatDate } from '../utils/formatters';
import { toArray } from '../utils/api';
import CollapsibleForm from '../components/CollapsibleForm';
import FilterDrawer from '../components/responsive/filters/FilterDrawer';
import FilterTrigger from '../components/responsive/filters/FilterTrigger';
import PaymentsMobileCards from './_mobile/PaymentsMobileCards';
import type { PaymentsMobileHandlers } from './_mobile/PaymentsMobileCards';
import MobilePaymentForm from './_mobile/MobilePaymentForm';

interface Dealer {
  id: number;
  name: string;
}

interface Payment {
  id: number;
  dealer: Dealer | null;
  amount: number;
  currency: string;
  amount_usd: number;
  amount_uzs: number;
  method: string;
  card?: { id: number; name: string; number: string; holder_name: string; masked_number: string } | null;
  pay_date: string;
  note: string;
  status: 'pending' | 'approved' | 'rejected' | 'confirmed';
  created_by?: number;
  created_by_username?: string;
  created_by_fullname?: string;
  approved_by?: number;
  approved_by_username?: string;
  approved_by_fullname?: string;
  approved_at?: string;
  receipt_image?: string;
  receipt_image_url?: string;
}

interface CurrencyRate {
  id: number;
  rate_date: string;
  usd_to_uzs: number;
}

const defaultForm = {
  dealer: '',
  pay_date: '',
  amount: '',
  currency: 'USD',
  rate_id: '',
  method: 'cash',
  card_id: '',
  note: '',
  receipt_image: null as File | null,
};

const PaymentsPage = () => {
  const navigate = useNavigate();
  const role = useAuthStore((state) => state.role);
  const isSalesManager = role === 'sales';
  const { isMobile } = useIsMobile();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [rates, setRates] = useState<CurrencyRate[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [filtersState, setFiltersState] = useState({ dealer: '', from: '', to: '' });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePersistedPageSize('payments_page_size');
  const [total, setTotal] = useState(0);
  const { t } = useTranslation();

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await http.get('/payments/', {
        params: {
          page,
          page_size: pageSize,
          dealer: filtersState.dealer || undefined,
          pay_date__gte: filtersState.from || undefined,
          pay_date__lte: filtersState.to || undefined,
          ordering: '-pay_date',
        },
      });
      const data = response.data;
      let normalized: Payment[];
      if (data && typeof data === 'object' && Array.isArray(data.results)) {
        normalized = data.results as Payment[];
        setTotal(Number(data.count) || 0);
      } else {
        normalized = toArray<Payment>(data);
        setTotal(normalized.length);
      }
      setPayments(normalized);
    } catch (error) {
      console.error(error);
      toast.error(t('payments.messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [filtersState, page, pageSize]);

  useEffect(() => {
    const loadRefs = async () => {
      const [dealers, ratesRes] = await Promise.all([
        fetchAllDealers<Dealer>(),
        http.get('/currency-rates/')
      ]);
      setDealers(dealers);
      setRates(toArray<CurrencyRate>(ratesRes.data));
    };
    loadRefs();
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

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

  useEffect(() => {
    const handler = () => {
      loadPayments();
    };
    window.addEventListener('payments:refresh', handler);
    return () => window.removeEventListener('payments:refresh', handler);
  }, [loadPayments]);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, receipt_image: file }));
  };

  const handleFilterInput = (event: ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = event.target;
    setFiltersState((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFiltersState({ dealer: '', from: '', to: '' });
    setPage(1);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    
    const formData = new FormData();
    formData.append('dealer', form.dealer);
    formData.append('pay_date', form.pay_date || new Date().toISOString().slice(0, 10));
    formData.append('amount', form.amount);
    formData.append('currency', form.currency);
    if (form.currency === 'UZS' && form.rate_id) {
      formData.append('rate_id', form.rate_id);
    }
    formData.append('method', form.method);
    if (form.method === 'card' && form.card_id) {
      formData.append('card_id', form.card_id);
    }
    formData.append('note', form.note);
    if (form.receipt_image) {
      formData.append('receipt_image', form.receipt_image);
    }
    
    try {
      await http.post('/payments/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(t('payments.messages.created'));
      setForm(defaultForm);
      setShowForm(false);
      loadPayments();
    } catch (error) {
      console.error(error);
      toast.error(t('payments.messages.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (paymentId: number) => {
    if (!window.confirm(t('payments.confirmApprove'))) return;
    try {
      await http.post(`/payments/${paymentId}/approve/`);
      toast.success(t('payments.messages.approved'));
      loadPayments();
    } catch (error) {
      console.error(error);
      toast.error(t('payments.messages.approveError'));
    }
  };

  const handleReject = async (paymentId: number) => {
    if (!window.confirm(t('payments.confirmReject'))) return;
    try {
      await http.post(`/payments/${paymentId}/reject/`);
      toast.success(t('payments.messages.rejected'));
      loadPayments();
    } catch (error) {
      console.error(error);
      toast.error(t('payments.messages.rejectError'));
    }
  };

  const handleExportPdf = () => downloadFile('/payments/export/?format=pdf', 'payments.pdf');
  const handleExportExcel = () => downloadFile('/payments/export/?format=xlsx', 'payments.xlsx');

  useEffect(() => {
    const loadCards = async () => {
      try {
  const res = await http.get('/payment-cards/', { params: { is_active: true } });
        setCards(toArray(res.data));
      } catch (e) {
        console.error(e);
      }
    };
    if (form.method === 'card') {
      loadCards();
    }
  }, [form.method]);

  const canApprove = !isSalesManager; // accountant or admin

  // Mobile handlers
  const mobileHandlers: PaymentsMobileHandlers = {
    onView: (paymentId) => {
      console.log('View payment:', paymentId);
    },
    onEdit: (paymentId) => {
      // For future implementation
      console.log('Edit payment:', paymentId);
    },
    onDelete: (paymentId) => {
      if (window.confirm(t('payments.confirmDelete'))) {
        http.delete(`/payments/${paymentId}/`)
          .then(() => {
            toast.success(t('payments.messages.deleted'));
            loadPayments();
          })
          .catch((error) => {
            console.error(error);
            toast.error(t('payments.messages.deleteError'));
          });
      }
    },
    onApprove: canApprove ? handleApprove : undefined,
    onReject: canApprove ? handleReject : undefined,
  };

  const mobilePermissions = {
    canEdit: canApprove,
    canDelete: canApprove,
    canApprove: canApprove,
  };

  // Filters content
  const filtersContent = (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {t('payments.dealer')}
        </label>
        <select
          name="dealer"
          value={filtersState.dealer}
          onChange={handleFilterInput}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">{t('payments.allDealers')}</option>
          {dealers.map((dealer) => (
            <option key={dealer.id} value={dealer.id}>
              {dealer.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {t('payments.from')}
        </label>
        <input
          type="date"
          name="from"
          value={filtersState.from}
          onChange={handleFilterInput}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {t('payments.to')}
        </label>
        <input
          type="date"
          name="to"
          value={filtersState.to}
          onChange={handleFilterInput}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
        />
      </div>
    </div>
  );

  // Mobile view
  if (isMobile) {
    return (
      <div className="space-y-4 px-4 pb-6">
        <header className="flex items-center justify-between py-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t('payments.title')}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('payments.subtitle')}</p>
          </div>
        </header>

        <FilterTrigger onClick={() => setFiltersOpen(true)} />
        <FilterDrawer
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title={t('payments.filters.title')}
        >
          {filtersContent}
        </FilterDrawer>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            {t('payments.loading')}
          </div>
        ) : (
          <PaymentsMobileCards
            data={payments}
            handlers={mobileHandlers}
            permissions={mobilePermissions}
          />
        )}

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
  <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('payments.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('payments.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportPdf}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            {t('actions.exportPdf')}
          </button>
          <button
            onClick={handleExportExcel}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-emerald-500 dark:text-slate-900"
          >
            {t('actions.exportExcel')}
          </button>
          <button
            onClick={() => navigate('/settings/cards')}
            className="rounded-lg border border-emerald-500 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
          >
            + {t('payments.addCard')}
          </button>
        </div>
      </header>

      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-4">
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('payments.dealer')}</label>
          <select
            name="dealer"
            value={filtersState.dealer}
            onChange={handleFilterInput}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">{t('payments.allDealers')}</option>
            {dealers.map((dealer) => (
              <option key={dealer.id} value={dealer.id}>
                {dealer.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('payments.from')}</label>
          <input
            type="date"
            name="from"
            value={filtersState.from}
            onChange={handleFilterInput}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('payments.to')}</label>
          <input
            type="date"
            name="to"
            value={filtersState.to}
            onChange={handleFilterInput}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div className="flex items-end gap-3">
          <button
            type="button"
            onClick={() => loadPayments()}
            className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-emerald-500 dark:text-slate-900"
          >
            {t('payments.refresh')}
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {t('payments.reset')}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-emerald-500 dark:text-slate-900"
          aria-expanded={showForm}
          aria-controls="payment-create-form"
        >
          {showForm ? `− ${t('payments.closeForm')}` : `+ ${t('payments.newPayment')}`}
        </button>
      </div>

      {/* Mobile Payment Form */}
      {isMobile && (
        <MobilePaymentForm
          open={showForm}
          onClose={() => {
            setShowForm(false);
            setForm(defaultForm);
          }}
          form={form}
          dealers={dealers}
          rates={rates}
          cards={cards}
          onFormChange={(field, value) => {
            if (field === 'receipt_image') {
              setForm({ ...form, [field]: value as File | null });
            } else {
              setForm({ ...form, [field]: value as string });
            }
          }}
          onSubmit={() => handleSubmit({} as any)}
          submitting={submitting}
        />
      )}

      {/* Desktop Form */}
      {!isMobile && (
        <CollapsibleForm
        open={showForm}
        onAfterClose={() => setForm(defaultForm)}
        className="mt-3 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <form
          id="payment-create-form"
          onSubmit={handleSubmit}
          className="grid gap-4 p-4 md:grid-cols-3"
        >
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('payments.dealer')}</label>
          <select
            required
            name="dealer"
            value={form.dealer}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">{t('payments.select')}</option>
            {dealers.map((dealer) => (
              <option key={dealer.id} value={dealer.id}>
                {dealer.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('payments.date')}</label>
          <input
            type="date"
            name="pay_date"
            value={form.pay_date}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('payments.amount')}</label>
          <input
            name="amount"
            value={form.amount}
            onChange={handleChange}
            type="number"
            step="0.01"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('payments.currency')}</label>
          <select
            name="currency"
            value={form.currency}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="USD">{t('payments.usd')}</option>
            <option value="UZS">{t('payments.uzs')}</option>
          </select>
        </div>
        {form.currency === 'UZS' && (
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('payments.currencyRate')}</label>
            <select
              name="rate_id"
              value={form.rate_id}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">{t('payments.select')}</option>
              {rates.map((rate) => (
                <option key={rate.id} value={rate.id}>
                  {rate.rate_date} в†’ {rate.usd_to_uzs}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('payments.method')}</label>
          <select
            name="method"
            value={form.method}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="cash">{t('payments.cash')}</option>
            <option value="card">{t('payments.card')}</option>
            <option value="transfer">{t('payments.transfer')}</option>
          </select>
        </div>
        {form.method === 'card' && (
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('payments.card')}</label>
            <select
              required
              name="card_id"
              value={form.card_id}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">{t('payments.select')}</option>
              {cards.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name} вЂ” {(c.masked_number) || `${String(c.number).slice(0,4)} **** ${String(c.number).slice(-4)}`} ({c.holder_name})
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="md:col-span-3">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('payments.note')}</label>
          <textarea
            name="note"
            value={form.note}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            rows={2}
          />
        </div>
        <div className="md:col-span-3">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Receipt Image (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          {form.receipt_image && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Selected: {form.receipt_image.name}
            </p>
          )}
        </div>
        <div className="md:col-span-3">
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-700 disabled:opacity-60 dark:bg-emerald-500 dark:text-slate-900"
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'SavingвЂ¦' : t('actions.save')}
          </button>
        </div>
        </form>
      </CollapsibleForm>
      )}

      <div className="table-wrapper overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">{t('payments.dealer')}</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">{t('payments.date')}</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">{t('payments.amount')}</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">{t('payments.usd')}</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">{t('payments.uzs')}</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">{t('payments.method')}</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">{t('payments.card')}</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">Receipt</th>
              {canApprove && <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading && (
              <tr>
                <td colSpan={canApprove ? 10 : 9} className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-300">
                  {t('payments.loading')}
                </td>
              </tr>
            )}
            {!loading &&
              payments.map((payment) => (
                <tr key={payment.id}>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900 dark:text-white">{payment.dealer?.name ?? 'вЂ”'}</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{payment.note || 'вЂ”'}</p>
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{formatDate(payment.pay_date)}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                  {formatCurrency(payment.amount, payment.currency)} {payment.currency}
                </td>
                <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(payment.amount_usd)}</td>
                <td className="px-4 py-3 font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(payment.amount_uzs, 'UZS')}</td>
                <td className="px-4 py-3 capitalize text-slate-700 dark:text-slate-200">{payment.method}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                  {payment.card ? (
                    <span>
                      {payment.card.name ? `${payment.card.name} вЂ" ` : ''}
                      {payment.card.masked_number || (payment.card.number ? `${String(payment.card.number).slice(0,4)} **** ${String(payment.card.number).slice(-4)}` : '')}
                      {payment.card.holder_name ? ` (${payment.card.holder_name})` : ''}
                    </span>
                  ) : (
                    'вЂ"'
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded px-2 py-1 text-xs font-semibold ${
                    payment.status === 'approved' || payment.status === 'confirmed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    payment.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {payment.status}
                  </span>
                  {payment.created_by_fullname && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">By: {payment.created_by_fullname}</p>
                  )}
                  {payment.approved_by_fullname && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">Approved by: {payment.approved_by_fullname}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {payment.receipt_image_url ? (
                    <a href={payment.receipt_image_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">
                      View
                    </a>
                  ) : (
                    'вЂ"'
                  )}
                </td>
                {canApprove && (
                  <td className="px-4 py-3">
                    {payment.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(payment.id)}
                          className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(payment.id)}
                          className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {!loading && payments.length === 0 && (
              <tr>
                <td colSpan={canApprove ? 10 : 9} className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-300">
                  {t('payments.noPayments')}
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
    </section>
  );
};

export default PaymentsPage;
