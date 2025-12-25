import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, message } from 'antd';
import {
  getFinanceTransactions,
  createFinanceTransaction,
  updateFinanceTransaction,
  approveFinanceTransaction,
  cancelFinanceTransaction,
  deleteFinanceTransaction,
  getFinanceAccounts,
  getExpenseCategories,
} from '../api/finance';
import { getDealers } from '../api/dealers';
import type { FinanceTransaction, FinanceTransactionFilters, FinanceAccount, ExpenseCategory } from '../types/finance';
import type { Dealer } from '../types/dealer';
import { exportTransactionsToPDF, exportTransactionsToXLSX } from '../utils/exportUtils';

export default function FinanceTransactions() {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FinanceTransactionFilters>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinanceTransaction | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  const [formData, setFormData] = useState({
    type: 'income' as 'income' | 'expense',
    dealer: '',
    account: '',
    date: new Date().toISOString().split('T')[0],
    currency: 'USD' as 'USD' | 'UZS',
    amount: '',
    category: '',
    comment: '',
  });

  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, [filters, page, pageSize]);

  useEffect(() => {
    loadReferenceData();
  }, []);

  const loadReferenceData = async () => {
    try {
      const accountsRes = await getFinanceAccounts({ is_active: true });
      const accountsData = Array.isArray(accountsRes.data) ? accountsRes.data : accountsRes.data?.results || [];
      setAccounts(accountsData);

      const dealersRes = await getDealers({ page_size: 1000 });
      const dealersData = Array.isArray(dealersRes.data) ? dealersRes.data : [];
      const normalizedDealers = dealersData.map((d: any) => ({
        ...d,
        updated_at: d.updated_at || d.created_at || new Date().toISOString(),
      }));
      setDealers(normalizedDealers);

      const categoriesRes = await getExpenseCategories({ is_active: true });
      const categoriesData = Array.isArray(categoriesRes.data) ? categoriesRes.data : [];
      setCategories(categoriesData);
    } catch (err) {
      console.error('Error loading reference data:', err);
    }
  };

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        ...filters,
        page,
        page_size: pageSize,
      };

      const response = await getFinanceTransactions(params);
      const data = response.data as FinanceTransaction[] | { count: number; results: FinanceTransaction[] };

      // DRF pagination format: { count, next, previous, results }
      if (data && typeof data === 'object' && !Array.isArray(data) && 'results' in data && 'count' in data) {
        const validItems = data.results.filter((item): item is FinanceTransaction => {
          return item !== null &&
                 item !== undefined &&
                 typeof item === 'object' &&
                 'id' in item &&
                 'amount' in item;
        });
        setTransactions(validItems);
        setTotalCount(data.count);
      } else if (Array.isArray(data)) {
        // Fallback: array response (no pagination)
        const validItems = data.filter((item): item is FinanceTransaction => {
          return item !== null &&
                 item !== undefined &&
                 typeof item === 'object' &&
                 'id' in item &&
                 'amount' in item;
        });
        setTransactions(validItems);
        setTotalCount(validItems.length);
      } else {
        // Unknown format
        setTransactions([]);
        setTotalCount(0);
      }
    } catch (err: any) {
      console.error('Error loading transactions:', err);
      setError(err.response?.data?.detail || 'Failed to load transactions');
      setTransactions([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  const handleApprove = async (id: number) => {
    if (!window.confirm(t('finance.transaction.confirmApprove', 'Operatsiyani tasdiqlaysizmi?'))) {
      return;
    }
    try {
      await approveFinanceTransaction(id);
      await loadTransactions();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to approve transaction';
      window.alert(errorMsg);
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm(t('finance.transaction.confirmCancel', 'Operatsiyani bekor qilasizmi?'))) {
      return;
    }
    try {
      await cancelFinanceTransaction(id);
      await loadTransactions();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to cancel transaction';
      window.alert(errorMsg);
    }
  };

  const handleDelete = async (id: number) => {
    const transaction = transactions.find(t => t.id === id);
    let confirmMessage = t('finance.transaction.confirmDelete', 'Operatsiyani o\'chirasizmi?');

    if (transaction?.status === 'approved') {
      confirmMessage = t('finance.transaction.confirmDeleteApproved',
        '⚠️ XAVFLI AMAL!\n\nTasdiqlangan transactionni o\'chirish:\n• Balanslar avtomatik qayta hisoblanadi\n• O\'chirish tarixi saqlanadi\n• Hisobotlarga ta\'sir qiladi\n\nHaqiqatan ham o\'chirmoqchimisiz?'
      );
    } else if (transaction?.status === 'cancelled') {
      confirmMessage = t('finance.transaction.confirmDeleteCancelled',
        '⚠️ OGOHLANTIRISH!\n\nBekor qilingan transactionni o\'chirmoqchisiz.\nO\'chirish tarixi saqlanadi.\n\nDavom etasizmi?'
      );
    }

    if (!window.confirm(confirmMessage)) return;

    try {
      await deleteFinanceTransaction(id);
      message.success(t('common.deleted', 'O\'chirildi'));
      await loadTransactions();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to delete transaction';
      window.alert(errorMsg);
    }
  };

  const handleCreate = () => {
    setEditingTransaction(null);
    setFormData({
      type: 'income',
      dealer: '',
      account: '',
      date: new Date().toISOString().split('T')[0],
      currency: 'USD',
      amount: '',
      category: '',
      comment: '',
    });
    setShowModal(true);
  };

  const handleEdit = (transaction: FinanceTransaction) => {
    if (transaction.status === 'approved') {
      const confirmed = window.confirm(
        t('finance.transaction.confirmEditApproved',
          '⚠️ OGOHLANTIRISH!\n\nTasdiqlangan transactionni tahrirlash:\n• Balanslarni qayta hisoblab beradi\n• O\'zgarishlar tarixi saqlanadi\n• Kim, qachon o\'zgartirganligini ko\'rish mumkin\n\nDavom etishni xohlaysizmi?'
        )
      );
      if (!confirmed) return;
    } else if (transaction.status === 'cancelled') {
      const confirmed = window.confirm(
        t('finance.transaction.confirmEditCancelled',
          '⚠️ OGOHLANTIRISH!\n\nBekor qilingan transactionni tahrirlayapsiz.\nO\'zgarishlar tarixi saqlanadi.\n\nDavom etishni xohlaysizmi?'
        )
      );
      if (!confirmed) return;
    }

    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type as any,
      dealer: transaction.dealer?.toString() || '',
      account: transaction.account?.toString() || '',
      date: transaction.date || new Date().toISOString().split('T')[0],
      currency: transaction.currency || 'USD',
      amount: transaction.amount?.toString() || '',
      category: transaction.category ? String(transaction.category) : '',
      comment: transaction.comment || '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTransaction(null);
    setFormData({
      type: 'income',
      dealer: '',
      account: '',
      date: new Date().toISOString().split('T')[0],
      currency: 'USD',
      amount: '',
      category: '',
      comment: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.account) {
      alert(t('finance.transaction.accountRequired', 'Account tanlash majburiy'));
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert(t('finance.transaction.amountRequired', 'Summa kiritish majburiy'));
      return;
    }
    if (formData.type === 'income' && !formData.dealer) {
      alert(t('finance.transaction.dealerRequired', 'Kirim uchun diler tanlash majburiy'));
      return;
    }
    if (formData.type === 'expense' && !formData.category) {
      alert(t('finance.transaction.categoryRequired', 'Chiqim uchun kategoriya tanlash majburiy'));
      return;
    }

    try {
      setModalLoading(true);
      const payload: any = {
        type: formData.type,
        account: parseInt(formData.account),
        date: formData.date,
        currency: formData.currency,
        amount: parseFloat(formData.amount),
        comment: formData.comment,
        status: 'draft',
      };
      if (formData.type === 'income' && formData.dealer) payload.dealer = parseInt(formData.dealer);
      if (formData.type === 'expense' && formData.category) payload.category = formData.category;

      if (editingTransaction) {
        await updateFinanceTransaction(editingTransaction.id, payload);
        message.success(t('finance.transaction.updated', 'Transaction yangilandi'));
      } else {
        await createFinanceTransaction(payload);
        message.success(t('finance.transaction.created', 'Transaction yaratildi'));
      }

      handleCloseModal();
      await loadTransactions();
    } catch (err: any) {
      console.error('Error saving transaction:', err);
      const errorMsg = err.response?.data?.detail || Object.values(err.response?.data || {}).join(', ') || 'Failed to save transaction';
      alert(errorMsg);
    } finally {
      setModalLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getTypeLabel = (type: string) => {
    if (!type) return '-';
    const labels: Record<string, string> = {
      income: t('finance.transaction.income', 'Kirim'),
      expense: t('finance.transaction.expense', 'Chiqim'),
      opening_balance: t('finance.transaction.openingBalance', 'Boshlang\'ich balans'),
      currency_exchange_out: t('finance.transaction.currencyExchangeOut', 'Valyuta konvertatsiyasi (chiqim)'),
      currency_exchange_in: t('finance.transaction.currencyExchangeIn', 'Valyuta konvertatsiyasi (kirim)'),
    };
    return labels[type] || type;
  };

  const getTransactionIcon = (type: string) => {
    if (type === 'currency_exchange_out' || type === 'currency_exchange_in') {
      return (
        <svg className="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      );
    }
    return null;
  };

  const getStatusLabel = (status: string) => {
    if (!status) return '-';
    const labels: Record<string, string> = {
      draft: t('finance.transaction.draft', 'Draft'),
      pending: t('finance.transaction.pending', 'Kutilmoqda'),
      approved: t('finance.transaction.approved', 'Tasdiqlangan'),
      rejected: t('finance.transaction.rejected', 'Rad etilgan'),
      cancelled: t('finance.transaction.cancelled', 'Bekor qilingan'),
    };
    return labels[status] || status;
  };

  const handleExportPDF = () => {
    exportTransactionsToPDF(transactions, {
      type: filters.type,
      status: filters.status,
      currency: filters.currency,
      startDate: filters.date_from,
      endDate: filters.date_to,
    });
  };

  const handleExportXLSX = () => {
    exportTransactionsToXLSX(transactions, {
      type: filters.type,
      status: filters.status,
      currency: filters.currency,
      startDate: filters.date_from,
      endDate: filters.date_to,
    });
  };

  const TransactionModal = () => {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="card w-full max-w-2xl animate-scaleIn">
          <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">
            {editingTransaction
              ? t('finance.transaction.edit', 'Transactionni tahrirlash')
              : t('finance.transaction.create', 'Yangi transaction')}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-label">{t('finance.transaction.type', 'Turi')}</label>
                <Select
                  value={formData.type}
                  onChange={(val: any) => setFormData({ ...formData, type: val })}
                  options={[
                    { value: 'income', label: t('finance.transaction.income', 'Kirim') },
                    { value: 'expense', label: t('finance.transaction.expense', 'Chiqim') }
                  ]}
                  className="mt-1 w-full"
                />
              </div>

              <div>
                <label className="text-label">{t('finance.transaction.account', 'Account')}</label>
                <Select
                  value={formData.account}
                  onChange={(val: any) => setFormData({ ...formData, account: String(val) })}
                  options={accounts.map(a => ({
                    value: String(a.id),
                    label: `${a.name} (${a.currency})`
                  }))}
                  showSearch
                  optionFilterProp="children"
                  className="mt-1 w-full"
                  popupMatchSelectWidth={false}
                  listHeight={300}
                  placeholder={t('common.select', 'Tanlang')}
                />
              </div>

              {formData.type === 'income' && (
                <div>
                  <label className="text-label">{t('finance.transaction.dealer', 'Diler')}</label>
                  <Select
                    value={formData.dealer}
                    onChange={(val: any) => setFormData({ ...formData, dealer: String(val) })}
                    options={dealers.map(d => ({ value: String(d.id), label: d.name }))}
                    showSearch
                    optionFilterProp="children"
                    className="mt-1 w-full"
                    popupMatchSelectWidth={false}
                    listHeight={300}
                    placeholder={t('common.select', 'Tanlang')}
                  />
                </div>
              )}

              {formData.type === 'expense' && (
                <div>
                  <label className="text-label">{t('finance.transaction.category', 'Kategoriya')}</label>
                  <Select
                    value={formData.category ? Number(formData.category) : undefined}
                    onChange={(val: any) => setFormData({ ...formData, category: String(val) })}
                    options={categories.map(c => ({
                      value: c.id,
                      label: `${c.icon} ${c.name}`
                    }))}
                    showSearch
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    className="mt-1 w-full"
                    popupMatchSelectWidth={false}
                    listHeight={300}
                    placeholder={t('common.select', 'Tanlang')}
                  />
                </div>
              )}

              <div>
                <label className="text-label">{t('finance.transaction.amount', 'Summa')}</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="input-field mt-1 w-full"
                />
              </div>

              <div>
                <label className="text-label">{t('finance.transaction.date', 'Sana')}</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="input-field mt-1 w-full"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-label">{t('finance.transaction.comment', 'Izoh')}</label>
                <textarea
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  rows={3}
                  className="input-field mt-1 w-full"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                className="btn btn-secondary"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={modalLoading}
                className="btn btn-primary"
              >
                {modalLoading ? (
                  <>
                    <div className="spinner" />
                    <span className="ml-2">{t('common.saving', 'Saving...')}</span>
                  </>
                ) : (
                  t('common.save', 'Save')
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="spinner mx-auto" />
          <p className="mt-4 text-slate-600 dark:text-slate-400">
            {t('common.loading', 'Loading...')}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <p className="text-red-800 dark:text-red-200">{error}</p>
          <button
            onClick={loadTransactions}
            className="btn btn-danger mt-4"
          >
            {t('common.retry', 'Retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper space-y-6">
      {showModal && <TransactionModal />}

      {/* Header */}
      <header className="card animate-fadeInUp">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {t('finance.transactions.title', 'Moliya Operatsiyalari')}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {t('finance.transactions.subtitle', 'Kirim va chiqim operatsiyalari')}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExportPDF}
              className="btn btn-ghost btn-sm"
              title={t('common.exportPDF', 'Export PDF')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="ml-1">PDF</span>
            </button>
            <button
              onClick={handleExportXLSX}
              className="btn btn-ghost btn-sm"
              title={t('common.exportExcel', 'Export Excel')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="ml-1">XLSX</span>
            </button>
            <button
              onClick={handleCreate}
              className="btn btn-primary"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="ml-2">{t('finance.transaction.create', 'Yangi transaction')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeInUp">
        <div className="kpi-card kpi-card--emerald">
          <div className="kpi-value text-number">
            {transactions.filter(t => t.type === 'income').length}
          </div>
          <div className="kpi-label">{t('finance.transaction.totalIncome', 'Jami Kirim')}</div>
        </div>
        <div className="kpi-card kpi-card--coral">
          <div className="kpi-value text-number">
            {transactions.filter(t => t.type === 'expense').length}
          </div>
          <div className="kpi-label">{t('finance.transaction.totalExpense', 'Jami Chiqim')}</div>
        </div>
        <div className="kpi-card kpi-card--blue">
          <div className="kpi-value text-number">
            {totalCount}
          </div>
          <div className="kpi-label">{t('finance.transaction.total', 'Jami Operatsiyalar')}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card animate-fadeInUp">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t('common.filters', 'Filtrlar')}
          </h3>
          <button
            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            className="btn btn-ghost btn-sm"
            title={isFiltersExpanded ? t('common.collapse', 'Yig\'ish') : t('common.expand', 'Ochish')}
          >
            <svg
              className={`w-5 h-5 transition-transform duration-300 ${isFiltersExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        <div
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-all duration-300 overflow-hidden ${
            isFiltersExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div>
            <label className="text-label">{t('finance.transaction.type', 'Turi')}</label>
            <select
              value={filters.type || ''}
              onChange={(e) => setFilters({ ...filters, type: e.target.value as any })}
              className="input-field mt-1 w-full"
            >
              <option value="">{t('common.all', 'Barchasi')}</option>
              <option value="income">{t('finance.transaction.income', 'Kirim')}</option>
              <option value="expense">{t('finance.transaction.expense', 'Chiqim')}</option>
            </select>
          </div>

          <div>
            <label className="text-label">{t('finance.transaction.status', 'Status')}</label>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
              className="input-field mt-1 w-full"
            >
              <option value="">{t('common.all', 'Barchasi')}</option>
              <option value="draft">{t('finance.transaction.draft', 'Draft')}</option>
              <option value="pending">{t('finance.transaction.pending', 'Kutilmoqda')}</option>
              <option value="approved">{t('finance.transaction.approved', 'Tasdiqlangan')}</option>
              <option value="rejected">{t('finance.transaction.rejected', 'Rad etilgan')}</option>
              <option value="cancelled">{t('finance.transaction.cancelled', 'Bekor qilingan')}</option>
            </select>
          </div>

          <div>
            <label className="text-label">{t('finance.transaction.currency', 'Valyuta')}</label>
            <select
              value={filters.currency || ''}
              onChange={(e) => setFilters({ ...filters, currency: e.target.value as any })}
              className="input-field mt-1 w-full"
            >
              <option value="">{t('common.all', 'Barchasi')}</option>
              <option value="UZS">UZS</option>
              <option value="USD">USD</option>
            </select>
          </div>

          <div>
            <label className="text-label">{t('finance.transaction.account', 'Kassa')}</label>
            <Select
              value={filters.account || undefined}
              onChange={(val: any) => setFilters({ ...filters, account: val })}
              options={[
                { value: undefined, label: t('common.all', 'Barchasi') },
                ...accounts.map(a => ({
                  value: a.id,
                  label: `${a.name} (${a.currency})`
                }))
              ]}
              showSearch
              optionFilterProp="children"
              className="mt-1 w-full"
              popupMatchSelectWidth={false}
              listHeight={300}
              placeholder={t('common.all', 'Barchasi')}
              allowClear
            />
          </div>

          <div>
            <label className="text-label">{t('finance.transaction.dateFrom', 'Sanadan')}</label>
            <input
              type="date"
              value={filters.date_from || ''}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              className="input-field mt-1 w-full"
            />
          </div>

          <div>
            <label className="text-label">{t('finance.transaction.dateTo', 'Sanagacha')}</label>
            <input
              type="date"
              value={filters.date_to || ''}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              className="input-field mt-1 w-full"
            />
          </div>
        </div>

        {isFiltersExpanded && (
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setFilters({})}
              className="btn btn-ghost"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {t('common.clearFilters', 'Tozalash')}
            </button>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="card overflow-x-auto animate-fadeInUp">
        <table className="modern-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>{t('finance.transaction.date', 'Sana')}</th>
              <th>{t('finance.transaction.type', 'Turi')}</th>
              <th>{t('finance.transaction.dealer', 'Diler')}</th>
              <th className="text-right">{t('finance.transaction.amount', 'Summa')}</th>
              <th>{t('finance.transaction.category', 'Kategoriya')}</th>
              <th className="text-center">{t('finance.transaction.status', 'Status')}</th>
              <th className="text-center">{t('common.actions', 'Amallar')}</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td className="font-medium">#{transaction.id}</td>
                <td>{formatDate(transaction.date)}</td>
                <td>
                  <div className="flex flex-col gap-1">
                    <span className={
                      transaction.type === 'income'
                        ? 'badge badge-success'
                        : transaction.type === 'expense'
                        ? 'badge badge-error'
                        : transaction.type === 'opening_balance'
                        ? 'badge badge-blue'
                        : 'badge badge-info'
                    }>
                      {getTransactionIcon(transaction.type)}
                      {getTypeLabel(transaction.type)}
                    </span>
                    {(transaction.type === 'currency_exchange_out' || transaction.type === 'currency_exchange_in') && transaction.related_account_name && (
                      <span className="text-xs text-slate-500">
                        {transaction.type === 'currency_exchange_out' ? '→' : '←'} {transaction.related_account_name}
                      </span>
                    )}
                    {(transaction.type === 'currency_exchange_out' || transaction.type === 'currency_exchange_in') && transaction.exchange_rate && (
                      <span className="text-xs text-slate-500">
                        Rate: {formatNumber(transaction.exchange_rate)}
                      </span>
                    )}
                  </div>
                </td>
                <td>{transaction.dealer_name || '—'}</td>
                <td className="text-right">
                  {transaction.currency === 'USD' ? (
                    <>
                      <div className="font-semibold text-number">
                        ${formatNumber(transaction.amount || 0)}
                      </div>
                      {transaction.amount_uzs && transaction.amount_uzs > 0 && (
                        <div className="text-xs text-slate-500">
                          ≈ {formatNumber(transaction.amount_uzs)} UZS
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="font-semibold text-number">
                        {formatNumber(transaction.amount || 0)} {transaction.currency}
                      </div>
                      {transaction.amount_usd && transaction.amount_usd > 0 && (
                        <div className="text-xs text-slate-500">
                          ≈ ${formatNumber(transaction.amount_usd)}
                        </div>
                      )}
                    </>
                  )}
                </td>
                <td>{transaction.category || '—'}</td>
                <td className="text-center">
                  <span className={
                    transaction.status === 'approved'
                      ? 'badge badge-success'
                      : transaction.status === 'cancelled'
                      ? 'badge badge-error'
                      : transaction.status === 'rejected'
                      ? 'badge badge-error'
                      : transaction.status === 'pending'
                      ? 'badge badge-info'
                      : 'badge badge-warning'
                  }>
                    {getStatusLabel(transaction.status)}
                  </span>
                </td>
                <td>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleEdit(transaction)}
                      className="btn btn-ghost btn-sm"
                      title={t('common.edit', 'Tahrirlash')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-7-7l7 7" />
                      </svg>
                    </button>

                    <button
                      onClick={() => handleDelete(transaction.id)}
                      className="btn btn-danger btn-sm"
                      title={t('common.delete', 'O\'chirish')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>

                    {(transaction.status === 'draft' || transaction.status === 'pending') && (
                      <button
                        onClick={() => handleApprove(transaction.id)}
                        className="btn btn-success btn-sm"
                        title={t('finance.transaction.approve', 'Tasdiqlash')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}

                    {transaction.status === 'pending' && (
                      <button
                        onClick={() => handleCancel(transaction.id)}
                        className="btn btn-warning btn-sm"
                        title={t('finance.transaction.reject', 'Rad etish')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}

                    {transaction.status === 'approved' && (
                      <button
                        onClick={() => handleCancel(transaction.id)}
                        className="btn btn-secondary btn-sm"
                        title={t('finance.transaction.cancel', 'Bekor qilish')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {transactions.length === 0 && !loading && (
          <div className="card border-dashed text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">
              {t('finance.transactions.empty', 'Operatsiyalar topilmadi')}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalCount > pageSize && (
        <div className="card bg-white/90 dark:bg-slate-900/90 backdrop-blur sticky bottom-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-700 dark:text-slate-300">
              {t('common.showing', 'Ko\'rsatilmoqda')}{' '}
              <span className="font-semibold text-number">{Math.min((page - 1) * pageSize + 1, totalCount)}</span>
              {' '}-{' '}
              <span className="font-semibold text-number">{Math.min(page * pageSize, totalCount)}</span>
              {' '}{t('common.of', 'dan')}{' '}
              <span className="font-semibold text-number">{totalCount}</span>
              {' '}{t('common.results', 'natija')}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="btn btn-secondary btn-sm"
              >
                {t('common.previous', 'Oldingi')}
              </button>
              
              <span className="text-sm text-slate-700 dark:text-slate-300 px-3">
                {t('common.page', 'Sahifa')} <span className="text-number">{page}</span> / <span className="text-number">{Math.ceil(totalCount / pageSize)}</span>
              </span>
              
              <button
                onClick={() => setPage(Math.min(Math.ceil(totalCount / pageSize), page + 1))}
                disabled={page >= Math.ceil(totalCount / pageSize)}
                className="btn btn-secondary btn-sm"
              >
                {t('common.next', 'Keyingi')}
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-label">
                {t('common.perPage', 'Sahifada')}:
              </label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="input-field"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}