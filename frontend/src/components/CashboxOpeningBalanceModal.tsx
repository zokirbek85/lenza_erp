import { useEffect } from 'react';
import { Modal, Form, InputNumber, Select, DatePicker, message } from 'antd';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import type { CashboxOpeningBalance } from '../api/cashboxApi';
import { createOpeningBalance, updateOpeningBalance } from '../api/cashboxApi';

interface CashboxOpeningBalanceModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingBalance?: CashboxOpeningBalance | null;
}

const CashboxOpeningBalanceModal = ({
  open,
  onClose,
  onSuccess,
  editingBalance,
}: CashboxOpeningBalanceModalProps) => {
  const { t } = useTranslation(['cashbox', 'common']);
  const [form] = Form.useForm();

  const isEditing = !!editingBalance;

  useEffect(() => {
    if (open && editingBalance) {
      form.setFieldsValue({
        cashbox_type: editingBalance.cashbox_type,
        balance: editingBalance.balance,
        currency: editingBalance.currency,
        date: dayjs(editingBalance.date),
      });
    } else if (open) {
      form.resetFields();
      form.setFieldsValue({
        date: dayjs(),
        currency: 'UZS',
      });
    }
  }, [open, editingBalance, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        cashbox_type: values.cashbox_type,
        balance: values.balance,
        currency: values.currency,
        date: values.date.format('YYYY-MM-DD'),
      };

      if (isEditing) {
        await updateOpeningBalance(editingBalance.id, payload);
        message.success(t('cashbox.messages.updated'));
      } else {
        await createOpeningBalance(payload);
        message.success(t('cashbox.messages.created'));
      }

      form.resetFields();
      onSuccess();
      onClose();
    } catch (error: any) {
      if (error.response?.data) {
        const errorMsg = Object.values(error.response.data).flat().join(', ');
        message.error(errorMsg || t('common:messages.error'));
      } else {
        message.error(t('common:messages.error'));
      }
      console.error('Submit error:', error);
    }
  };

  return (
    <Modal
      title={isEditing ? t('cashbox.editOpeningBalance') : t('cashbox.addOpeningBalance')}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={t('common:actions.save')}
      cancelText={t('common:actions.cancel')}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          name="cashbox_type"
          label={t('cashbox.cashboxType')}
          rules={[{ required: true, message: t('cashbox.validation.cashboxTypeRequired') }]}
        >
          <Select
            placeholder={t('cashbox.selectCashboxType')}
            disabled={isEditing}
            options={[
              { value: 'CARD', label: 'Karta (Card)' },
              { value: 'CASH_UZS', label: 'Naqd pul UZS (Cash UZS)' },
              { value: 'CASH_USD', label: 'Naqd pul USD (Cash USD)' },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="balance"
          label={t('cashbox.balance')}
          rules={[
            { required: true, message: t('cashbox.validation.balanceRequired') },
            { type: 'number', min: 0, message: t('cashbox.validation.balancePositive') },
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder={t('cashbox.enterBalance')}
            min={0}
            step={0.01}
            precision={2}
          />
        </Form.Item>

        <Form.Item
          name="currency"
          label={t('cashbox.currency')}
          rules={[{ required: true, message: t('cashbox.validation.currencyRequired') }]}
        >
          <Select
            placeholder={t('cashbox.selectCurrency')}
            options={[
              { value: 'USD', label: 'USD' },
              { value: 'UZS', label: 'UZS' },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="date"
          label={t('cashbox.openingDate')}
          rules={[{ required: true, message: t('cashbox.validation.dateRequired') }]}
        >
          <DatePicker
            style={{ width: '100%' }}
            format="YYYY-MM-DD"
            placeholder={t('cashbox.selectDate')}
            disabled={isEditing}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CashboxOpeningBalanceModal;
