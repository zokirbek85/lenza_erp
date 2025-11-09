import type { ChangeEvent, FormEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

import http from '../app/http';
import PaginationControls from '../components/PaginationControls';
import { usePersistedPageSize } from '../hooks/usePageSize';
import { downloadFile } from '../utils/download';
import { formatCurrency, formatDate } from '../utils/formatters';
import { toArray } from '../utils/api';

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
  method: string;
  pay_date: string;
  note: string;
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
  note: '',
};

const PaymentsPage = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [rates, setRates] = useState<CurrencyRate[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [filtersState, setFiltersState] = useState({ dealer: '', from: '', to: '' });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePersistedPageSize('payments_page_size');
  const [total, setTotal] = useState(0);
  const { t } = useTranslation();

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await http.get('/api/payments/', {
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
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [filtersState, page, pageSize]);

  useEffect(() => {
    const loadRefs = async () => {
      const [dealersRes, ratesRes] = await Promise.all([http.get('/api/dealers/'), http.get('/api/currency-rates/')]);
      setDealers(toArray<Dealer>(dealersRes.data));
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
    const payload = {
      dealer: Number(form.dealer),
      pay_date: form.pay_date || new Date().toISOString().slice(0, 10),
      amount: Number(form.amount || 0),
      currency: form.currency,
      rate_id: form.currency === 'UZS' ? Number(form.rate_id) : null,
      method: form.method,
      note: form.note,
    };
    try {
      await http.post('/api/payments/', payload);
      toast.success('Payment recorded');
      setForm(defaultForm);
      loadPayments();
    } catch (error) {
      console.error(error);
      toast.error('Failed to create payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportPdf = () => downloadFile('/api/payments/report/pdf/', 'payments.pdf');
  const handleExportExcel = () => downloadFile('/api/payments/export/excel/', 'payments.xlsx');

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('nav.payments')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">To&apos;lovlar va valyuta konvertatsiyasi.</p>
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
        </div>
      </header>

      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-4">
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('nav.dealers')}</label>
          <select
            name="dealer"
            value={filtersState.dealer}
            onChange={handleFilterInput}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">All dealers</option>
            {dealers.map((dealer) => (
              <option key={dealer.id} value={dealer.id}>
                {dealer.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">From</label>
          <input
            type="date"
            name="from"
            value={filtersState.from}
            onChange={handleFilterInput}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">To</label>
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
            Refresh
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Reset
          </button>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3"
      >
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('nav.dealers')}</label>
          <select
            required
            name="dealer"
            value={form.dealer}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">Tanlang</option>
            {dealers.map((dealer) => (
              <option key={dealer.id} value={dealer.id}>
                {dealer.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('app.operations')}</label>
          <input
            type="date"
            name="pay_date"
            value={form.pay_date}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Summasi</label>
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
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Valyuta</label>
          <select
            name="currency"
            value={form.currency}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="USD">USD</option>
            <option value="UZS">UZS</option>
          </select>
        </div>
        {form.currency === 'UZS' && (
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Valyuta kursi</label>
            <select
              name="rate_id"
              value={form.rate_id}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">Tanlang</option>
              {rates.map((rate) => (
                <option key={rate.id} value={rate.id}>
                  {rate.rate_date} → {rate.usd_to_uzs}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Usul</label>
          <select
            name="method"
            value={form.method}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="cash">Naqd</option>
            <option value="card">Karta</option>
            <option value="transfer">Bank</option>
          </select>
        </div>
        <div className="md:col-span-3">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Izoh</label>
          <textarea
            name="note"
            value={form.note}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            rows={2}
          />
        </div>
        <div className="md:col-span-3">
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-700 disabled:opacity-60 dark:bg-emerald-500 dark:text-slate-900"
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Saving…' : t('actions.save')}
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">{t('nav.dealers')}</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">{t('app.operations')}</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">Valyuta</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">USD</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">Usul</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-300">
                  Loading payments...
                </td>
              </tr>
            )}
            {!loading &&
              payments.map((payment) => (
                <tr key={payment.id}>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900 dark:text-white">{payment.dealer?.name ?? '—'}</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{payment.note || '—'}</p>
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{formatDate(payment.pay_date)}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                  {formatCurrency(payment.amount, payment.currency)} ({payment.currency})
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(payment.amount_usd)}</td>
                <td className="px-4 py-3 capitalize text-slate-700 dark:text-slate-200">{payment.method}</td>
              </tr>
            ))}
            {!loading && payments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-300">
                  To&apos;lovlar topilmadi
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
