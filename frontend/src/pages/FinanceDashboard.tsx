import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getCashSummary } from '../api/finance';
import type { CashSummary, FinanceAccount } from '../types/finance';
import AddIncomeModal from '../components/finance/AddIncomeModal';
import AddExpenseModal from '../components/finance/AddExpenseModal';
import AccountModal from '../components/finance/AccountModal';
import ConvertCurrencyModal from '../components/finance/ConvertCurrencyModal';
import { exportFinanceDashboardToPDF, exportFinanceDashboardToXLSX } from '../utils/exportUtils';

export default function FinanceDashboard() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<CashSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedUsdAccount, setSelectedUsdAccount] = useState<FinanceAccount | null>(null);
  const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<FinanceAccount | null>(null);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getCashSummary();
      const data = response.data;
      if (data) {
        data.accounts = Array.isArray(data.accounts) ? data.accounts : [];
      }
      setSummary(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load cash summary');
    } finally {
      setLoading(false);
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
    loadSummary();
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
            onClick={loadSummary}
            className="btn btn-danger mt-4"
          >
            {t('common.retry', 'Retry')}
          </button>
        </div>
      </div>
    );
  }

  if (!summary || !summary.accounts) return null;

  const safeAccounts = Array.isArray(summary.accounts) ? summary.accounts : [];

  return (
    <div className="page-wrapper space-y-6">
      {/* Header */}
      <header className="card animate-fadeInUp">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {t('finance.dashboard.title', 'Moliya Boshqaruvi')}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {t('finance.dashboard.subtitle', 'Kassa va hisob-kitoblar')}
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
              onClick={() => setShowAccountModal(true)}
              className="btn btn-secondary"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="ml-2">{t('finance.account.create', 'Kassa yaratish')}</span>
            </button>
            <button
              onClick={() => setShowIncomeModal(true)}
              className="btn btn-success"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="ml-2">{t('finance.income.add', 'Kirim qo\'shish')}</span>
            </button>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="btn btn-danger"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
              <span className="ml-2">{t('finance.expense.add', 'Chiqim qo\'shish')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fadeInUp">
        {/* Total Balance USD */}
        <div className="kpi-card kpi-card--blue">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="kpi-value text-number gradient-text">
                ${formatNumber(summary.total_balance_usd)}
              </div>
              <div className="kpi-label">
                {t('finance.dashboard.totalBalanceUSD', 'Jami Balance USD')}
              </div>
            </div>
            <div className="text-blue-500 text-2xl">💰</div>
          </div>
        </div>

        {/* Total Balance UZS */}
        <div className="kpi-card kpi-card--gold">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="kpi-value text-number">
                {formatNumber(summary.total_balance_uzs)} UZS
              </div>
              <div className="kpi-label">
                {t('finance.dashboard.totalBalanceUZS', 'Jami Balance UZS')}
              </div>
            </div>
            <div className="text-amber-500 text-2xl">💳</div>
          </div>
        </div>

        {/* Total Income */}
        <div className="kpi-card kpi-card--emerald">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="kpi-value text-number gradient-text">
                ${formatNumber(summary.total_income_usd)}
              </div>
              <div className="kpi-label">
                {t('finance.dashboard.totalIncome', 'Jami Kirim')}
              </div>
            </div>
            <div className="text-emerald-500 text-2xl">📈</div>
          </div>
        </div>

        {/* Total Expense */}
        <div className="kpi-card kpi-card--coral">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="kpi-value text-number">
                ${formatNumber(summary.total_expense_usd)}
              </div>
              <div className="kpi-label">
                {t('finance.dashboard.totalExpense', 'Jami Chiqim')}
              </div>
            </div>
            <div className="text-red-500 text-2xl">📉</div>
          </div>
        </div>
      </div>

      {/* Secondary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeInUp">
        {/* Total Income UZS */}
        <div className="kpi-card kpi-card--emerald">
          <div className="kpi-value text-number">
            {formatNumber(summary.total_income_uzs)} UZS
          </div>
          <div className="kpi-label">
            {t('finance.dashboard.totalIncomeUZS', 'Jami Kirim UZS')}
          </div>
        </div>

        {/* Total Expense UZS */}
        <div className="kpi-card kpi-card--coral">
          <div className="kpi-value text-number">
            {formatNumber(summary.total_expense_uzs)} UZS
          </div>
          <div className="kpi-label">
            {t('finance.dashboard.totalExpenseUZS', 'Jami Chiqim UZS')}
          </div>
        </div>

        {/* Net Profit */}
        <div className="kpi-card kpi-card--blue">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="kpi-value text-number gradient-text">
                ${formatNumber(summary.total_income_usd - summary.total_expense_usd)}
              </div>
              <div className="kpi-label">
                {t('finance.dashboard.netProfit', 'Sof Foyda')}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {formatNumber(summary.total_income_uzs - summary.total_expense_uzs)} UZS
              </div>
            </div>
            <div className="text-blue-500 text-2xl">✓</div>
          </div>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="card animate-fadeInUp">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            {t('finance.dashboard.accounts', 'Hisoblar')}
          </h2>
          <Link
            to="/finance/transactions"
            className="btn btn-primary"
          >
            {t('finance.dashboard.viewTransactions', 'Operatsiyalarni ko\'rish')}
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="modern-table">
            <thead>
              <tr>
                <th>{t('finance.account.name', 'Nomi')}</th>
                <th>{t('finance.account.type', 'Turi')}</th>
                <th>{t('finance.account.currency', 'Valyuta')}</th>
                <th className="text-right">{t('finance.account.openingBalance', 'Boshlang\'ich balans')}</th>
                <th className="text-right">{t('finance.account.income', 'Kirim')}</th>
                <th className="text-right">{t('finance.account.expense', 'Chiqim')}</th>
                <th className="text-right">{t('finance.account.balance', 'Balans')}</th>
                <th className="text-center">{t('finance.account.status', 'Status')}</th>
                <th className="text-center">{t('common.actions', 'Amallar')}</th>
              </tr>
            </thead>
            <tbody>
              {safeAccounts.map((account) => (
                <tr key={account.account_id}>
                  <td className="font-medium">{account.account_name}</td>
                  <td>
                    <span className="badge badge-info">
                      {getAccountTypeLabel(account.account_type)}
                    </span>
                  </td>
                  <td>{account.currency}</td>
                  <td className="text-right">
                    {account.opening_balance_amount && account.opening_balance_amount > 0 ? (
                      <div>
                        <div className="font-medium text-number text-blue-600 dark:text-blue-400">
                          {formatNumber(account.opening_balance_amount)} {account.currency}
                        </div>
                        <div className="text-xs text-slate-500">
                          {account.opening_balance_date ? formatDate(account.opening_balance_date) : ''}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="text-right font-semibold text-number text-emerald-600 dark:text-emerald-400">
                    {formatNumber(account.income_total)}
                  </td>
                  <td className="text-right font-semibold text-number text-red-600 dark:text-red-400">
                    {formatNumber(account.expense_total)}
                  </td>
                  <td className="text-right">
                    <span className={`font-bold text-number ${
                      account.balance >= 0 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {formatNumber(account.balance)} {account.currency}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className={account.is_active ? "badge badge-success" : "badge badge-info"}>
                      {account.is_active ? t('common.active', 'Aktiv') : t('common.inactive', 'Noaktiv')}
                    </span>
                  </td>
                  <td>
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
                        className="btn btn-ghost btn-sm"
                        title={t('common.edit', 'Tahrirlash')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span className="ml-1">{t('common.edit', 'Tahrirlash')}</span>
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
                          className="btn btn-secondary btn-sm"
                          title={t('finance.currencyTransfer.convertToUzs', 'UZS ga konvertatsiya qilish')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                          <span className="ml-1">{t('finance.currencyTransfer.convert', 'Konvertatsiya')}</span>
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
    </div>
  );
}