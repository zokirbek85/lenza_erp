import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getFinanceTransactions,
  approveFinanceTransaction,
  cancelFinanceTransaction,
  deleteFinanceTransaction,
} from '../api/finance';
import type { FinanceTransaction, FinanceTransactionFilters } from '../types/finance';

export default function FinanceTransactions() {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FinanceTransactionFilters>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadTransactions();
  }, [filters, page, pageSize]);

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
    if (!window.confirm(t('finance.transaction.confirmDelete', 'Operatsiyani o\'chirasizmi?'))) {
      return;
    }
    try {
      await deleteFinanceTransaction(id);
      await loadTransactions();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to delete transaction';
      window.alert(errorMsg);
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
    return type === 'income' 
      ? t('finance.transaction.income', 'Kirim')
      : t('finance.transaction.expense', 'Chiqim');
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t('finance.transactions.title', 'Moliya Operatsiyalari')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('finance.transactions.subtitle', 'Kirim va chiqim operatsiyalari')}
        </p>
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
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      transaction.type === 'income'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                    }`}>
                      {getTypeLabel(transaction.type)}
                    </span>
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
                      {transaction.status === 'draft' && (
                        <>
                          <button
                            onClick={() => handleApprove(transaction.id)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            title={t('finance.transaction.approve', 'Tasdiqlash')}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(transaction.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title={t('common.delete', 'O\'chirish')}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
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
