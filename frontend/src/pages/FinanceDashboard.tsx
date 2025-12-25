import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getCashSummary, getExpenseCategoryStatistics } from '../api/finance';
import type { CashSummary, FinanceAccount, ExpenseCategoryStatistics } from '../types/finance';
import AddIncomeModal from '../components/finance/AddIncomeModal';
import AddExpenseModal from '../components/finance/AddExpenseModal';
import AccountModal from '../components/finance/AccountModal';
import ConvertCurrencyModal from '../components/finance/ConvertCurrencyModal';
import DealerRefundModal from '../components/finance/DealerRefundModal';
import BalanceCard from '../components/finance/BalanceCard';
import { exportFinanceDashboardToPDF, exportFinanceDashboardToXLSX } from '../utils/exportUtils';

export default function FinanceDashboard() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<CashSummary | null>(null);
  const [expenseStats, setExpenseStats] = useState<ExpenseCategoryStatistics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedUsdAccount, setSelectedUsdAccount] = useState<FinanceAccount | null>(null);
  const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<FinanceAccount | null>(null);

  useEffect(() => {
    loadSummary();
    loadExpenseStats();
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getCashSummary();
      // Ensure accounts is always an array
      const data = response.data;
      if (data) {
        // Handle both array and ensure it exists
        data.accounts = Array.isArray(data.accounts) ? data.accounts : [];
      }
      setSummary(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load cash summary');
    } finally {
      setLoading(false);
    }
  };

  const loadExpenseStats = async () => {
    try {
      const response = await getExpenseCategoryStatistics();
      setExpenseStats(response.data);
    } catch (err: any) {
      console.error('Failed to load expense statistics:', err);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getAccountTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      cash: t('finance.accountType.cash', 'Cash'),
      card: t('finance.accountType.card', 'Card'),
      bank: t('finance.accountType.bank', 'Bank'),
    };
    return labels[type] || type;
  };

  const handleTransactionSuccess = () => {
    loadSummary(); // Refresh dashboard data
    loadExpenseStats(); // Refresh expense statistics
  };

  const handleExportPDF = () => {
    if (summary) {
      exportFinanceDashboardToPDF(summary);
    }
  };

  const handleExportXLSX = () => {
    if (summary) {
      exportFinanceDashboardToXLSX(summary);
    }
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
            onClick={loadSummary}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            {t('common.retry', 'Retry')}
          </button>
        </div>
      </div>
    );
  }

  if (!summary || !summary.accounts) return null;

  // Ensure summary.accounts is always an array
  const safeAccounts = Array.isArray(summary.accounts) ? summary.accounts : [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('finance.dashboard.title', 'Moliya Boshqaruvi')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('finance.dashboard.subtitle', 'Kassa va hisob-kitoblar')}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            title={t('common.exportPDF', 'Export PDF')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            PDF
          </button>
          <button
            onClick={handleExportXLSX}
            className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 flex items-center gap-2"
            title={t('common.exportExcel', 'Export Excel')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            XLSX
          </button>
          <button
            onClick={() => setShowAccountModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('finance.account.create', 'Kassa yaratish')}
          </button>
          <button
            onClick={() => setShowIncomeModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('finance.income.add', 'Kirim qo\'shish')}
          </button>
          <button
            onClick={() => setShowRefundModal(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            {t('finance.dealerRefund.button', 'Dilerga Qaytarish')}
          </button>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
            {t('finance.expense.add', 'Chiqim qo\'shish')}
          </button>
        </div>
      </div>

      {/* Total Balance Cards with Detailed Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <BalanceCard
          icon="money"
          title={t('finance.dashboard.totalBalanceUSD', 'Jami Balance USD')}
          value={summary.total_balance_usd}
          currency="USD"
          details={safeAccounts}
          type="balance"
        />

        <BalanceCard
          icon="credit-card"
          title={t('finance.dashboard.totalBalanceUZS', 'Jami Balance UZS')}
          value={summary.total_balance_uzs}
          currency="UZS"
          details={safeAccounts}
          type="balance"
        />

        <BalanceCard
          icon="arrow-up"
          title={t('finance.dashboard.totalIncome', 'Jami Kirim')}
          value={summary.total_income_usd}
          currency="USD"
          details={safeAccounts}
          type="income"
        />

        <BalanceCard
          icon="arrow-down"
          title={t('finance.dashboard.totalExpense', 'Jami Chiqim')}
          value={summary.total_expense_usd}
          currency="USD"
          details={safeAccounts}
          type="expense"
        />
      </div>

      {/* UZS Cards - Second Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <BalanceCard
          icon="arrow-up"
          title={t('finance.dashboard.totalIncomeUZS', 'Jami Kirim UZS')}
          value={summary.total_income_uzs}
          currency="UZS"
          details={safeAccounts}
          type="income"
        />

        <BalanceCard
          icon="arrow-down"
          title={t('finance.dashboard.totalExpenseUZS', 'Jami Chiqim UZS')}
          value={summary.total_expense_uzs}
          currency="UZS"
          details={safeAccounts}
          type="expense"
        />

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                {t('finance.dashboard.netProfit', 'Sof Foyda')}
              </p>
              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                ${formatNumber(summary.total_income_usd - summary.total_expense_usd)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatNumber(summary.total_income_uzs - summary.total_expense_uzs)} UZS
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('finance.dashboard.accounts', 'Hisoblar')}
          </h2>
          <Link
            to="/finance/transactions"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('finance.dashboard.viewTransactions', 'Operatsiyalarni ko\'rish')}
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('finance.account.name', 'Nomi')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('finance.account.type', 'Turi')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('finance.account.currency', 'Valyuta')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('finance.account.openingBalance', 'Boshlang\'ich balans')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('finance.account.income', 'Kirim')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('finance.account.expense', 'Chiqim')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('finance.account.balance', 'Balans')}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('finance.account.status', 'Status')}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('common.actions', 'Amallar')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {(summary?.accounts || []).map((account) => (
                <tr key={account.account_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {account.account_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                      {getAccountTypeLabel(account.account_type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {account.currency}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-blue-600 dark:text-blue-400">
                    {account.opening_balance_amount && account.opening_balance_amount > 0 ? (
                      <div>
                        <div className="font-medium">{formatNumber(account.opening_balance_amount)} {account.currency}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {account.opening_balance_date ? formatDate(account.opening_balance_date) : ''}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600 dark:text-green-400">
                    {formatNumber(account.income_total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600 dark:text-red-400">
                    {formatNumber(account.expense_total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <span className={`font-semibold ${
                      account.balance >= 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {formatNumber(account.balance)} {account.currency}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      account.is_active
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400'
                    }`}>
                      {account.is_active ? t('common.active', 'Aktiv') : t('common.inactive', 'Noaktiv')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedAccountForEdit({
                            id: account.account_id,
                            name: account.account_name,
                            type: account.account_type,
                            currency: account.currency,
                            balance: account.balance,
                            is_active: account.is_active,
                            opening_balance_amount: account.opening_balance_amount,
                            opening_balance_date: account.opening_balance_date,
                            created_at: '',
                            updated_at: ''
                          });
                          setShowAccountModal(true);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title={t('common.edit', 'Tahrirlash')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        {t('common.edit', 'Tahrirlash')}
                      </button>
                      {account.currency === 'USD' && account.is_active && (
                        <button
                          onClick={() => {
                            setSelectedUsdAccount({
                              id: account.account_id,
                              name: account.account_name,
                              type: account.account_type,
                              currency: account.currency,
                              balance: account.balance,
                              is_active: account.is_active,
                              opening_balance_amount: account.opening_balance_amount,
                              opening_balance_date: account.opening_balance_date,
                              created_at: '',
                              updated_at: ''
                            });
                            setShowConvertModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                          title={t('finance.currencyTransfer.convertToUzs', 'UZS ga konvertatsiya qilish')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                          {t('finance.currencyTransfer.convert', 'Konvertatsiya')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expense Statistics Table */}
      {expenseStats.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mt-8">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Chiqimlar Statistikasi
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Kategoriya
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Operatsiyalar soni
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Jami USD
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Jami UZS
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {expenseStats.map((stat) => (
                  <tr key={stat.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xl"
                          style={{ backgroundColor: stat.color }}
                        >
                          {stat.icon}
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {stat.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
                        {stat.transaction_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600 dark:text-red-400 font-semibold">
                      ${formatNumber(stat.total_usd)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600 dark:text-red-400 font-semibold">
                      {formatNumber(stat.total_uzs)} UZS
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-100 dark:bg-gray-900/50 font-bold">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    JAMI
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-200">
                      {expenseStats.reduce((sum, stat) => sum + stat.transaction_count, 0)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-700 dark:text-red-300">
                    ${formatNumber(expenseStats.reduce((sum, stat) => sum + stat.total_usd, 0))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-700 dark:text-red-300">
                    {formatNumber(expenseStats.reduce((sum, stat) => sum + stat.total_uzs, 0))} UZS
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddIncomeModal
        visible={showIncomeModal}
        onClose={() => setShowIncomeModal(false)}
        onSuccess={handleTransactionSuccess}
      />
      <AddExpenseModal
        visible={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        onSuccess={handleTransactionSuccess}
      />
      <AccountModal
        visible={showAccountModal}
        onClose={() => {
          setShowAccountModal(false);
          setSelectedAccountForEdit(null);
        }}
        onSuccess={handleTransactionSuccess}
        account={selectedAccountForEdit}
      />
      <ConvertCurrencyModal
        visible={showConvertModal}
        onClose={() => {
          setShowConvertModal(false);
          setSelectedUsdAccount(null);
        }}
        onSuccess={handleTransactionSuccess}
        defaultFromAccount={selectedUsdAccount}
      />
      <DealerRefundModal
        visible={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        onSuccess={handleTransactionSuccess}
      />
    </div>
  );
}
