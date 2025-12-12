import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Form, InputNumber, Input, Alert } from 'antd';
import toast from 'react-hot-toast';

import { sellOutletDefect } from '../../api/defects';
import type { ProductDefectListItem, DefectSellOutletRequest } from '../../types/defects';
import { formatQuantity } from '../../utils/formatters';

interface SellOutletModalProps {
  visible: boolean;
  defect: ProductDefectListItem;
  onCancel: () => void;
  onSuccess: () => void;
}

const SellOutletModal = ({ visible, defect, onCancel, onSuccess }: SellOutletModalProps) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const data: DefectSellOutletRequest = {
        quantity: values.quantity,
        sale_price_usd: values.sale_price_usd,
        description: values.description,
      };

      await sellOutletDefect(defect.id, data);
      toast.success(t('defects.sellOutletSuccess'));
      onSuccess();
    } catch (error: any) {
      console.error('Failed to sell outlet defect:', error);
      if (error?.response?.data) {
        const errorMsg = Object.values(error.response.data).flat().join(', ');
        toast.error(errorMsg);
      } else {
        toast.error(t('defects.sellOutletError'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={t('defects.sellOutletTitle')}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
      okText={t('defects.sellOutlet')}
      cancelText={t('common.cancel')}
    >
      <Alert
        message={t('defects.sellOutletInfo')}
        description={
          <div>
            <div>{t('defects.product')}: <strong>{defect.product_name}</strong></div>
            <div>{t('defects.nonRepairableQty')}: <strong className="text-purple-600">{formatQuantity(defect.non_repairable_qty)}</strong></div>
          </div>
        }
        type="info"
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
          label={t('defects.sellQty')}
          rules={[
            { required: true, message: t('defects.qtyRequired') },
            { type: 'number', min: 0.01, message: t('defects.qtyMinError') },
            {
              type: 'number',
              max: defect.non_repairable_qty,
              message: t('defects.sellOutletQtyMaxError', { max: defect.non_repairable_qty }),
            },
          ]}
        >
          <InputNumber
            min={0}
            max={defect.non_repairable_qty}
            step={0.01}
            style={{ width: '100%' }}
            placeholder={t('defects.enterSellQty')}
          />
        </Form.Item>

        <Form.Item
          name="sale_price_usd"
          label={t('defects.salePrice')}
          rules={[
            { required: true, message: t('defects.salePriceRequired') },
            { type: 'number', min: 0.01, message: t('defects.salePriceMinError') },
          ]}
        >
          <InputNumber
            min={0}
            step={0.01}
            style={{ width: '100%' }}
            placeholder={t('defects.enterSalePrice')}
            prefix="$"
          />
        </Form.Item>

        <Form.Item
          name="description"
          label={t('defects.sellDescription')}
        >
          <Input.TextArea
            rows={3}
            placeholder={t('defects.enterSellDescription')}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SellOutletModal;
