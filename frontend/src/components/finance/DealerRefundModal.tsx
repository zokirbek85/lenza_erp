import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { message } from 'antd';
import { dealerRefund } from '../../api/finance';
import type { FinanceAccount } from '../../types/finance';
import type { Dealer } from '../../types/dealer';
import { fetchAllPages } from '../../utils/pagination';

interface DealerRefundModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DealerRefundModal({ 
  visible, 
  onClose, 
  onSuccess 
}: DealerRefundModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  
  const [formData, setFormData] = useState({
    dealer_id: 0,
    amount: '',
    currency: 'UZS' as 'USD' | 'UZS',
    account_id: 0,
    description: '',
  });

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [dealersData, accountsData] = await Promise.all([
        fetchAllPages<Dealer>('/dealers/dealers/'),
        fetchAllPages<FinanceAccount>('/finance/accounts/', { is_active: true })
      ]);
      setDealers(dealersData);
      setAccounts(accountsData);
    } catch (error: any) {
      console.error('Failed to load data:', error);
      message.error(t('common.messages.error', 'Xatolik yuz berdi'));
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.dealer_id || !formData.amount || !formData.account_id) {
      message.error(t('finance.dealerRefund.fillRequired', 'Barcha majburiy maydonlarni to\'ldiring'));
      return;
    }

    const parsedAmount = Number(formData.amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      message.error(t('finance.dealerRefund.amountInvalid', 'Miqdor noto\'g\'ri')); 
      return;
    }

    const selectedAccount = accounts.find(a => a.id === formData.account_id);
    if (!selectedAccount) {
      message.error(t('finance.dealerRefund.accountNotFound', 'Kassa topilmadi'));
      return;
    }

    if (selectedAccount.currency !== formData.currency) {
      message.error(t('finance.dealerRefund.currencyMismatch', 'Kassa valyutasi tanlangan valyutaga mos emas'));
      return;
    }

    if (selectedAccount.balance < parsedAmount) {
      message.error(t('finance.dealerRefund.insufficientBalance', 'Kassada yetarli mablag\' yo\'q'));
      return;
    }

    try {
      setLoading(true);
      const response = await dealerRefund({
        dealer_id: formData.dealer_id,
        amount: parsedAmount,
        currency: formData.currency,
        account_id: formData.account_id,
        description: formData.description,
      });
      
      message.success(response.data.message || t('finance.dealerRefund.success', 'To\'lov qaytarish muvaffaqiyatli'));
      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 
                      error.response?.data?.amount?.[0] ||
                      error.response?.data?.message ||
                      JSON.stringify(error.response?.data) ||
                      'Failed to process refund';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      dealer_id: 0,
      amount: '',
      currency: 'UZS',
      account_id: 0,
      description: '',
    });
  };

  if (!visible) return null;

  const selectedAccount = accounts.find(a => a.id === formData.account_id);
  const availableAccounts = accounts.filter(a => a.currency === formData.currency);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('finance.dealerRefund.title', 'Dilerga To\'lov Qaytarish')}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Dealer Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('finance.dealerRefund.dealer', 'Diler')} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.dealer_id}
              onChange={(e) => setFormData({ ...formData, dealer_id: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
              disabled={loadingData}
            >
              <option value={0}>{t('common.select', 'Tanlang')}</option>
              {dealers.map(dealer => (
                <option key={dealer.id} value={dealer.id}>
                  {dealer.name}
                </option>
              ))}
            </select>
          </div>

          {/* Currency Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('finance.dealerRefund.currency', 'Valyuta')} <span className="text-red-500">*</span>
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="currency"
                  value="UZS"
                  checked={formData.currency === 'UZS'}
                  onChange={() => setFormData({ ...formData, currency: 'UZS', account_id: 0 })}
                  className="mr-2"
                />
                <span className="text-gray-700 dark:text-gray-300">UZS</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="currency"
                  value="USD"
                  checked={formData.currency === 'USD'}
                  onChange={() => setFormData({ ...formData, currency: 'USD', account_id: 0 })}
                  className="mr-2"
                />
                <span className="text-gray-700 dark:text-gray-300">USD</span>
              </label>
            </div>
          </div>

          {/* Account Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('finance.dealerRefund.account', 'Kassa')} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.account_id}
              onChange={(e) => setFormData({ ...formData, account_id: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
              disabled={loadingData}
            >
              <option value={0}>{t('common.select', 'Tanlang')}</option>
              {availableAccounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.currency === 'USD' ? `$${account.balance.toFixed(2)}` : `${account.balance.toLocaleString()} UZS`})
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('finance.dealerRefund.amount', 'Miqdor')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder={formData.currency === 'USD' ? '0.00' : '0'}
              required
            />
            {selectedAccount && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('finance.dealerRefund.available', 'Mavjud')}: {selectedAccount.currency === 'USD' ? `$${selectedAccount.balance.toFixed(2)}` : `${selectedAccount.balance.toLocaleString()} UZS`}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('finance.dealerRefund.description', 'Izoh')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              rows={3}
              placeholder={t('finance.dealerRefund.descriptionPlaceholder', 'Qaytarish sababi...')}
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
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || loadingData}
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
                t('finance.dealerRefund.refund', 'To\'lov qaytarish')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
