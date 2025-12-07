import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { message } from 'antd';
import { createFinanceAccount, updateFinanceAccount } from '../../api/finance';
import type { FinanceAccount, Currency } from '../../types/finance';

interface AccountModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  account?: FinanceAccount | null;
}

export default function AccountModal({ visible, onClose, onSuccess, account }: AccountModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'cash' as 'cash' | 'card' | 'bank',
    currency: 'UZS' as Currency,
    opening_balance_amount: '',
    opening_balance_date: '',
    is_active: true,
  });

  useEffect(() => {
    if (visible) {
      if (account) {
        // Edit mode - populate with existing data
        setFormData({
          name: account.name,
          type: account.type,
          currency: account.currency,
          opening_balance_amount: account.opening_balance_amount ? account.opening_balance_amount.toString() : '',
          opening_balance_date: account.opening_balance_date || '',
          is_active: account.is_active,
        });
      } else {
        // Create mode - reset form
        resetForm();
      }
    }
  }, [visible, account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      message.error(t('finance.account.nameRequired', 'Kassa nomi kiritilishi shart'));
      return;
    }

    // Validate opening balance
    const openingAmount = parseFloat(formData.opening_balance_amount || '0');
    if (openingAmount > 0 && !formData.opening_balance_date) {
      message.error(t('finance.account.openingBalanceDateRequired', 'Boshlang\'ich balans sanasi kiritilishi shart'));
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: formData.name,
        type: formData.type,
        currency: formData.currency,
        opening_balance_amount: openingAmount,
        opening_balance_date: formData.opening_balance_date || null,
        is_active: formData.is_active,
      };

      if (account) {
        // Update existing account
        await updateFinanceAccount(account.id, payload);
        message.success(t('finance.account.updated', 'Kassa muvaffaqiyatli yangilandi'));
      } else {
        // Create new account
        await createFinanceAccount(payload);
        message.success(t('finance.account.created', 'Kassa muvaffaqiyatli yaratildi'));
      }
      
      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 
                      error.response?.data?.message ||
                      error.response?.data?.opening_balance_date?.[0] ||
                      JSON.stringify(error.response?.data) ||
                      'Failed to save account';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'cash',
      currency: 'UZS',
      opening_balance_amount: '',
      opening_balance_date: '',
      is_active: true,
    });
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {account 
              ? t('finance.account.edit', 'Kassani tahrirlash') 
              : t('finance.account.create', '+ Kassa yaratish')
            }
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Account Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('finance.account.name', 'Kassa nomi')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder={t('finance.account.namePlaceholder', 'Masalan: Asosiy kassa')}
              required
            />
          </div>

          {/* Account Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('finance.account.type', 'Turi')} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
            >
              <option value="cash">{t('finance.accountType.cash', 'Naqd pul')}</option>
              <option value="card">{t('finance.accountType.card', 'Karta')}</option>
              <option value="bank">{t('finance.accountType.bank', 'Bank hisob')}</option>
            </select>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('finance.account.currency', 'Valyuta')} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value as Currency })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
            >
              <option value="UZS">UZS</option>
              <option value="USD">USD</option>
            </select>
          </div>

          {/* Opening Balance Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('finance.account.openingBalance', 'Boshlang\'ich balans')}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.opening_balance_amount}
              onChange={(e) => setFormData({ ...formData, opening_balance_amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="0.00"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('finance.account.openingBalanceHint', 'Kassa yaratilgan paytdagi boshlang\'ich balans')}
            </p>
          </div>

          {/* Opening Balance Date */}
          {parseFloat(formData.opening_balance_amount || '0') > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('finance.account.openingBalanceDate', 'Boshlang\'ich balans sanasi')} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.opening_balance_date}
                onChange={(e) => setFormData({ ...formData, opening_balance_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required={parseFloat(formData.opening_balance_amount || '0') > 0}
              />
            </div>
          )}

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              {t('finance.account.isActive', 'Aktiv')}
            </label>
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
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('common.saving', 'Saqlanmoqda...')}
                </span>
              ) : (
                account ? t('common.save', 'Saqlash') : t('common.create', 'Yaratish')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
