import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload } from 'antd';
import { UploadOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import MobileDrawerForm from '../../components/responsive/MobileDrawerForm';
import MobileFormField from '../../components/responsive/MobileFormField';

/**
 * Finance Transaction Form Data
 * Maps to backend /api/finance/transactions/ endpoint
 * 
 * Required fields:
 * - type: 'income' | 'expense'
 * - dealer: Required for income, not allowed for expense
 * - account: Finance account ID (replaces cashbox_id)
 * - date: Transaction date
 * - currency: 'USD' | 'UZS'
 * - amount: Transaction amount
 * 
 * Optional fields:
 * - category: Required for expense, not allowed for income
 * - comment: Notes/description
 * - status: 'draft' | 'approved' (default: draft)
 */
type FinanceTransactionFormData = {
  type: 'income' | 'expense';
  dealer: string; // Dealer ID (only for income)
  account: string; // FinanceAccount ID (replaces cashbox_id)
  date: string; // Transaction date (replaces pay_date)
  amount: string;
  currency: string;
  category: string; // Only for expense type
  comment: string; // Replaces note
  receipt_image: File | null;
};

type MobileFinanceTransactionFormProps = {
  open: boolean;
  onClose: () => void;
  form: FinanceTransactionFormData;
  dealers: Array<{ id: number; name: string }>;
  accounts: Array<{ id: number; name: string; currency: string; type: string }>; // FinanceAccounts (replaces cashboxes)
  expenseCategories?: Array<{ id: string; label: string; is_global?: boolean }>; // For expense type
  onFormChange: (field: keyof FinanceTransactionFormData, value: string | File | null) => void;
  onSubmit: () => void;
  submitting: boolean;
};

/**
 * MobileFinanceTransactionForm - Mobile form for creating finance transactions
 * 
 * Features:
 * - Supports both income (dealer payments) and expense transactions
 * - Uses /api/finance/transactions/ endpoint
 * - Large touch-friendly inputs (min 44px)
 * - Image upload with preview
 * - Fixed bottom action bar
 * - Validation feedback
 * - Dark mode support
 * 
 * Backend integration:
 * POST /api/finance/transactions/
 * {
 *   "type": "income", // or "expense"
 *   "dealer": 1, // Only for income
 *   "account": 1, // FinanceAccount ID
 *   "date": "2025-12-04",
 *   "currency": "USD",
 *   "amount": 1000.00,
 *   "category": null, // Only for expense
 *   "comment": "Optional notes",
 *   "status": "draft" // or "approved"
 * }
 */
const MobileFinanceTransactionForm = ({
  open,
  onClose,
  form,
  dealers,
  accounts,
  expenseCategories = [],
  onFormChange,
  onSubmit,
  submitting,
}: MobileFinanceTransactionFormProps) => {
  const { t } = useTranslation();
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const handleUploadChange = (info: any) => {
    let newFileList = [...info.fileList];
    newFileList = newFileList.slice(-1); // Keep only last file

    setFileList(newFileList);

    if (info.file.status === 'done' || info.file.originFileObj) {
      onFormChange('receipt_image', info.file.originFileObj);
    }
  };

  const handleRemoveImage = () => {
    setFileList([]);
    onFormChange('receipt_image', null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const today = new Date().toISOString().split('T')[0];
  const isIncome = form.type === 'income';
  const isExpense = form.type === 'expense';

  const footer = (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onClose}
        disabled={submitting}
        className="mobile-btn flex-1 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        {t('common:actions.cancel')}
      </button>
      <button
        type="submit"
        onClick={handleSubmit}
        disabled={submitting}
        className="mobile-btn flex-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
      >
        {submitting ? t('common:actions.saving') : t('common:actions.save')}
      </button>
    </div>
  );

  return (
    <MobileDrawerForm
      open={open}
      onClose={onClose}
      title={t('finance.form.createTransaction')}
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Transaction Type */}
        <MobileFormField label={t('finance.form.type')} required>
          <select
            required
            value={form.type}
            onChange={(e) => onFormChange('type', e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            style={{ minHeight: '44px', fontSize: '16px' }}
          >
            <option value="income">{t('finance.types.income')}</option>
            <option value="expense">{t('finance.types.expense')}</option>
          </select>
        </MobileFormField>

        {/* Dealer Selection (only for income) */}
        {isIncome && (
          <MobileFormField label={t('finance.form.dealer')} required>
            <select
              required
              value={form.dealer}
              onChange={(e) => onFormChange('dealer', e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              style={{ minHeight: '44px', fontSize: '16px' }}
            >
              <option value="">{t('finance.form.selectDealer')}</option>
              {dealers.map((dealer) => (
                <option key={dealer.id} value={dealer.id}>
                  {dealer.name}
                </option>
              ))}
            </select>
          </MobileFormField>
        )}

        {/* Expense Category (only for expense) */}
        {isExpense && expenseCategories.length > 0 && (
          <MobileFormField label={t('finance.form.category')} required>
            <select
              required
              value={form.category}
              onChange={(e) => onFormChange('category', e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              style={{ minHeight: '44px', fontSize: '16px' }}
            >
              <option value="">{t('finance.form.selectCategory')}</option>
              {expenseCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.is_global ? '🌍 ' : ''}{cat.label}
                </option>
              ))}
            </select>
          </MobileFormField>
        )}

        {/* Finance Account Selection */}
        <MobileFormField label={t('finance.form.account')} required>
          <select
            required
            value={form.account}
            onChange={(e) => onFormChange('account', e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            style={{ minHeight: '44px', fontSize: '16px' }}
          >
            <option value="">{t('finance.form.selectAccount')}</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.currency}) - {account.type}
              </option>
            ))}
          </select>
        </MobileFormField>

        {/* Transaction Date */}
        <MobileFormField label={t('finance.form.date')} required>
          <input
            type="date"
            required
            value={form.date}
            max={today}
            onChange={(e) => onFormChange('date', e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            style={{ minHeight: '44px', fontSize: '16px' }}
          />
        </MobileFormField>

        {/* Amount */}
        <MobileFormField label={t('finance.form.amount')} required>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => onFormChange('amount', e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            style={{ minHeight: '44px', fontSize: '16px' }}
          />
        </MobileFormField>

        {/* Currency */}
        <MobileFormField label={t('finance.form.currency')} required>
          <select
            required
            value={form.currency}
            onChange={(e) => onFormChange('currency', e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            style={{ minHeight: '44px', fontSize: '16px' }}
          >
            <option value="USD">USD</option>
            <option value="UZS">UZS</option>
          </select>
        </MobileFormField>

        {/* Comment/Note */}
        <MobileFormField label={t('finance.form.comment')}>
          <textarea
            value={form.comment}
            onChange={(e) => onFormChange('comment', e.target.value)}
            placeholder={t('finance.form.commentPlaceholder')}
            rows={3}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            style={{ fontSize: '16px' }}
          />
        </MobileFormField>

        {/* Receipt Image Upload */}
        <MobileFormField
          label={t('finance.form.receiptImage')}
          hint={t('finance.form.receiptHint')}
        >
          <div className="space-y-3">
            <Upload
              fileList={fileList}
              onChange={handleUploadChange}
              beforeUpload={() => false}
              accept="image/*"
              maxCount={1}
              listType="picture-card"
              className="mobile-upload"
            >
              {fileList.length < 1 && (
                <div className="flex flex-col items-center justify-center p-4">
                  <UploadOutlined className="text-2xl text-slate-400" />
                  <span className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {t('finance.form.uploadReceipt')}
                  </span>
                </div>
              )}
            </Upload>

            {fileList.length > 0 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const file = fileList[0];
                    if (file.originFileObj) {
                      const url = URL.createObjectURL(file.originFileObj);
                      window.open(url, '_blank');
                    }
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <EyeOutlined />
                  {t('common:actions.preview')}
                </button>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                >
                  <DeleteOutlined />
                  {t('common:actions.remove')}
                </button>
              </div>
            )}
          </div>
        </MobileFormField>

        {/* Bottom spacing for fixed footer */}
        <div style={{ height: '80px' }} />
      </form>
    </MobileDrawerForm>
  );
};

export default MobileFinanceTransactionForm;
