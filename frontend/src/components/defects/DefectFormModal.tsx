import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Form, InputNumber, Select, Input, Button, Space, Table, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';

import {
  createProductDefect,
  updateProductDefect,
  getProductDefect,
  getDefectTypes,
} from '../../api/defects';
import { fetchProducts } from '../../api/productsApi';
import type {
  ProductDefectListItem,
  ProductDefectCreate,
  ProductDefectUpdate,
  DefectDetail,
  DefectType,
} from '../../types/defects';
import type { Product } from '../../api/productsApi';

interface DefectFormModalProps {
  visible: boolean;
  defect: ProductDefectListItem | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const DefectFormModal = ({ visible, defect, onCancel, onSuccess }: DefectFormModalProps) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [defectTypes, setDefectTypes] = useState<DefectType[]>([]);
  const [defectDetails, setDefectDetails] = useState<DefectDetail[]>([]);

  const isEdit = !!defect;

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  useEffect(() => {
    if (visible && defect) {
      loadDefectDetails();
    }
  }, [visible, defect]);

  const loadData = async () => {
    try {
      const [productsRes, typesRes] = await Promise.all([
        fetchProducts({ page_size: 1000 }),
        getDefectTypes({ is_active: true, page_size: 1000 }),
      ]);
      setProducts(productsRes.data.items || productsRes.data.results || []);
      setDefectTypes(typesRes.data.results);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error(t('defects.loadDataError'));
    }
  };

  const loadDefectDetails = async () => {
    if (!defect) return;

    try {
      const response = await getProductDefect(defect.id);
      const defectData = response.data;

      form.setFieldsValue({
        product: defectData.product,
        qty: defectData.qty,
        repairable_qty: defectData.repairable_qty,
        non_repairable_qty: defectData.non_repairable_qty,
        description: defectData.description,
      });

      if (defectData.defect_details_enriched) {
        setDefectDetails(defectData.defect_details_enriched);
      } else if (defectData.defect_details) {
        setDefectDetails(defectData.defect_details);
      }
    } catch (error) {
      console.error('Failed to load defect details:', error);
      toast.error(t('defects.loadError'));
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // Validate quantities
      const totalQty = values.repairable_qty + values.non_repairable_qty;
      if (Math.abs(totalQty - values.qty) > 0.01) {
        toast.error(t('defects.qtyValidationError'));
        setLoading(false);
        return;
      }

      const data: ProductDefectCreate | ProductDefectUpdate = {
        product: values.product,
        qty: values.qty,
        repairable_qty: values.repairable_qty,
        non_repairable_qty: values.non_repairable_qty,
        description: values.description,
        defect_details: defectDetails.length > 0 ? defectDetails : undefined,
      };

      if (isEdit) {
        await updateProductDefect(defect.id, data);
        toast.success(t('defects.updateSuccess'));
      } else {
        await createProductDefect(data as ProductDefectCreate);
        toast.success(t('defects.createSuccess'));
      }

      onSuccess();
    } catch (error: any) {
      console.error('Failed to save defect:', error);
      if (error?.response?.data) {
        const errorMsg = Object.values(error.response.data).flat().join(', ');
        toast.error(errorMsg);
      } else {
        toast.error(isEdit ? t('defects.updateError') : t('defects.createError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddDefectDetail = () => {
    setDefectDetails([...defectDetails, { type_id: 0, qty: 0 }]);
  };

  const handleRemoveDefectDetail = (index: number) => {
    const newDetails = [...defectDetails];
    newDetails.splice(index, 1);
    setDefectDetails(newDetails);
  };

  const handleDefectDetailChange = (index: number, field: 'type_id' | 'qty', value: any) => {
    const newDetails = [...defectDetails];
    newDetails[index] = { ...newDetails[index], [field]: value };

    // If type_id changed, add type_name
    if (field === 'type_id') {
      const selectedType = defectTypes.find(t => t.id === value);
      if (selectedType) {
        newDetails[index].type_name = selectedType.name;
      }
    }

    setDefectDetails(newDetails);
  };

  const defectDetailsColumns = [
    {
      title: t('defects.defectType'),
      dataIndex: 'type_id',
      key: 'type_id',
      render: (typeId: number, _: DefectDetail, index: number) => (
        <Select
          value={typeId || undefined}
          onChange={(value) => handleDefectDetailChange(index, 'type_id', value)}
          style={{ width: '100%' }}
          placeholder={t('defects.selectDefectType')}
        >
          {defectTypes.map(type => (
            <Select.Option key={type.id} value={type.id}>
              {type.name}
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
      render: (qty: number, _: DefectDetail, index: number) => (
        <InputNumber
          value={qty}
          onChange={(value) => handleDefectDetailChange(index, 'qty', value || 0)}
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
      render: (_: any, __: DefectDetail, index: number) => (
        <Popconfirm
          title={t('common.deleteConfirm')}
          onConfirm={() => handleRemoveDefectDetail(index)}
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
      title={isEdit ? t('defects.editTitle') : t('defects.createTitle')}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={800}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          qty: 0,
          repairable_qty: 0,
          non_repairable_qty: 0,
        }}
      >
        <Form.Item
          name="product"
          label={t('defects.product')}
          rules={[{ required: true, message: t('defects.productRequired') }]}
        >
          <Select
            showSearch
            placeholder={t('defects.selectProduct')}
            optionFilterProp="children"
            filterOption={(input, option) => {
              const label = option?.children;
              if (typeof label === 'string') {
                return label.toLowerCase().includes(input.toLowerCase());
              }
              return false;
            }}
            disabled={isEdit}
          >
            {products.map(product => (
              <Select.Option key={product.id} value={product.id}>
                {product.name} ({product.sku})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Space style={{ width: '100%' }} size="middle">
          <Form.Item
            name="qty"
            label={t('defects.totalQty')}
            rules={[
              { required: true, message: t('defects.qtyRequired') },
              { type: 'number', min: 0.01, message: t('defects.qtyMinError') },
            ]}
          >
            <InputNumber
              min={0}
              step={0.01}
              style={{ width: 200 }}
              placeholder={t('defects.enterQty')}
            />
          </Form.Item>

          <Form.Item
            name="repairable_qty"
            label={t('defects.repairableQty')}
            rules={[
              { required: true, message: t('defects.repairableQtyRequired') },
              { type: 'number', min: 0, message: t('defects.qtyMinError') },
            ]}
          >
            <InputNumber
              min={0}
              step={0.01}
              style={{ width: 200 }}
              placeholder={t('defects.enterRepairableQty')}
            />
          </Form.Item>

          <Form.Item
            name="non_repairable_qty"
            label={t('defects.nonRepairableQty')}
            rules={[
              { required: true, message: t('defects.nonRepairableQtyRequired') },
              { type: 'number', min: 0, message: t('defects.qtyMinError') },
            ]}
          >
            <InputNumber
              min={0}
              step={0.01}
              style={{ width: 200 }}
              placeholder={t('defects.enterNonRepairableQty')}
            />
          </Form.Item>
        </Space>

        <Form.Item
          name="description"
          label={t('defects.description')}
        >
          <Input.TextArea
            rows={3}
            placeholder={t('defects.enterDescription')}
          />
        </Form.Item>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="font-medium">{t('defects.defectDetails')}</label>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={handleAddDefectDetail}
              size="small"
            >
              {t('defects.addDefectDetail')}
            </Button>
          </div>
          {defectDetails.length > 0 && (
            <Table
              columns={defectDetailsColumns}
              dataSource={defectDetails}
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

export default DefectFormModal;
