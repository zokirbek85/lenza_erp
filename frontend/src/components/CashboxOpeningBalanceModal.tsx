import { useEffect, useState } from 'react';
import { Modal, Form, InputNumber, Select, DatePicker, message } from 'antd';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import type { CashboxOpeningBalance, Cashbox } from '../services/cashboxApi';
import { createOpeningBalance, updateOpeningBalance, fetchCashboxes } from '../services/cashboxApi';

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
  const [cashboxes, setCashboxes] = useState<Cashbox[]>([]);
  const [loading, setLoading] = useState(false);

  const isEditing = !!editingBalance;

  useEffect(() => {
    if (open) {
      loadCashboxes();
    }
  }, [open]);

  useEffect(() => {
    if (open && editingBalance) {
      form.setFieldsValue({
        cashbox: editingBalance.cashbox,
        amount: editingBalance.amount || editingBalance.balance,
        date: dayjs(editingBalance.date),
      });
    } else if (open) {
      form.resetFields();
      form.setFieldsValue({
        date: dayjs(),
      });
    }
  }, [open, editingBalance, form]);

  const loadCashboxes = async () => {
    setLoading(true);
    try {
      const data = await fetchCashboxes();
      setCashboxes(data.filter(cb => cb.is_active));
    } catch (error) {
      console.error('Failed to load cashboxes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        cashbox: values.cashbox,
        amount: values.amount,
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
          name="cashbox"
          label={t('cashbox.cashbox')}
          rules={[{ required: true, message: t('cashbox.validation.cashboxRequired') }]}
        >
          <Select
            placeholder={t('cashbox.selectCashbox')}
            disabled={isEditing}
            loading={loading}
            showSearch
            optionFilterProp="label"
            options={cashboxes.map(cb => ({
              value: cb.id,
              label: `${cb.name} (${cb.currency})`,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="amount"
          label={t('cashbox.amount')}
          rules={[
            { required: true, message: t('cashbox.validation.amountRequired') },
            { type: 'number', min: 0, message: t('cashbox.validation.amountPositive') },
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder={t('cashbox.enterAmount')}
            min={0}
            step={0.01}
            precision={2}
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
