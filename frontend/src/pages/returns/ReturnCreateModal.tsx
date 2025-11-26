import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined } from '@ant-design/icons';

import { fetchBrands, fetchCategories, type BrandOption, type CategoryOption } from '../../api/catalogApi';
import { fetchProductsByCategory, type Product } from '../../api/productsApi';
import { createReturn, type ReturnPayload } from '../../api/returnsApi';
import { fetchAllDealers, type DealerDto } from '../../services/dealers';

type DealerOption = DealerDto & {
  debt?: number;
  balance?: number;
};

type CartItem = {
  key: number;
  productId: number;
  productName: string;
  brandName?: string;
  categoryName?: string;
  quantity: number;
  status: 'healthy' | 'defect';
  comment?: string;
};

type ReturnCreateModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

const statusOptions: CartItem['status'][] = ['healthy', 'defect'];

const ReturnCreateModal = ({ open, onClose, onCreated }: ReturnCreateModalProps) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [dealers, setDealers] = useState<DealerOption[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingBasics, setLoadingBasics] = useState(false);
  const [dealerId, setDealerId] = useState<number | null>(null);
  const [brandId, setBrandId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const loadBasics = async () => {
      setLoadingBasics(true);
      try {
        const [dealerList, brandList] = await Promise.all([
          fetchAllDealers<DealerOption>(),
          fetchBrands(),
        ]);
        setDealers(dealerList);
        setBrands(brandList);
      } catch (error) {
        console.error(error);
        message.error(t('common:messages.error'));
      } finally {
        setLoadingBasics(false);
      }
    };
    loadBasics();
  }, [open, t]);

  useEffect(() => {
    if (!brandId) {
      setCategories([]);
      setCategoryId(null);
      return;
    }
    fetchCategories(brandId)
      .then((res) => setCategories(res))
      .catch((error) => {
        console.error(error);
        message.error(t('common:messages.error'));
      });
  }, [brandId, t]);

  useEffect(() => {
    if (!categoryId) {
      setProducts([]);
      return;
    }
    setLoading(true);
    fetchProductsByCategory(categoryId)
      .then((res) => setProducts(res))
      .catch((error) => {
        console.error(error);
        message.error(t('common:messages.error'));
      })
      .finally(() => setLoading(false));
  }, [categoryId, t]);

  const resetItemForm = () => {
    form.setFieldsValue({
      brand_id: undefined,
      category_id: undefined,
      product_id: undefined,
      quantity: undefined,
      status: 'healthy',
      item_comment: '',
    });
    setBrandId(null);
    setCategoryId(null);
    setProducts([]);
  };

  const handleAddToCart = () => {
    form
      .validateFields(['brand_id', 'category_id', 'product_id', 'quantity', 'status'])
      .then((values) => {
        const product = products.find((p) => p.id === values.product_id);
        if (!product) {
          message.error(t('returns.form.productRequired'));
          return;
        }
        const next: CartItem = {
          key: values.product_id,
          productId: values.product_id,
          productName: product.name,
          brandName: product.brand?.name,
          categoryName: product.category?.name,
          quantity: Number(values.quantity),
          status: values.status,
          comment: values.item_comment || '',
        };
        setCart((prev) => {
          const exists = prev.some((item) => item.productId === next.productId);
          if (exists) {
            return prev.map((item) => (item.productId === next.productId ? next : item));
          }
          return [...prev, next];
        });
        resetItemForm();
      })
      .catch(() => null);
  };

  const handleRemoveFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleSave = async () => {
    const selectedDealerId = dealerId ?? form.getFieldValue('dealer');
    if (!selectedDealerId) {
      message.error(t('returns.form.dealerRequired'));
      return;
    }
    if (!cart.length) {
      message.error(t('returns.form.itemsRequired'));
      return;
    }
    try {
      setSaving(true);
      const payload: ReturnPayload = {
        dealer: selectedDealerId,
        items: cart.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
          status: item.status,
          comment: item.comment || '',
        })),
        general_comment: form.getFieldValue('general_comment') || '',
      };
      await createReturn(payload);
      message.success(t('returns.messages.created'));
      setCart([]);
      form.resetFields();
      setDealerId(null);
      setBrandId(null);
      setCategoryId(null);
      setProducts([]);
      onCreated();
      onClose();
    } catch (error) {
      console.error(error);
      message.error(t('returns.messages.createError'));
    } finally {
      setSaving(false);
    }
  };

  const dealerDebt = useMemo(() => {
    const dealer = dealers.find((d) => d.id === dealerId);
    return dealer?.debt ?? dealer?.balance ?? null;
  }, [dealerId, dealers]);

  const columns: ColumnsType<CartItem> = [
    { title: t('returns.form.product'), dataIndex: 'productName' },
    { title: t('returns.form.brand'), dataIndex: 'brandName', render: (v) => v || '-' },
    { title: t('returns.form.category'), dataIndex: 'categoryName', render: (v) => v || '-' },
    { title: t('returns.form.quantity'), dataIndex: 'quantity' },
    {
      title: t('returns.form.status'),
      dataIndex: 'status',
      render: (value) => (
        <Tag color={value === 'healthy' ? 'green' : 'red'}>
          {value === 'healthy' ? t('returns.status.healthy') : t('returns.status.defect')}
        </Tag>
      ),
    },
    { title: t('returns.form.comment'), dataIndex: 'comment', render: (v) => v || '-' },
    {
      title: '',
      dataIndex: 'actions',
      render: (_v, record) => (
        <Button danger type="link" onClick={() => handleRemoveFromCart(record.productId)}>
          {t('common:actions.delete')}
        </Button>
      ),
    },
  ];

  return (
    <Modal
      title={t('returns.createTitle')}
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      okText={t('common:actions.save')}
      cancelText={t('common:actions.cancel')}
      confirmLoading={saving}
      width={960}
    >
      <Form layout="vertical" form={form}>
        <Form.Item
          name="dealer"
          label={t('returns.form.dealer')}
          rules={[{ required: true, message: t('returns.form.dealerRequired') }]}
        >
          <Select
            value={dealerId ?? undefined}
            showSearch
            loading={loadingBasics}
            allowClear
            placeholder={t('returns.form.selectDealer')}
            optionFilterProp="label"
            onChange={(value) => {
              setDealerId(value);
              form.setFieldsValue({ dealer: value });
            }}
            options={dealers.map((dealer) => ({
              label: dealer.name,
              value: dealer.id,
              description: dealer.debt ?? dealer.balance,
            }))}
          />
        </Form.Item>
        {dealerDebt !== null && (
          <div className="mb-4 text-sm text-slate-600">
            {t('returns.form.currentDebt')}: {dealerDebt}
          </div>
        )}

        <Space size="large" align="start" className="flex flex-wrap">
          <Form.Item
            name="brand_id"
            label={t('returns.form.brand')}
            rules={[{ required: true, message: t('returns.form.brandRequired') }]}
          >
            <Select
              placeholder={t('returns.form.selectBrand')}
              options={brands.map((brand) => ({ label: brand.name, value: brand.id }))}
              onChange={(value) => {
                setBrandId(value);
                setCategoryId(null);
                form.setFieldsValue({ category_id: undefined, product_id: undefined });
              }}
            />
          </Form.Item>

          <Form.Item
            name="category_id"
            label={t('returns.form.category')}
            rules={[{ required: true, message: t('returns.form.categoryRequired') }]}
          >
            <Select
              placeholder={t('returns.form.selectCategory')}
              options={categories.map((category) => ({ label: category.name, value: category.id }))}
              onChange={(value) => {
                setCategoryId(value);
                form.setFieldsValue({ product_id: undefined });
              }}
              disabled={!brandId}
            />
          </Form.Item>

          <Form.Item
            name="product_id"
            label={t('returns.form.product')}
            rules={[{ required: true, message: t('returns.form.productRequired') }]}
          >
            <Select
              placeholder={t('returns.form.selectProduct')}
              loading={loading}
              options={products.map((product) => ({
                label: product.name,
                value: product.id,
              }))}
              disabled={!categoryId}
            />
          </Form.Item>

          <Form.Item
            name="quantity"
            label={t('returns.form.quantity')}
            rules={[{ required: true, message: t('returns.form.quantityRequired') }]}
          >
            <InputNumber min={0.01} step={0.01} style={{ width: '140px' }} />
          </Form.Item>

          <Form.Item
            name="status"
            label={t('returns.form.status')}
            initialValue="healthy"
            rules={[{ required: true, message: t('returns.form.statusRequired') }]}
          >
            <Select
              options={statusOptions.map((status) => ({
                label: status === 'healthy' ? t('returns.status.healthy') : t('returns.status.defect'),
                value: status,
              }))}
              style={{ width: '140px' }}
            />
          </Form.Item>

          <Form.Item name="item_comment" label={t('returns.form.comment')}>
            <Input style={{ width: 220 }} />
          </Form.Item>

          <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddToCart} className="self-end">
            {t('returns.form.addItem')}
          </Button>
        </Space>

        <div className="mt-4">
          <Table<CartItem>
            rowKey="key"
            dataSource={cart}
            columns={columns}
            pagination={false}
            size="small"
            locale={{ emptyText: t('common:messages.noData') }}
          />
        </div>

        <Form.Item name="general_comment" label={t('returns.form.generalComment')} className="mt-4">
          <Input.TextArea rows={3} placeholder={t('returns.form.commentPlaceholder')} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ReturnCreateModal;
