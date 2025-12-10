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

export default function FinanceTransactions() {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FinanceTransactionFilters>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  // New UI state for modal/create/edit
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinanceTransaction | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Reference data for modal
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  // Form data for modal
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

  useEffect(() => {
    loadTransactions();
  }, [filters, page, pageSize]);

  // Load reference data for modal (accounts, dealers, categories)
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
      // Normalize dealer shape to match frontend types (ensure updated_at exists)
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
      
      // Normalize response - handle both paginated and non-paginated
      const data = response.data;
      let items: FinanceTransaction[] = [];
      let count = 0;
      
      if (Array.isArray(data)) {
        // Direct array response (no pagination)
        items = data;
        count = data.length;
      } else if (data && typeof data === 'object') {
        // Paginated response with results
        items = (data as any).results || (data as any).data || (data as any).items || [];
        count = (data as any).count || items.length;
      }
      
      // Filter out any null/undefined items and ensure valid data
      const validItems = items.filter((item): item is FinanceTransaction => {
        return item !== null && 
               item !== undefined && 
               typeof item === 'object' &&
               'id' in item &&
               'amount' in item;
      });
      
      setTransactions(validItems);
      setTotalCount(count);
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

    // ✅ Different confirmation messages based on status
    let confirmMessage = t('finance.transaction.confirmDelete', 'Operatsiyani o\'chirasizmi?');

    if (transaction?.status === 'approved') {
      confirmMessage = t('finance.transaction.confirmDeleteApproved',
        '⚠️ XAVFLI AMAL!\n\n' +
        'Tasdiqlangan transactionni o\'chirish:\n' +
        '• Balanslar avtomatik qayta hisoblanadi\n' +
        '• O\'chirish tarixi saqlanadi\n' +
        '• Hisobotlarga ta\'sir qiladi\n\n' +
        'Haqiqatan ham o\'chirmoqchimisiz?'
      );
    } else if (transaction?.status === 'cancelled') {
      confirmMessage = t('finance.transaction.confirmDeleteCancelled',
        '⚠️ OGOHLANTIRISH!\n\n' +
        'Bekor qilingan transactionni o\'chirmoqchisiz.\n' +
        'O\'chirish tarixi saqlanadi.\n\n' +
        'Davom etasizmi?'
      );
    }

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await deleteFinanceTransaction(id);
      message.success(t('common.deleted', 'O\'chirildi'));
      await loadTransactions();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to delete transaction';
      window.alert(errorMsg);
    }
  };

  // --- Modal / CRUD handlers ---
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
    // ✅ Show warning for approved/cancelled transactions
    if (transaction.status === 'approved') {
      const confirmed = window.confirm(
        t('finance.transaction.confirmEditApproved',
          '⚠️ OGOHLANTIRISH!\n\n' +
          'Tasdiqlangan transactionni tahrirlash:\n' +
          '• Balanslarni qayta hisoblab beradi\n' +
          '• O\'zgarishlar tarixi saqlanadi\n' +
          '• Kim, qachon o\'zgartirganligini ko\'rish mumkin\n\n' +
          'Davom etishni xohlaysizmi?'
        )
      );
      if (!confirmed) return;
    } else if (transaction.status === 'cancelled') {
      const confirmed = window.confirm(
        t('finance.transaction.confirmEditCancelled',
          '⚠️ OGOHLANTIRISH!\n\n' +
          'Bekor qilingan transactionni tahrirlayapsiz.\n' +
          'O\'zgarishlar tarixi saqlanadi.\n\n' +
          'Davom etishni xohlaysizmi?'
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
      category: transaction.category || '',
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
    // validation
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

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      income: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
      expense: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400',
      opening_balance: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
      currency_exchange_out: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400',
      currency_exchange_in: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400',
    };
    return colors[type] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400';
  };

  const getTransactionIcon = (type: string) => {
    if (type === 'currency_exchange_out') {
      return (
        <svg className="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      );
    }
    if (type === 'currency_exchange_in') {
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
      approved: t('finance.transaction.approved', 'Tasdiqlangan'),
      cancelled: t('finance.transaction.cancelled', 'Bekor qilingan'),
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
      approved: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
      cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Modal component rendered when creating/editing a transaction
  const TransactionModal = () => {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingTransaction
              ? t('finance.transaction.edit', 'Transactionni tahrirlash')
              : t('finance.transaction.create', 'Yangi transaction')}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('finance.transaction.type', 'Turi')}</label>
                <Select
                  value={formData.type}
                  onChange={(val: any) => setFormData({ ...formData, type: val })}
                  options={[{ value: 'income', label: t('finance.transaction.income', 'Kirim') }, { value: 'expense', label: t('finance.transaction.expense', 'Chiqim') }]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('finance.transaction.account', 'Account')}</label>
                <Select
                  value={formData.account}
                  onChange={(val: any) => setFormData({ ...formData, account: String(val) })}
                  options={accounts.map(a => ({
                    value: String(a.id),
                    label: `${a.name} (${a.currency})`
                  }))}
                  showSearch
                  optionFilterProp="children"
                  style={{ width: '100%' }}
                  popupMatchSelectWidth={false}
                  listHeight={300}
                  placeholder={t('common.select', 'Tanlang')}
                />
              </div>

              {formData.type === 'income' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('finance.transaction.dealer', 'Diler')}</label>
                  <Select
                    value={formData.dealer}
                    onChange={(val: any) => setFormData({ ...formData, dealer: String(val) })}
                    options={dealers.map(d => ({ value: String(d.id), label: d.name }))}
                    showSearch
                    optionFilterProp="children"
                    style={{ width: '100%' }}
                    popupMatchSelectWidth={false}
                    listHeight={300}
                    placeholder={t('common.select', 'Tanlang')}
                  />
                </div>
              )}

              {formData.type === 'expense' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('finance.transaction.category', 'Kategoriya')}</label>
                  <Select
                    value={formData.category}
                    onChange={(val: any) => setFormData({ ...formData, category: String(val) })}
                    options={categories.map(c => ({
                      value: c.id,
                      label: `${c.icon} ${c.name}`
                    }))}
                    showSearch
                    optionFilterProp="children"
                    style={{ width: '100%' }}
                    popupMatchSelectWidth={false}
                    listHeight={300}
                    placeholder={t('common.select', 'Tanlang')}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('finance.transaction.amount', 'Summa')}</label>
                <input
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full rounded border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('finance.transaction.date', 'Sana')}</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full rounded border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('finance.transaction.comment', 'Izoh')}</label>
                <textarea
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  className="w-full rounded border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={handleCloseModal} className="px-4 py-2 rounded border">{t('common.cancel', 'Cancel')}</button>
              <button type="submit" disabled={modalLoading} className="px-4 py-2 rounded bg-blue-600 text-white">{modalLoading ? t('common.saving', 'Saving...') : t('common.save', 'Save')}</button>
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
          <button
            onClick={loadTransactions}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            {t('common.retry', 'Retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Render modal */}
      {showModal && <TransactionModal />}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t('finance.transactions.title', 'Moliya Operatsiyalari')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('finance.transactions.subtitle', 'Kirim va chiqim operatsiyalari')}
        </p>
        <div className="mt-4">
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('finance.transaction.create', 'Yangi transaction')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('finance.transaction.type', 'Turi')}
            </label>
            <select
              value={filters.type || ''}
              onChange={(e) => setFilters({ ...filters, type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">{t('common.all', 'Barchasi')}</option>
              <option value="income">{t('finance.transaction.income', 'Kirim')}</option>
              <option value="expense">{t('finance.transaction.expense', 'Chiqim')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('finance.transaction.status', 'Status')}
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">{t('common.all', 'Barchasi')}</option>
              <option value="draft">{t('finance.transaction.draft', 'Draft')}</option>
              <option value="approved">{t('finance.transaction.approved', 'Tasdiqlangan')}</option>
              <option value="cancelled">{t('finance.transaction.cancelled', 'Bekor qilingan')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('finance.transaction.currency', 'Valyuta')}
            </label>
            <select
              value={filters.currency || ''}
              onChange={(e) => setFilters({ ...filters, currency: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">{t('common.all', 'Barchasi')}</option>
              <option value="UZS">UZS</option>
              <option value="USD">USD</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({})}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              {t('common.clearFilters', 'Tozalash')}
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('finance.transaction.date', 'Sana')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('finance.transaction.type', 'Turi')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('finance.transaction.dealer', 'Diler')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('finance.transaction.amount', 'Summa')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('finance.transaction.category', 'Kategoriya')}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('finance.transaction.status', 'Status')}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('common.actions', 'Amallar')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {(transactions || []).map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    #{transaction.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatDate(transaction.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(transaction.type)}`}>
                        {getTransactionIcon(transaction.type)}
                        {getTypeLabel(transaction.type)}
                      </span>
                      {(transaction.type === 'currency_exchange_out' || transaction.type === 'currency_exchange_in') && transaction.related_account_name && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {transaction.type === 'currency_exchange_out' ? '→' : '←'} {transaction.related_account_name}
                        </span>
                      )}
                      {(transaction.type === 'currency_exchange_out' || transaction.type === 'currency_exchange_in') && transaction.exchange_rate && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Rate: {formatNumber(transaction.exchange_rate)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {transaction.dealer_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {transaction.currency === 'USD' ? (
                      <>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          ${formatNumber(transaction.amount || 0)}
                        </div>
                        {transaction.amount_uzs && transaction.amount_uzs > 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            ≈ {formatNumber(transaction.amount_uzs)} UZS
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatNumber(transaction.amount || 0)} {transaction.currency}
                        </div>
                        {transaction.amount_usd && transaction.amount_usd > 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            ≈ ${formatNumber(transaction.amount_usd)}
                          </div>
                        )}
                      </>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {transaction.category || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                      {getStatusLabel(transaction.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    <div className="flex items-center justify-center gap-2">
                      {/* ✅ Edit button - available for all statuses */}
                      <button
                        onClick={() => handleEdit(transaction)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title={t('common.edit', 'Tahrirlash')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-7-7l7 7" />
                        </svg>
                      </button>

                      {/* ✅ Delete button - available for all statuses */}
                      <button
                        onClick={() => handleDelete(transaction.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        title={t('common.delete', 'O\'chirish')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>

                      {/* Status-specific actions */}
                      {transaction.status === 'draft' && (
                        <button
                          onClick={() => handleApprove(transaction.id)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                          title={t('finance.transaction.approve', 'Tasdiqlash')}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      )}

                      {transaction.status === 'approved' && (
                        <button
                          onClick={() => handleCancel(transaction.id)}
                          className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                          title={t('finance.transaction.cancel', 'Bekor qilish')}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        </div>

        {transactions.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {t('finance.transactions.empty', 'Operatsiyalar topilmadi')}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalCount > pageSize && (
        <div className="mt-6 flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow-md px-6 py-4">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {t('common.showing', 'Ko\'rsatilmoqda')}{' '}
            <span className="font-semibold">{Math.min((page - 1) * pageSize + 1, totalCount)}</span>
            {' '}-{' '}
            <span className="font-semibold">{Math.min(page * pageSize, totalCount)}</span>
            {' '}{t('common.of', 'dan')}{' '}
            <span className="font-semibold">{totalCount}</span>
            {' '}{t('common.results', 'natija')}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.previous', 'Oldingi')}
            </button>
            
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {t('common.page', 'Sahifa')} {page} / {Math.ceil(totalCount / pageSize)}
            </span>
            
            <button
              onClick={() => setPage(Math.min(Math.ceil(totalCount / pageSize), page + 1))}
              disabled={page >= Math.ceil(totalCount / pageSize)}
              className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.next', 'Keyingi')}
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700 dark:text-gray-300">
              {t('common.perPage', 'Sahifada')}:
            </label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
