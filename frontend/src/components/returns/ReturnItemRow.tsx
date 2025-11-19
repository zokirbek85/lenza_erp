import { Button, Form, InputNumber, Input, Select } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

interface OrderItem {
  id: number;
  product: number;
  product_name: string;
  qty: string;
}

interface ReturnItemRowProps {
  index: number;
  orderItems: OrderItem[];
  selectedProducts: number[];
  onRemove: (index: number) => void;
}

const ReturnItemRow: React.FC<ReturnItemRowProps> = ({ 
  index, 
  orderItems, 
  selectedProducts, 
  onRemove 
}) => {
  const { t } = useTranslation();
  const form = Form.useFormInstance();

  const availableProducts = orderItems.filter(
    item => {
      const currentProductId = form.getFieldValue(['items', index, 'product_id']);
      return !selectedProducts.includes(item.product) || item.product === currentProductId;
    }
  );

  const handleProductChange = (productId: number) => {
    const orderItem = orderItems.find(item => item.product === productId);
    if (orderItem) {
      form.setFieldsValue({
        items: {
          [index]: {
            max_quantity: parseFloat(orderItem.qty),
          }
        }
      });
    }
  };

  const selectedProductId = form.getFieldValue(['items', index, 'product_id']);
  const selectedOrderItem = orderItems.find(item => item.product === selectedProductId);
  const maxQuantity = selectedOrderItem ? parseFloat(selectedOrderItem.qty) : undefined;

  return (
    <div className="grid grid-cols-12 gap-3 items-start p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
      <div className="col-span-4">
        <Form.Item
          name={[index, 'product_id']}
          rules={[{ required: true, message: t('returns.form.productRequired') }]}
          className="mb-0"
        >
          <Select
            showSearch
            placeholder={t('returns.form.selectProduct')}
            onChange={handleProductChange}
            optionFilterProp="label"
            options={availableProducts.map(item => ({
              label: `${item.product_name} (${t('returns.form.available')}: ${item.qty})`,
              value: item.product,
            }))}
          />
        </Form.Item>
      </div>

      <div className="col-span-2">
        <Form.Item
          name={[index, 'quantity']}
          rules={[
            { required: true, message: t('returns.form.quantityRequired') },
            {
              validator: (_, value) => {
                if (!value || value <= 0) {
                  return Promise.reject(new Error(t('returns.form.quantityMustBePositive')));
                }
                if (maxQuantity && value > maxQuantity) {
                  return Promise.reject(
                    new Error(t('returns.form.quantityExceedsMax', { max: maxQuantity }))
                  );
                }
                return Promise.resolve();
              }
            }
          ]}
          className="mb-0"
        >
          <InputNumber
            min={0.01}
            step={0.01}
            style={{ width: '100%' }}
            placeholder={t('returns.form.quantity')}
          />
        </Form.Item>
      </div>

      <div className="col-span-2 text-center pt-1">
        {maxQuantity !== undefined && (
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {t('returns.form.max')}: {maxQuantity}
          </span>
        )}
      </div>

      <div className="col-span-3">
        <Form.Item
          name={[index, 'comment']}
          className="mb-0"
        >
          <Input placeholder={t('returns.form.comment')} />
        </Form.Item>
      </div>

      <div className="col-span-1 flex justify-center pt-1">
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => onRemove(index)}
        />
      </div>
    </div>
  );
};

export default ReturnItemRow;
