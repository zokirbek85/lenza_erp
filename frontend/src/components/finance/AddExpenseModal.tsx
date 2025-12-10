import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { message, Modal, Form, Input, ColorPicker } from 'antd';

import { createFinanceTransaction, getExpenseCategories, createExpenseCategory } from '../../api/finance';
import type { FinanceAccount, Currency, ExpenseCategory } from '../../types/finance';
import { useAuthStore } from '../../auth/useAuthStore';
import { Select } from 'antd';
import { fetchAllPages } from '../../utils/pagination';

interface AddExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddExpenseModal({ visible, onClose, onSuccess }: AddExpenseModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm] = Form.useForm();
  
  const [formData, setFormData] = useState({
    account: 0,
    currency: 'USD' as Currency,
    amount: '',
    category: '',
    comment: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (visible) {
      loadAccounts();
      loadCategories();
    }
  }, [visible]);

  const role = useAuthStore((s) => s.role);

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      // Fetch all pages for accounts
      const accountsList = await fetchAllPages<FinanceAccount>('/finance/accounts/', { is_active: true });
      setAccounts(accountsList);
      console.log('Loaded accounts:', accountsList.length);
    } catch (error: any) {
      console.error('Failed to load accounts:', error);
      message.error(error.response?.data?.detail || t('common.messages.error', 'Xatolik yuz berdi'));
    } finally {
      setLoadingAccounts(false);
    }
  };

  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const response = await getExpenseCategories({ is_active: true });
      // Handle both array and paginated response
      const responseData: any = response.data;
      const data = Array.isArray(responseData) ? responseData : (responseData?.results || []);
      setCategories(data);
    } catch (error: any) {
      console.error('Failed to load categories:', error);
      message.error(t('common.loadError', 'Failed to load categories'));
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleCreateCategory = async () => {
    try {
      const values = await categoryForm.validateFields();
      
      // Convert Color object to hex string
      const colorValue = values.color;
      const hexColor = typeof colorValue === 'object' && colorValue?.toHexString 
        ? colorValue.toHexString() 
        : colorValue || '#6B7280';

      const newCategory = await createExpenseCategory({
        name: values.name,
        color: hexColor,
        icon: values.icon || '📁',
        is_active: true,
        ...(role && ['admin', 'accountant', 'owner'].includes(role) ? { is_global: values.is_global === true } : {}),
      });

      message.success(t('expenseCategory.createSuccess', 'Category created successfully'));
      setCategories([...categories, newCategory.data]);
      setFormData({ ...formData, category: newCategory.data.name });
      setShowCategoryModal(false);
      categoryForm.resetFields();
    } catch (error: any) {
      if (error.response?.data) {
        const errors = error.response.data;
        Object.keys(errors).forEach(key => {
          message.error(`${key}: ${errors[key]}`);
        });
      } else {
        message.error(t('common.saveError', 'Failed to save'));
      }
    }
  };

  const handleCurrencyChange = (currency: Currency) => {
    setFormData({ ...formData, currency });
    // Auto-select matching account if possible
    const matchingAccount = accounts.find(a => a.currency === currency && a.is_active);
    if (matchingAccount) {
      setFormData(prev => ({ ...prev, account: matchingAccount.id }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.account || !formData.amount || !formData.category) {
      message.error(t('finance.expense.fillRequired', 'Barcha majburiy maydonlarni to\'ldiring'));
      return;
    }

    try {
      setLoading(true);
      await createFinanceTransaction({
        type: 'expense',
        account: formData.account,
        currency: formData.currency,
        amount: parseFloat(formData.amount),
        category: formData.category,
        comment: formData.comment,
        date: formData.date,
      });
      
      message.success(t('finance.expense.created', 'Chiqim muvaffaqiyatli qo\'shildi'));
      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 
                      error.response?.data?.message ||
                      JSON.stringify(error.response?.data) ||
                      'Failed to create expense';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      account: 0,
      currency: 'USD',
      amount: '',
      category: '',
      comment: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  if (!visible) return null;

  // Filter accounts by selected currency
  const filteredAccounts = accounts.filter(a => a.currency === formData.currency);

  return (
    <>
      {/* Category Creation Modal */}
      <Modal
        title={t('expenseCategory.create', 'Yangi kategoriya')}
        open={showCategoryModal}
        onOk={handleCreateCategory}
        onCancel={() => {
          setShowCategoryModal(false);
          categoryForm.resetFields();
        }}
        okText={t('common.save', 'Save')}
        cancelText={t('common.cancel', 'Cancel')}
      >
        <Form form={categoryForm} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            label={t('expenseCategory.name', 'Nomi')}
            name="name"
            rules={[
              { required: true, message: t('expenseCategory.nameRequired', 'Name is required') },
              { min: 3, message: t('expenseCategory.nameMinLength', 'Name must be at least 3 characters') },
            ]}
          >
            <Input placeholder={t('expenseCategory.namePlaceholder', 'Masalan: Maosh')} />
          </Form.Item>

          <Form.Item
            label={t('expenseCategory.icon', 'Belgi (Emoji)')}
            name="icon"
            initialValue="📁"
          >
            <Input placeholder="📁" maxLength={10} style={{ fontSize: '1.5rem' }} />
          </Form.Item>

          <Form.Item
            label={t('expenseCategory.color', 'Rang')}
            name="color"
            initialValue="#6B7280"
          >
            <ColorPicker 
              showText
              format="hex"
              presets={[
                {
                  label: 'Recommended',
                  colors: [
                    '#6B7280', '#3B82F6', '#8B5CF6', '#F59E0B', '#10B981',
                    '#EF4444', '#EC4899', '#6366F1', '#F97316', '#14B8A6',
                  ],
                },
              ]}
            />
          </Form.Item>
          {role && ['admin', 'accountant', 'owner'].includes(role) && (
            <Form.Item label={t('expenseCategory.globalLabel', 'Global category')} name="is_global" valuePropName="checked">
              <input type="checkbox" /> {t('expenseCategory.makeGlobal', 'Visible to all users (admin only)')}
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Main Expense Modal */}
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('finance.expense.add', '+ Chiqim qo\'shish')}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('finance.transaction.category', 'Kategoriya')} <span className="text-red-500">*</span>
            </label>
              <div>
                <Select
                  value={formData.category}
                  onChange={(val) => {
                    if (val === '__add_new__') {
                      setShowCategoryModal(true);
                    } else {
                      setFormData({ ...formData, category: val as string });
                    }
                  }}
                  loading={loadingCategories}
                  placeholder={loadingCategories ? t('common.loading', 'Yuklanmoqda...') : t('common.select', 'Tanlang')}
                  style={{ width: '100%' }}
                  optionLabelProp="label"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {categories.map((cat) => (
                    <Select.Option key={cat.id} value={cat.name} label={`${cat.icon} ${cat.name}`}>
                      <span>{cat.is_global ? '🌍 ' : ''}{cat.icon} {cat.name}{cat.is_global ? ` (${t('expenseCategory.global', 'Global')})` : ''}</span>
                    </Select.Option>
                  ))}
                  <Select.Option key="__add_new__" value="__add_new__" label={`➕ ${t('expenseCategory.createNew', "Yangi kategoriya qo' shish")}`}>
                    <span style={{ color: '#10B981', fontWeight: 700 }}>➕ {t('expenseCategory.createNew', "Yangi kategoriya qo' shish")}</span>
                  </Select.Option>
                </Select>
              </div>
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
            <Select
              value={formData.account || undefined}
              onChange={(val: any) => setFormData({ ...formData, account: Number(val) || 0 })}
              disabled={loadingAccounts}
              placeholder={loadingAccounts ? t('common.loading', 'Yuklanmoqda...') : t('common.select', 'Tanlang')}
              style={{ width: '100%' }}
              showSearch
              optionFilterProp="children"
              options={filteredAccounts.map((account) => ({
                label: `${account.name} (${account.type_display || account.type})`,
                value: account.id,
              }))}
            />
            {!loadingAccounts && filteredAccounts.length === 0 && (
              <p className="mt-1 text-sm text-red-500">
                {t('finance.expense.noAccounts', `${formData.currency} hisobi topilmadi`)}
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
              placeholder={t('finance.expense.commentPlaceholder', 'Qo\'shimcha ma\'lumot...')}
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
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('common.saving', 'Saqlanmoqda...') : t('common.save', 'Saqlash')}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}
