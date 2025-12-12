import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Form, InputNumber, Input, Button, Space, Table, Select, Popconfirm, Alert } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';

import { repairDefect } from '../../api/defects';
import { fetchProducts } from '../../api/productsApi';
import type { ProductDefectListItem, DefectRepairRequest, RepairMaterial } from '../../types/defects';
import type { Product } from '../../api/productsApi';
import { formatQuantity } from '../../utils/formatters';

interface RepairModalProps {
  visible: boolean;
  defect: ProductDefectListItem;
  onCancel: () => void;
  onSuccess: () => void;
}

const RepairModal = ({ visible, defect, onCancel, onSuccess }: RepairModalProps) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState<RepairMaterial[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (visible) {
      loadProducts();
    }
  }, [visible]);

  const loadProducts = async () => {
    try {
      const response = await fetchProducts({ page_size: 1000 });
      setProducts(response.data.results);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error(t('defects.loadProductsError'));
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const data: DefectRepairRequest = {
        quantity: values.quantity,
        materials: materials.length > 0 ? materials : undefined,
        description: values.description,
      };

      await repairDefect(defect.id, data);
      toast.success(t('defects.repairSuccess'));
      onSuccess();
    } catch (error: any) {
      console.error('Failed to repair defect:', error);
      if (error?.response?.data) {
        const errorMsg = Object.values(error.response.data).flat().join(', ');
        toast.error(errorMsg);
      } else {
        toast.error(t('defects.repairError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterial = () => {
    setMaterials([...materials, { product_id: 0, qty: 0 }]);
  };

  const handleRemoveMaterial = (index: number) => {
    const newMaterials = [...materials];
    newMaterials.splice(index, 1);
    setMaterials(newMaterials);
  };

  const handleMaterialChange = (index: number, field: 'product_id' | 'qty', value: any) => {
    const newMaterials = [...materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };

    // If product_id changed, add product details
    if (field === 'product_id') {
      const selectedProduct = products.find(p => p.id === value);
      if (selectedProduct) {
        newMaterials[index].product_name = selectedProduct.name;
        newMaterials[index].product_sku = selectedProduct.sku;
      }
    }

    setMaterials(newMaterials);
  };

  const materialColumns = [
    {
      title: t('defects.material'),
      dataIndex: 'product_id',
      key: 'product_id',
      render: (productId: number, _: RepairMaterial, index: number) => (
        <Select
          value={productId || undefined}
          onChange={(value) => handleMaterialChange(index, 'product_id', value)}
          style={{ width: '100%' }}
          placeholder={t('defects.selectMaterial')}
          showSearch
          optionFilterProp="children"
          filterOption={(input, option) =>
            (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
          }
        >
          {products.map(product => (
            <Select.Option key={product.id} value={product.id}>
              {product.name} ({product.sku}) - Stock: {formatQuantity(product.stock_ok)}
            </Select.Option>
          ))}
        </Select>
      ),
    },
    {
      title: t('defects.qty'),
      dataIndex: 'qty',
      key: 'qty',
      width: 150,
      render: (qty: number, _: RepairMaterial, index: number) => (
        <InputNumber
          value={qty}
          onChange={(value) => handleMaterialChange(index, 'qty', value || 0)}
          min={0}
          step={0.01}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 80,
      render: (_: any, __: RepairMaterial, index: number) => (
        <Popconfirm
          title={t('common.deleteConfirm')}
          onConfirm={() => handleRemoveMaterial(index)}
          okText={t('common.yes')}
          cancelText={t('common.no')}
        >
          <Button type="link" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Modal
      title={t('defects.repairTitle')}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={700}
      okText={t('defects.repair')}
      cancelText={t('common.cancel')}
    >
      <Alert
        message={t('defects.repairInfo')}
        description={
          <div>
            <div>{t('defects.product')}: <strong>{defect.product_name}</strong></div>
            <div>{t('defects.repairableQty')}: <strong className="text-green-600">{formatQuantity(defect.repairable_qty)}</strong></div>
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
          quantity: defect.repairable_qty,
        }}
      >
        <Form.Item
          name="quantity"
          label={t('defects.repairQty')}
          rules={[
            { required: true, message: t('defects.qtyRequired') },
            { type: 'number', min: 0.01, message: t('defects.qtyMinError') },
            {
              type: 'number',
              max: defect.repairable_qty,
              message: t('defects.repairQtyMaxError', { max: defect.repairable_qty }),
            },
          ]}
        >
          <InputNumber
            min={0}
            max={defect.repairable_qty}
            step={0.01}
            style={{ width: '100%' }}
            placeholder={t('defects.enterRepairQty')}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label={t('defects.repairDescription')}
        >
          <Input.TextArea
            rows={3}
            placeholder={t('defects.enterRepairDescription')}
          />
        </Form.Item>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="font-medium">{t('defects.repairMaterials')}</label>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={handleAddMaterial}
              size="small"
            >
              {t('defects.addMaterial')}
            </Button>
          </div>
          {materials.length > 0 && (
            <Table
              columns={materialColumns}
              dataSource={materials}
              rowKey={(_, index) => index!}
              pagination={false}
              size="small"
            />
          )}
        </div>
      </Form>
    </Modal>
  );
};

export default RepairModal;
