import type { ChangeEvent, FormEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

import { useAuthStore } from '../auth/useAuthStore';
import http from '../app/http';
import PaginationControls from '../components/PaginationControls';
import { usePersistedPageSize } from '../hooks/usePageSize';
import { useIsMobile } from '../hooks/useIsMobile';
import { downloadFile } from '../utils/download';
import { formatCurrency, formatDate } from '../utils/formatters';
import { toArray } from '../utils/api';
import type { Expense, ExpenseCategory } from '../api/expensesApi';

interface Cashbox {
  id: number;
  name: string;
  cashbox_type: string;
  currency: string;
}

const defaultForm = {
  expense_date: '',
  category: '',
  cashbox: '',
  currency: 'UZS',
  amount_original: '',
  manual_rate: '',
  description: '',
};

const ExpensesPage = () => {
  const role = useAuthStore((state) => state.role);
  const { isMobile } = useIsMobile();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [cashboxes, setCashboxes] = useState<Cashbox[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [filtersState, setFiltersState] = useState({ 
    category: '', 
    cashbox: '',
    currency: '',
    status: '',
    from: '', 
    to: '' 
  });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePersistedPageSize('expenses_page_size');
  const [total, setTotal] = useState(0);
  const { t } = useTranslation();

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await http.get('/expenses/', {
        params: {
          page,
          page_size: pageSize,
          category: filtersState.category || undefined,
          cashbox: filtersState.cashbox || undefined,
          currency: filtersState.currency || undefined,
          status: filtersState.status || undefined,
          expense_date__gte: filtersState.from || undefined,
          expense_date__lte: filtersState.to || undefined,
          ordering: '-expense_date',
        },
      });
      const data = response.data;
      let normalized: Expense[];
      if (data && typeof data === 'object' && Array.isArray(data.results)) {
        normalized = data.results as Expense[];
        setTotal(Number(data.count) || 0);
      } else {
        normalized = toArray<Expense>(data);
        setTotal(normalized.length);
      }
      setExpenses(normalized);
    } catch (error) {
      console.error(error);
      toast.error(t('expenses.messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [filtersState, page, pageSize, t]);

  useEffect(() => {
    const loadRefs = async () => {
      try {
        const [categoriesRes, cashboxesRes] = await Promise.all([
          http.get('/expense-categories/'),
          http.get('/cashbox/')
        ]);
        setCategories(toArray<ExpenseCategory>(categoriesRes.data));
        setCashboxes(toArray<Cashbox>(cashboxesRes.data));
      } catch (error) {
        console.error(error);
        toast.error(t('expenses.messages.loadRefsError'));
      }
    };
    loadRefs();
  }, [t]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

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

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    
    // Auto-set currency when cashbox is selected
    if (name === 'cashbox') {
      const selectedCashbox = cashboxes.find(c => c.id === Number(value));
      if (selectedCashbox) {
        setForm(prev => ({ ...prev, currency: selectedCashbox.currency }));
      }
    }
  };

  const handleFilterInput = (event: ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = event.target;
    setFiltersState((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFiltersState({ category: '', cashbox: '', currency: '', status: '', from: '', to: '' });
    setPage(1);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    
    const payload = {
      expense_date: form.expense_date || new Date().toISOString().slice(0, 10),
      category: Number(form.category),
      cashbox: Number(form.cashbox),
      currency: form.currency,
      amount_original: form.amount_original,
      manual_rate: form.manual_rate || null,
      description: form.description,
    };
    
    try {
      await http.post('/expenses/', payload);
      toast.success(t('expenses.messages.created'));
      setForm(defaultForm);
      setShowForm(false);
      loadExpenses();
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.response?.data?.detail || error.response?.data?.currency?.[0] || t('expenses.messages.saveError');
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (expenseId: number) => {
    if (!window.confirm(t('expenses.confirmApprove'))) return;
    try {
      await http.post(`/expenses/${expenseId}/approve/`);
      toast.success(t('expenses.messages.approved'));
      loadExpenses();
    } catch (error) {
      console.error(error);
      toast.error(t('expenses.messages.approveError'));
    }
  };

  const handleDelete = async (expenseId: number) => {
    if (!window.confirm(t('expenses.confirmDelete'))) return;
    try {
      await http.delete(`/expenses/${expenseId}/`);
      toast.success(t('expenses.messages.deleted'));
      loadExpenses();
    } catch (error) {
      console.error(error);
      toast.error(t('expenses.messages.deleteError'));
    }
  };

  const handleExportPdf = () => downloadFile('/expenses/export/?format=pdf', 'expenses.pdf');
  const handleExportExcel = () => downloadFile('/expenses/export/?format=xlsx', 'expenses.xlsx');

  const canApprove = role === 'admin' || role === 'accountant';

  // Desktop view
  return (
    <section className="page-wrapper space-y-6">
      <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('expenses.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('expenses.subtitle')}</p>
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
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            {showForm ? t('actions.cancel') : t('expenses.addExpense')}
          </button>
        </div>
      </header>

      {/* Create Expense Form */}
      {showForm && (
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
            {t('expenses.createNew')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('expenses.date')} *
                </label>
                <input
                  type="date"
                  name="expense_date"
                  value={form.expense_date}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('expenses.category')} *
                </label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="">{t('expenses.selectCategory')}</option>
                  {categories.filter(c => c.is_active).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('expenses.cashbox')} *
                </label>
                <select
                  name="cashbox"
                  value={form.cashbox}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="">{t('expenses.selectCashbox')}</option>
                  {cashboxes.filter(c => c.is_active).map((cb) => (
                    <option key={cb.id} value={cb.id}>
                      {cb.name} ({cb.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('expenses.currency')} *
                </label>
                <input
                  type="text"
                  value={form.currency}
                  disabled
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('expenses.amount')} *
                </label>
                <input
                  type="number"
                  name="amount_original"
                  value={form.amount_original}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('expenses.manualRate')}
                </label>
                <input
                  type="number"
                  name="manual_rate"
                  value={form.manual_rate}
                  onChange={handleChange}
                  step="0.0001"
                  min="0"
                  placeholder={t('expenses.optionalRate')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('expenses.description')}
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {t('actions.cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {submitting ? t('expenses.saving') : t('expenses.save')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
        <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
          {t('expenses.filters.title')}
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-700 dark:text-slate-300">
              {t('expenses.category')}
            </label>
            <select
              name="category"
              value={filtersState.category}
              onChange={handleFilterInput}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">{t('expenses.allCategories')}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-slate-700 dark:text-slate-300">
              {t('expenses.cashbox')}
            </label>
            <select
              name="cashbox"
              value={filtersState.cashbox}
              onChange={handleFilterInput}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">{t('expenses.allCashboxes')}</option>
              {cashboxes.map((cb) => (
                <option key={cb.id} value={cb.id}>
                  {cb.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-slate-700 dark:text-slate-300">
              {t('expenses.currency')}
            </label>
            <select
              name="currency"
              value={filtersState.currency}
              onChange={handleFilterInput}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">{t('expenses.allCurrencies')}</option>
              <option value="USD">USD</option>
              <option value="UZS">UZS</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-slate-700 dark:text-slate-300">
              {t('expenses.status')}
            </label>
            <select
              name="status"
              value={filtersState.status}
              onChange={handleFilterInput}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">{t('expenses.allStatuses')}</option>
              <option value="pending">{t('expenses.statusPending')}</option>
              <option value="approved">{t('expenses.statusApproved')}</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-slate-700 dark:text-slate-300">
              {t('expenses.from')}
            </label>
            <input
              type="date"
              name="from"
              value={filtersState.from}
              onChange={handleFilterInput}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-slate-700 dark:text-slate-300">
              {t('expenses.to')}
            </label>
            <input
              type="date"
              name="to"
              value={filtersState.to}
              onChange={handleFilterInput}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              {t('expenses.clearFilters')}
            </button>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            {t('expenses.loading')}
          </div>
        ) : expenses.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            {t('expenses.noData')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3">{t('expenses.date')}</th>
                  <th className="px-4 py-3">{t('expenses.category')}</th>
                  <th className="px-4 py-3">{t('expenses.cashbox')}</th>
                  <th className="px-4 py-3">{t('expenses.amount')}</th>
                  <th className="px-4 py-3">{t('expenses.amountUSD')}</th>
                  <th className="px-4 py-3">{t('expenses.amountUZS')}</th>
                  <th className="px-4 py-3">{t('expenses.status')}</th>
                  <th className="px-4 py-3">{t('expenses.createdBy')}</th>
                  <th className="px-4 py-3">{t('expenses.approvedBy')}</th>
                  {canApprove && <th className="px-4 py-3 text-right">{t('expenses.actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {expenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDate(expense.expense_date)}
                    </td>
                    <td className="px-4 py-3">{expense.category_name}</td>
                    <td className="px-4 py-3">{expense.cashbox_name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatCurrency(Number(expense.amount_original), expense.currency)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatCurrency(Number(expense.amount_usd), 'USD')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatCurrency(Number(expense.amount_uzs), 'UZS')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          expense.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}
                      >
                        {expense.status === 'approved'
                          ? t('expenses.statusApproved')
                          : t('expenses.statusPending')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {expense.created_by_fullname || expense.created_by_username || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {expense.approved_by_fullname || expense.approved_by_username || '-'}
                    </td>
                    {canApprove && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {expense.status === 'pending' && (
                            <button
                              onClick={() => handleApprove(expense.id)}
                              className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-600"
                            >
                              {t('expenses.approve')}
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="rounded-lg bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600"
                          >
                            {t('expenses.delete')}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PaginationControls
        page={page}
        pageSize={pageSize}
        total={total}
        setPage={setPage}
        setPageSize={setPageSize}
      />
    </section>
  );
};

export default ExpensesPage;
