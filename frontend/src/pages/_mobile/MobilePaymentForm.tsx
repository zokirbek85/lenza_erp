import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload } from 'antd';
import { UploadOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import MobileDrawerForm from '../../components/responsive/MobileDrawerForm';
import MobileFormField from '../../components/responsive/MobileFormField';

type PaymentFormData = {
  dealer: string;
  pay_date: string;
  amount: string;
  currency: string;
  rate_id: string;
  method: string;
  card_id: string;
  cashbox_id: string;
  note: string;
  receipt_image: File | null;
};

type MobilePaymentFormProps = {
  open: boolean;
  onClose: () => void;
  form: PaymentFormData;
  dealers: Array<{ id: number; name: string }>;
  rates: Array<{ id: number; rate_date: string; usd_to_uzs: number }>;
  cards: Array<{ id: number; name: string; masked_number: string }>;
  cashboxes: Array<{ id: number; name: string; currency: string }>;
  onFormChange: (field: keyof PaymentFormData, value: string | File | null) => void;
  onSubmit: () => void;
  submitting: boolean;
};

/**
 * MobilePaymentForm - Full-screen payment creation form for mobile devices
 * 
 * Features:
 * - Large touch-friendly inputs (min 44px)
 * - Image upload with preview
 * - Fixed bottom action bar
 * - Validation feedback
 * - Dark mode support
 */
const MobilePaymentForm = ({
  open,
  onClose,
  form,
  dealers,
  rates,
  cards,
  cashboxes,
  onFormChange,
  onSubmit,
  submitting,
}: MobilePaymentFormProps) => {
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
      title={t('payments.form.createPayment')}
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dealer Selection */}
        <MobileFormField label={t('payments.form.dealer')} required>
          <select
            required
            value={form.dealer}
            onChange={(e) => onFormChange('dealer', e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            style={{ minHeight: '44px', fontSize: '16px' }}
          >
            <option value="">{t('payments.form.selectDealer')}</option>
            {dealers.map((dealer) => (
              <option key={dealer.id} value={dealer.id}>
                {dealer.name}
              </option>
            ))}
          </select>
        </MobileFormField>

        {/* Cashbox Selection */}
        <MobileFormField label={t('payments.form.cashbox')} required>
          <select
            required
            value={form.cashbox_id}
            onChange={(e) => onFormChange('cashbox_id', e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            style={{ minHeight: '44px', fontSize: '16px' }}
          >
            <option value="">{t('payments.form.selectCashbox')}</option>
            {cashboxes.map((cashbox) => (
              <option key={cashbox.id} value={cashbox.id}>
                {cashbox.name} ({cashbox.currency})
              </option>
            ))}
          </select>
        </MobileFormField>

        {/* Payment Date */}
        <MobileFormField label={t('payments.form.payDate')} required>
          <input
            type="date"
            required
            value={form.pay_date}
            max={today}
            onChange={(e) => onFormChange('pay_date', e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            style={{ minHeight: '44px', fontSize: '16px' }}
          />
        </MobileFormField>

        {/* Amount */}
        <MobileFormField label={t('payments.form.amount')} required>
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
        <MobileFormField label={t('payments.form.currency')} required>
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

        {/* Exchange Rate */}
        <MobileFormField label={t('payments.form.exchangeRate')} required>
          <select
            required
            value={form.rate_id}
            onChange={(e) => onFormChange('rate_id', e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            style={{ minHeight: '44px', fontSize: '16px' }}
          >
            <option value="">{t('payments.form.selectRate')}</option>
            {rates.map((rate) => (
              <option key={rate.id} value={rate.id}>
                {rate.rate_date} - {rate.usd_to_uzs} UZS
              </option>
            ))}
          </select>
        </MobileFormField>

        {/* Payment Method */}
        <MobileFormField label={t('payments.form.method')} required>
          <select
            required
            value={form.method}
            onChange={(e) => onFormChange('method', e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            style={{ minHeight: '44px', fontSize: '16px' }}
          >
            <option value="cash">{t('payments.methods.cash')}</option>
            <option value="card">{t('payments.methods.card')}</option>
            <option value="transfer">{t('payments.methods.transfer')}</option>
          </select>
        </MobileFormField>

        {/* Card Selection (if method is card) */}
        {form.method === 'card' && (
          <MobileFormField label={t('payments.form.card')} required>
            <select
              required
              value={form.card_id}
              onChange={(e) => onFormChange('card_id', e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              style={{ minHeight: '44px', fontSize: '16px' }}
            >
              <option value="">{t('payments.form.selectCard')}</option>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name} - {card.masked_number}
                </option>
              ))}
            </select>
          </MobileFormField>
        )}

        {/* Note */}
        <MobileFormField label={t('payments.form.note')}>
          <textarea
            value={form.note}
            onChange={(e) => onFormChange('note', e.target.value)}
            placeholder={t('payments.form.notePlaceholder')}
            rows={3}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            style={{ fontSize: '16px' }}
          />
        </MobileFormField>

        {/* Receipt Image Upload */}
        <MobileFormField
          label={t('payments.form.receiptImage')}
          hint={t('payments.form.receiptHint')}
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
                    {t('payments.form.uploadReceipt')}
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

export default MobilePaymentForm;
