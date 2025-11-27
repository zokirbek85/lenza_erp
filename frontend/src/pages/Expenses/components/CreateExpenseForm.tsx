import { useState, useEffect, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, message } from 'antd';
import dayjs from 'dayjs';
import { createExpense, type ExpenseCategory } from '../../../services/expenseApi';
import { fetchCashboxes, createCashbox, type Cashbox } from '../../../services/cashboxApi';

interface CreateExpenseFormProps {
  categories: ExpenseCategory[];
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CreateExpenseForm({
  categories,
  onSuccess,
  onCancel,
}: CreateExpenseFormProps) {
  const { t } = useTranslation();

  // Form state
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [category, setCategory] = useState<number | ''>('');
  const [cashbox, setCashbox] = useState<number | ''>('');
  const [currency, setCurrency] = useState<'USD' | 'UZS'>('USD');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Cashboxes
  const [cashboxes, setCashboxes] = useState<Cashbox[]>([]);
  const [loadingCashboxes, setLoadingCashboxes] = useState(false);
  const [cashboxModalOpen, setCashboxModalOpen] = useState(false);
  const [newCashboxName, setNewCashboxName] = useState('');
  const [newCashboxType, setNewCashboxType] = useState<'CASH_UZS' | 'CASH_USD' | 'CARD'>('CASH_UZS');
  const [newCashboxCurrency, setNewCashboxCurrency] = useState<'USD' | 'UZS'>('UZS');

  // Load cashboxes on mount
  useEffect(() => {
    loadCashboxes();
  }, []);

  // Auto-set currency when cashbox is selected
  useEffect(() => {
    if (cashbox && cashboxes.length) {
      const selected = cashboxes.find((c) => c.id === cashbox);
      if (selected) {
        setCurrency(selected.currency as 'USD' | 'UZS');
      }
    }
  }, [cashbox, cashboxes]);

  // Auto-set currency when creating new cashbox based on type
  useEffect(() => {
    if (newCashboxType === 'CASH_UZS') {
      setNewCashboxCurrency('UZS');
    } else if (newCashboxType === 'CASH_USD') {
      setNewCashboxCurrency('USD');
    }
  }, [newCashboxType]);

  const loadCashboxes = async () => {
    setLoadingCashboxes(true);
    try {
      const data = await fetchCashboxes();
      setCashboxes(Array.isArray(data) ? data.filter((c) => c.is_active) : []);
    } catch (error) {
      console.error('Failed to load cashboxes:', error);
      message.error(t('expenses.messages.loadCashboxesError'));
      setCashboxes([]);
    } finally {
      setLoadingCashboxes(false);
    }
  };

  const handleCreateCashbox = async () => {
    if (!newCashboxName.trim()) {
      message.error(t('expenses.messages.cashboxNameRequired'));
      return;
    }

    try {
      const newCashbox = await createCashbox({
        name: newCashboxName.trim(),
        type:
          newCashboxType === 'CASH_UZS'
            ? 'cash_uzs'
            : newCashboxType === 'CASH_USD'
            ? 'cash_usd'
            : 'card',
        cashbox_type: newCashboxType,
        currency: newCashboxCurrency,
        description: '',
        is_active: true,
      });

      message.success(t('expenses.messages.cashboxCreated'));
      setCashboxModalOpen(false);
      setNewCashboxName('');
      setNewCashboxType('CASH_UZS');
      setNewCashboxCurrency('UZS');

      // Reload cashboxes and auto-select new one
      await loadCashboxes();
      setCashbox(newCashbox.id);
    } catch (error) {
      console.error('Failed to create cashbox:', error);
      message.error(t('expenses.messages.cashboxCreateError'));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validation
    if (!date) {
      message.error(t('expenses.validation.dateRequired'));
      return;
    }
    if (!category) {
      message.error(t('expenses.validation.categoryRequired'));
      return;
    }
    if (!cashbox) {
      message.error(t('expenses.validation.cashboxRequired'));
      return;
    }
    if (!amount || Number(amount) <= 0) {
      message.error(t('expenses.validation.amountRequired'));
      return;
    }

    // Validate currency matches cashbox
    const selectedCashbox = cashboxes.find((c) => c.id === cashbox);
    if (selectedCashbox && currency !== selectedCashbox.currency) {
      message.error(t('expenses.validation.currencyMismatch'));
      return;
    }

    setSubmitting(true);
    try {
      await createExpense({
        date,
        category: Number(category),
        cashbox: Number(cashbox),
        currency,
        amount: Number(amount),
        description: description.trim(),
      });

      message.success(t('expenses.messages.created'));
      handleReset();
      onSuccess();
    } catch (error: any) {
      console.error('Failed to create expense:', error);
      const errorMessage = error?.response?.data?.detail || t('expenses.messages.createError');
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setDate(dayjs().format('YYYY-MM-DD'));
    setCategory('');
    setCashbox('');
    setCurrency('USD');
    setAmount('');
    setDescription('');
  };

  const handleCancel = () => {
    handleReset();
    onCancel();
  };

  return (
    <Card
      title={t('expenses.form.title')}
      className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
      headStyle={{
        backgroundColor: 'transparent',
        borderBottom: '1px solid rgb(226 232 240 / 0.7)',
      }}
      bodyStyle={{ padding: '24px' }}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Date, Category, Cashbox */}
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              {t('expenses.form.date')} <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              {t('expenses.form.category')} <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value ? Number(e.target.value) : '')}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">{t('expenses.form.categoryPlaceholder')}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              {t('expenses.form.cashbox')} <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <select
                required
                value={cashbox}
                onChange={(e) => setCashbox(e.target.value ? Number(e.target.value) : '')}
                disabled={loadingCashboxes}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">{t('expenses.form.cashboxPlaceholder')}</option>
                {cashboxes.map((cb) => (
                  <option key={cb.id} value={cb.id}>
                    {cb.name} ({cb.currency})
                  </option>
                ))}
              </select>
              <Button
                type="dashed"
                size="middle"
                onClick={() => setCashboxModalOpen(true)}
                className="whitespace-nowrap"
              >
                + {t('expenses.form.createCashbox')}
              </Button>
            </div>
          </div>
        </div>

        {/* Row 2: Currency, Amount */}
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              {t('expenses.form.currency')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              disabled
              value={currency}
              className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-700 dark:text-slate-400"
              title={t('expenses.form.currencyHint')}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              {t('expenses.form.amount')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        {/* Row 3: Description */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            {t('expenses.form.description')}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('expenses.form.descriptionPlaceholder')}
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
          <Button
            type="default"
            onClick={handleCancel}
            disabled={submitting}
            className="rounded-lg"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            className="rounded-lg bg-amber-500 hover:bg-amber-600"
            style={{ backgroundColor: '#f59e0b', borderColor: '#f59e0b' }}
          >
            {t('common.save')}
          </Button>
        </div>
      </form>

      {/* Create Cashbox Modal */}
      {cashboxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800">
            <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
              {t('expenses.form.createCashbox')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t('expenses.form.cashboxName')}
                </label>
                <input
                  type="text"
                  value={newCashboxName}
                  onChange={(e) => setNewCashboxName(e.target.value)}
                  placeholder={t('expenses.form.cashboxNamePlaceholder')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t('expenses.form.cashboxType')}
                </label>
                <select
                  value={newCashboxType}
                  onChange={(e) => setNewCashboxType(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="CASH_UZS">{t('expenses.form.cashUzs')}</option>
                  <option value="CASH_USD">{t('expenses.form.cashUsd')}</option>
                  <option value="CARD">{t('expenses.form.card')}</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t('expenses.form.currency')}
                </label>
                <select
                  value={newCashboxCurrency}
                  onChange={(e) => setNewCashboxCurrency(e.target.value as any)}
                  disabled={newCashboxType !== 'CARD'}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-700"
                >
                  <option value="UZS">UZS</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button onClick={() => setCashboxModalOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                type="primary"
                onClick={handleCreateCashbox}
                className="bg-amber-500"
                style={{ backgroundColor: '#f59e0b', borderColor: '#f59e0b' }}
              >
                {t('common.create')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
