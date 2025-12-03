import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { message } from 'antd';
import { getFinanceAccounts, createFinanceTransaction } from '../../api/finance';
import { getDealers } from '../../api/dealers';
import type { FinanceAccount, Currency } from '../../types/finance';
import type { Dealer } from '../../types/dealer';

interface AddIncomeModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddIncomeModal({ visible, onClose, onSuccess }: AddIncomeModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
  
  const [formData, setFormData] = useState({
    dealer: '',
    account: '',
    currency: 'USD' as Currency,
    amount: '',
    comment: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    try {
      const [dealersRes, accountsRes] = await Promise.all([
        getDealers({}),
        getFinanceAccounts({ is_active: true }),
      ]);
      
      const dealersList = Array.isArray(dealersRes.data)
        ? dealersRes.data
        : (dealersRes.data as any)?.results || [];
      const accountsList = Array.isArray(accountsRes.data)
        ? accountsRes.data
        : (accountsRes.data as any)?.results || [];
      
      setDealers(dealersList);
      setAccounts(accountsList);
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to load data');
    }
  };

  const handleDealerChange = (dealerId: string) => {
    setFormData({ ...formData, dealer: dealerId });
    const dealer = dealers.find(d => d.id.toString() === dealerId);
    setSelectedDealer(dealer || null);
  };

  const handleCurrencyChange = (currency: Currency) => {
    setFormData({ ...formData, currency });
    // Auto-select matching account if possible
    const matchingAccount = accounts.find(a => a.currency === currency && a.is_active);
    if (matchingAccount) {
      setFormData(prev => ({ ...prev, account: matchingAccount.id.toString() }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.dealer || !formData.account || !formData.amount) {
      message.error(t('finance.income.fillRequired', 'Barcha majburiy maydonlarni to\'ldiring'));
      return;
    }

    try {
      setLoading(true);
      await createFinanceTransaction({
        type: 'income',
        dealer: parseInt(formData.dealer),
        account: parseInt(formData.account),
        currency: formData.currency,
        amount: formData.amount,
        comment: formData.comment,
        date: formData.date,
      });
      
      message.success(t('finance.income.created', 'Kirim muvaffaqiyatli qo\'shildi'));
      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 
                      error.response?.data?.message ||
                      JSON.stringify(error.response?.data) ||
                      'Failed to create income';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      dealer: '',
      account: '',
      currency: 'USD',
      amount: '',
      comment: '',
      date: new Date().toISOString().split('T')[0],
    });
    setSelectedDealer(null);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ' ' + currency;
  };

  if (!visible) return null;

  // Filter accounts by selected currency
  const filteredAccounts = accounts.filter(a => a.currency === formData.currency);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('finance.income.add', '+ Kirim qo\'shish')}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Dealer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('finance.transaction.dealer', 'Diler')} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.dealer}
              onChange={(e) => handleDealerChange(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">{t('common.select', 'Tanlang')}</option>
              {dealers.map((dealer) => (
                <option key={dealer.id} value={dealer.id}>
                  {dealer.name}
                </option>
              ))}
            </select>
            {selectedDealer && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {t('finance.income.currentDebt', 'Joriy qarz')}:{' '}
                  <span className={`font-semibold ${
                    (selectedDealer.current_debt_usd || 0) > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    ${formatCurrency(selectedDealer.current_debt_usd || 0, 'USD')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('finance.transaction.date', 'Sana')} <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('finance.transaction.currency', 'Valyuta')} <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleCurrencyChange('USD')}
                className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                  formData.currency === 'USD'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                }`}
              >
                USD
              </button>
              <button
                type="button"
                onClick={() => handleCurrencyChange('UZS')}
                className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                  formData.currency === 'UZS'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                }`}
              >
                UZS
              </button>
            </div>
          </div>

          {/* Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('finance.transaction.account', 'Hisob')} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.account}
              onChange={(e) => setFormData({ ...formData, account: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">{t('common.select', 'Tanlang')}</option>
              {filteredAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.type_display})
                </option>
              ))}
            </select>
            {filteredAccounts.length === 0 && (
              <p className="mt-1 text-sm text-red-500">
                {t('finance.income.noAccounts', `${formData.currency} hisobi topilmadi`)}
              </p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('finance.transaction.amount', 'Summa')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                placeholder="0.00"
                className="w-full px-3 py-2 pr-16 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                {formData.currency}
              </span>
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('finance.transaction.comment', 'Izoh')}
            </label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              rows={3}
              placeholder={t('finance.income.commentPlaceholder', 'Qo\'shimcha ma\'lumot...')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                resetForm();
              }}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {t('common.cancel', 'Bekor qilish')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('common.saving', 'Saqlanmoqda...') : t('common.save', 'Saqlash')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
