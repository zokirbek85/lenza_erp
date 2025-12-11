import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { message } from 'antd';
import { transferCurrency } from '../../api/finance';
import type { FinanceAccount } from '../../types/finance';
import { fetchAllPages } from '../../utils/pagination';

interface ConvertCurrencyModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultFromAccount?: FinanceAccount | null;
}

export default function ConvertCurrencyModal({ 
  visible, 
  onClose, 
  onSuccess, 
  defaultFromAccount 
}: ConvertCurrencyModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [allAccounts, setAllAccounts] = useState<FinanceAccount[]>([]);
  
  const [formData, setFormData] = useState({
    from_account_id: 0,
    to_account_id: 0,
    amount: '',
    rate: '',
    date: new Date().toISOString().split('T')[0],
    comment: '',
  });

  // Determine conversion direction
  const fromAccount = allAccounts.find(a => a.id === formData.from_account_id);
  const toAccount = allAccounts.find(a => a.id === formData.to_account_id);
  const isUsdToUzs = fromAccount?.currency === 'USD' && toAccount?.currency === 'UZS';
  const isUzsToUsd = fromAccount?.currency === 'UZS' && toAccount?.currency === 'USD';
  
  // Calculate target amount
  const targetAmount = formData.amount && formData.rate 
    ? isUsdToUzs 
      ? parseFloat(formData.amount) * parseFloat(formData.rate)
      : isUzsToUsd
      ? parseFloat(formData.amount) / parseFloat(formData.rate)
      : 0
    : 0;

  useEffect(() => {
    if (visible) {
      loadAccounts();
      if (defaultFromAccount) {
        setFormData(prev => ({ ...prev, from_account_id: defaultFromAccount.id }));
      }
    }
  }, [visible, defaultFromAccount]);

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const accounts = await fetchAllPages<FinanceAccount>('/finance/accounts/', { is_active: true });
      setAllAccounts(accounts);
    } catch (error: any) {
      console.error('Failed to load accounts:', error);
      message.error(t('common.messages.error', 'Xatolik yuz berdi'));
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.from_account_id || !formData.to_account_id || !formData.amount || !formData.rate) {
      message.error(t('finance.currencyTransfer.fillRequired', 'Barcha majburiy maydonlarni to\'ldiring'));
      return;
    }

    if (formData.from_account_id === formData.to_account_id) {
      message.error(t('finance.currencyTransfer.differentAccounts', 'Kassalar turli bo\'lishi kerak'));
      return;
    }

    if (!fromAccount || !toAccount) {
      message.error(t('common.messages.error', 'Xatolik yuz berdi'));
      return;
    }

    if (fromAccount.currency === toAccount.currency) {
      message.error(t('finance.currencyTransfer.differentCurrencies', 'Kassalar turli valyutada bo\'lishi kerak'));
      return;
    }

    const parsedAmount = Number(formData.amount);
    const parsedRate = Number(formData.rate);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      message.error(t('finance.currencyTransfer.amountInvalid', 'Miqdor noto\'g\'ri')); 
      return;
    }
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      message.error(t('finance.currencyTransfer.rateInvalid', 'Kurs noto\'g\'ri')); 
      return;
    }

    try {
      setLoading(true);
      await transferCurrency({
        from_account_id: formData.from_account_id,
        to_account_id: formData.to_account_id,
        amount: parsedAmount,
        rate: parsedRate,
        date: formData.date,
        comment: formData.comment,
      });
      
      message.success(t('finance.currencyTransfer.success', 'Valyuta konvertatsiyasi muvaffaqiyatli'));
      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 
                      error.response?.data?.amount?.[0] ||
                      error.response?.data?.message ||
                      JSON.stringify(error.response?.data) ||
                      'Failed to transfer currency';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      from_account_id: 0,
      to_account_id: 0,
      amount: '',
      rate: '',
      date: new Date().toISOString().split('T')[0],
      comment: '',
    });
  };

  if (!visible) return null;

  // Get available accounts based on selection
  const getAvailableToAccounts = () => {
    if (!fromAccount) return allAccounts;
    // Return accounts with different currency
    return allAccounts.filter(a => a.currency !== fromAccount.currency && a.id !== fromAccount.id);
  };

  const getAvailableFromAccounts = () => {
    if (!toAccount) return allAccounts;
    // Return accounts with different currency
    return allAccounts.filter(a => a.currency !== toAccount.currency && a.id !== toAccount.id);
  };

  // Determine labels based on direction
  const getSourceLabel = () => {
    if (!fromAccount) return t('finance.currencyTransfer.fromAccount', 'Kassadan');
    return fromAccount.currency === 'USD' 
      ? t('finance.currencyTransfer.fromAccountUsd', 'USD kassadan')
      : t('finance.currencyTransfer.fromAccountUzs', 'UZS kassadan');
  };

  const getTargetLabel = () => {
    if (!toAccount) return t('finance.currencyTransfer.toAccount', 'Kassaga');
    return toAccount.currency === 'UZS' 
      ? t('finance.currencyTransfer.toAccountUzs', 'UZS kassaga')
      : t('finance.currencyTransfer.toAccountUsd', 'USD kassaga');
  };

  const getAmountLabel = () => {
    if (!fromAccount) return t('finance.currencyTransfer.amount', 'Miqdor');
    return fromAccount.currency === 'USD'
      ? t('finance.currencyTransfer.usdAmount', 'USD miqdori')
      : t('finance.currencyTransfer.uzsAmount', 'UZS miqdori');
  };

  const getTargetAmountLabel = () => {
    if (!toAccount) return '';
    return toAccount.currency === 'UZS'
      ? t('finance.currencyTransfer.uzsAmount', 'UZS miqdori')
      : t('finance.currencyTransfer.usdAmount', 'USD miqdori');
  };

  const getModalTitle = () => {
    if (isUsdToUzs) return 'USD → UZS Konvertatsiya';
    if (isUzsToUsd) return 'UZS → USD Konvertatsiya';
    return t('finance.currencyTransfer.title', 'Valyuta Konvertatsiyasi');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {getModalTitle()}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* From Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {getSourceLabel()} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.from_account_id}
              onChange={(e) => {
                const newFromId = parseInt(e.target.value);
                setFormData({ 
                  ...formData, 
                  from_account_id: newFromId,
                  // Reset to_account if currencies are now the same
                  to_account_id: formData.to_account_id === newFromId ? 0 : formData.to_account_id
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
              disabled={loadingAccounts}
            >
              <option value={0}>{t('common.select', 'Tanlang')}</option>
              {getAvailableFromAccounts().map(account => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.currency === 'USD' ? `$${account.balance.toFixed(2)}` : `${account.balance.toLocaleString()} UZS`})
                </option>
              ))}
            </select>
          </div>

          {/* To Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {getTargetLabel()} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.to_account_id}
              onChange={(e) => setFormData({ ...formData, to_account_id: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
              disabled={loadingAccounts}
            >
              <option value={0}>{t('common.select', 'Tanlang')}</option>
              {getAvailableToAccounts().map(account => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.currency === 'USD' ? `$${account.balance.toFixed(2)}` : `${account.balance.toLocaleString()} UZS`})
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {getAmountLabel()} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="0.00"
              required
            />
            {fromAccount && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('finance.currencyTransfer.available', 'Mavjud')}: {fromAccount.currency === 'USD' ? `$${fromAccount.balance.toFixed(2)}` : `${fromAccount.balance.toLocaleString()} UZS`}
              </p>
            )}
          </div>

          {/* Exchange Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('finance.currencyTransfer.rate', 'Kurs (1 USD = ? UZS)')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              value={formData.rate}
              onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="12500.0000"
              required
            />
          </div>

          {/* Calculated Target Amount */}
          {targetAmount > 0 && toAccount && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {getTargetAmountLabel()}:
                </span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {toAccount.currency === 'USD' 
                    ? `$${targetAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : `${targetAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} UZS`
                  }
                </span>
              </div>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('finance.transaction.date', 'Sana')} <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('finance.transaction.comment', 'Izoh')}
            </label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              rows={3}
              placeholder={t('finance.transaction.commentPlaceholder', 'Qo\'shimcha ma\'lumot...')}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
              disabled={loading}
            >
              {t('common.cancel', 'Bekor qilish')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || loadingAccounts}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('common.processing', 'Jarayonda...')}
                </span>
              ) : (
                t('finance.currencyTransfer.convert', 'Konvertatsiya qilish')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
