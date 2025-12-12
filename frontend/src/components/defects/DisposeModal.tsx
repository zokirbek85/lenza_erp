import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Form, InputNumber, Input, Alert } from 'antd';
import toast from 'react-hot-toast';

import { disposeDefect } from '../../api/defects';
import type { ProductDefectListItem, DefectDisposeRequest } from '../../types/defects';
import { formatQuantity } from '../../utils/formatters';

interface DisposeModalProps {
  visible: boolean;
  defect: ProductDefectListItem;
  onCancel: () => void;
  onSuccess: () => void;
}

const DisposeModal = ({ visible, defect, onCancel, onSuccess }: DisposeModalProps) => {
  const { t } = useTranslation(['defects', 'common']);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const data: DefectDisposeRequest = {
        quantity: values.quantity,
        description: values.description,
      };

      await disposeDefect(defect.id, data);
      toast.success(t('defects.disposeSuccess'));
      onSuccess();
    } catch (error: any) {
      console.error('Failed to dispose defect:', error);
      if (error?.response?.data) {
        const errorMsg = Object.values(error.response.data).flat().join(', ');
        toast.error(errorMsg);
      } else {
        toast.error(t('defects.disposeError'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={t('defects.disposeTitle')}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
      okText={t('defects.dispose')}
      cancelText={t('common.cancel')}
      okButtonProps={{ danger: true }}
    >
      <Alert
        message={t('defects.disposeWarning')}
        description={
          <div>
            <div>{t('defects.product')}: <strong>{defect.product_name}</strong></div>
            <div>{t('defects.nonRepairableQty')}: <strong className="text-red-600">{formatQuantity(defect.non_repairable_qty)}</strong></div>
          </div>
        }
        type="warning"
        showIcon
        className="mb-4"
      />

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          quantity: defect.non_repairable_qty,
        }}
      >
        <Form.Item
          name="quantity"
          label={t('defects.disposeQty')}
          rules={[
            { required: true, message: t('defects.qtyRequired') },
            { type: 'number', min: 0.01, message: t('defects.qtyMinError') },
            {
              type: 'number',
              max: defect.non_repairable_qty,
              message: t('defects.disposeQtyMaxError', { max: defect.non_repairable_qty }),
            },
          ]}
        >
          <InputNumber
            min={0}
            max={defect.non_repairable_qty}
            step={0.01}
            style={{ width: '100%' }}
            placeholder={t('defects.enterDisposeQty')}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label={t('defects.disposeReason')}
          rules={[{ required: true, message: t('defects.disposeReasonRequired') }]}
        >
          <Input.TextArea
            rows={4}
            placeholder={t('defects.enterDisposeReason')}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default DisposeModal;
