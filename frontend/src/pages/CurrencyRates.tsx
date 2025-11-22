import type { FormEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import http from '../app/http';
import { useAuthStore } from '../auth/useAuthStore';
import { toArray } from '../utils/api';

interface CurrencyRate {
  id: number;
  rate_date: string;
  usd_to_uzs: number;
}

const CurrencyRatesPage = () => {
  const { t } = useTranslation();
  const role = useAuthStore((state) => state.role);
  const isSalesManager = role === 'sales';
  const [rates, setRates] = useState<CurrencyRate[]>([]);
  const [form, setForm] = useState({ rate_date: '', usd_to_uzs: '' });

  const loadRates = useCallback(async () => {
    const response = await http.get('/currency-rates/');
    setRates(toArray<CurrencyRate>(response.data));
  }, []);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  useEffect(() => {
    const handler = () => loadRates();
    window.addEventListener('currency:refresh', handler);
    return () => window.removeEventListener('currency:refresh', handler);
  }, [loadRates]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await http.post('/currency-rates/', {
      rate_date: form.rate_date,
      usd_to_uzs: Number(form.usd_to_uzs || 0),
    });
    setForm({ rate_date: '', usd_to_uzs: '' });
    loadRates();
  };

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('currencyRates.title')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('currencyRates.description')}</p>
      </header>

      {!isSalesManager && (
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3"
        >
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('currencyRates.form.date')}</label>
            <input
              type="date"
              required
              value={form.rate_date}
              onChange={(event) => setForm((prev) => ({ ...prev, rate_date: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('currencyRates.form.usdToUzs')}</label>
            <input
              required
              type="number"
              step="0.01"
              value={form.usd_to_uzs}
              onChange={(event) => setForm((prev) => ({ ...prev, usd_to_uzs: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div className="flex items-end">
            <button
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white transition hover:bg-slate-700 dark:bg-emerald-500 dark:text-slate-900 dark:hover:bg-emerald-400"
              type="submit"
            >
              {t('actions.save')}
            </button>
          </div>
        </form>
      )}

      <div className="table-wrapper overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">{t('currencyRates.table.date')}</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">{t('currencyRates.table.rate')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rates.map((rate) => (
              <tr key={rate.id}>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{rate.rate_date}</td>
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{rate.usd_to_uzs}</td>
              </tr>
            ))}
            {rates.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  {t('currencyRates.noRates')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default CurrencyRatesPage;

