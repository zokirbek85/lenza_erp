import { useEffect, useMemo, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import type { BrandOption, CategoryOption } from '../../../api/catalogApi';
import { fetchProductsByCategory, type Product } from '../../../api/productsApi';
import { createReturn, type ReturnPayload } from '../../../api/returnsApi';
import { fetchAllDealers, type DealerDto } from '../../../services/dealers';

type StatusType = 'healthy' | 'defect';

type CartItem = {
  key: number;
  product_id: number;
  product_name: string;
  brand_id?: number;
  brand_name?: string;
  category_id?: number;
  category_name?: string;
  quantity: number;
  status: StatusType;
  comment?: string;
};

type CreateReturnFormProps = {
  onCreated: (payload: ReturnPayload) => void | Promise<void>;
  onCancel: () => void;
  initialData?: {
    id: number;
    dealer: number;
    dealer_name: string;
    items: Array<{
      id: number;
      product_id: number;
      product_name: string;
      brand_name?: string;
      category_name?: string;
      quantity: number;
      status: StatusType;
      comment?: string;
    }>;
    general_comment?: string;
  };
  isEdit?: boolean;
};

const statusOptions: StatusType[] = ['healthy', 'defect'];

const CreateReturnForm = ({ onCreated, onCancel, initialData, isEdit = false }: CreateReturnFormProps) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [dealers, setDealers] = useState<DealerDto[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dealerProducts, setDealerProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loadingDealers, setLoadingDealers] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);

  const dealerId = Form.useWatch('dealer', form);
  const brandId = Form.useWatch('brand_id', form);
  const categoryId = Form.useWatch('category_id', form);

  // Initialize form with existing data (edit mode)
  useEffect(() => {
    if (initialData) {
      form.setFieldsValue({
        dealer: initialData.dealer,
        general_comment: initialData.general_comment || '',
      });
      
      // Convert initial items to cart format
      const cartItems: CartItem[] = initialData.items.map((item, index) => ({
        key: item.product_id,
        product_id: item.product_id,
        product_name: item.product_name,
        brand_name: item.brand_name,
        category_name: item.category_name,
        quantity: item.quantity,
        status: item.status,
        comment: item.comment || '',
      }));
      setCart(cartItems);
    }
  }, [initialData, form]);

  useEffect(() => {
    const loadDealers = async () => {
      setLoadingDealers(true);
      try {
        const list = await fetchAllDealers<DealerDto>();
        setDealers(list);
      } catch (error) {
        console.error(error);
        message.error(t('common:messages.error'));
      } finally {
        setLoadingDealers(false);
      }
    };
    loadDealers();
  }, [t]);

  useEffect(() => {
    if (!dealerId) {
      setBrands([]);
      setCategories([]);
      setProducts([]);
      return;
    }

    // Load dealer products and derive brand/category options
    const loadDealerProducts = async () => {
      setLoadingBrands(true);
      setLoadingCategories(true);
      setLoadingProducts(true);
      try {
        const dealerProducts = await fetchProductsByCategory({ dealerId });
      setDealerProducts(dealerProducts);
      setProducts(dealerProducts);
        const uniqBrands: Record<number, BrandOption> = {};
        const uniqCategories: Record<number, CategoryOption> = {};
        dealerProducts.forEach((p) => {
          if (p.brand?.id) uniqBrands[p.brand.id] = { id: p.brand.id, name: p.brand.name || '' };
          if (p.category?.id) uniqCategories[p.category.id] = { id: p.category.id, name: p.category.name || '' };
        });
        setBrands(Object.values(uniqBrands));
        setCategories(Object.values(uniqCategories));
      } catch (error) {
        console.error(error);
        message.error(t('common:messages.error'));
      } finally {
        setLoadingBrands(false);
        setLoadingCategories(false);
        setLoadingProducts(false);
      }
    };

    loadDealerProducts();
  }, [dealerId, t]);

  useEffect(() => {
    if (!brandId) {
      // Reset to all categories from dealer when brand is cleared
      const allCategories = dealerProducts
        .map((p) => p.category)
        .filter(Boolean) as CategoryOption[];
      const unique: Record<number, CategoryOption> = {};
      allCategories.forEach((c) => {
        if (c?.id) unique[c.id] = { id: c.id, name: c.name };
      });
      setCategories(Object.values(unique));
      form.setFieldsValue({ category_id: undefined, product_id: undefined });
      return;
    }
    // Filter categories from dealer products based on selected brand
    setLoadingCategories(true);
    const filtered = dealerProducts
      .filter((p) => p.brand?.id === brandId)
      .map((p) => p.category)
      .filter(Boolean) as CategoryOption[];
    const unique: Record<number, CategoryOption> = {};
    filtered.forEach((c) => {
      if (c?.id) unique[c.id] = { id: c.id, name: c.name };
    });
    setCategories(Object.values(unique));
    form.setFieldsValue({ category_id: undefined, product_id: undefined });
    setLoadingCategories(false);
  }, [brandId, dealerProducts, form]);

  useEffect(() => {
    if (!categoryId) {
      // Reset to all products filtered by brand (if brand selected) or all dealer products
      const filtered = brandId
        ? dealerProducts.filter((p) => p.brand?.id === brandId)
        : dealerProducts;
      setProducts(filtered);
      form.setFieldsValue({ product_id: undefined });
      return;
    }
    setLoadingProducts(true);
    // Filter products by both brand (if selected) and category
    let filtered = dealerProducts.filter((p) => p.category?.id === categoryId);
    if (brandId) {
      filtered = filtered.filter((p) => p.brand?.id === brandId);
    }
    setProducts(filtered);
    form.setFieldsValue({ product_id: undefined });
    setLoadingProducts(false);
  }, [categoryId, brandId, dealerProducts, form]);

  const resetItemFields = () => {
    form.setFieldsValue({
      brand_id: undefined,
      category_id: undefined,
      product_id: undefined,
      quantity: undefined,
      status: 'healthy',
      item_comment: '',
    });
  };

  const handleAddItem = async () => {
    try {
      const values = await form.validateFields(['dealer', 'brand_id', 'category_id', 'product_id', 'quantity', 'status']);
      const product = products.find((p) => p.id === values.product_id);
      if (!product) {
        message.error(t('returns.form.productRequired'));
        return;
      }
      const next: CartItem = {
        key: values.product_id,
        product_id: values.product_id,
        product_name: product.name,
        brand_id: product.brand?.id,
        brand_name: product.brand?.name,
        category_id: product.category?.id,
        category_name: product.category?.name,
        quantity: Number(values.quantity),
        status: values.status,
        comment: values.item_comment || '',
      };
      setCart((prev) => {
        const exists = prev.some((item) => item.product_id === next.product_id);
        if (exists) {
          return prev.map((item) => (item.product_id === next.product_id ? next : item));
        }
        return [...prev, next];
      });
      resetItemFields();
    } catch (error) {
      // handled by Form
      console.warn(error);
    }
  };

  const handleRemoveItem = (id: number) => {
    setCart((prev) => prev.filter((item) => item.product_id !== id));
  };

  const handleSave = async () => {
    const currentDealer = form.getFieldValue('dealer');
    if (!currentDealer) {
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
        dealer: currentDealer,
        items: cart.map((item) => ({
          product_id: item.product_id,
          brand_id: item.brand_id,
          category_id: item.category_id,
          quantity: item.quantity,
          status: item.status,
          comment: item.comment || '',
        })),
        general_comment: form.getFieldValue('general_comment') || '',
      };
      
      if (isEdit) {
        // Edit mode - call onCreated with payload for parent to handle update
        await onCreated(payload);
      } else {
        // Create mode - create directly
        await createReturn(payload);
        message.success(t('returns.messages.created'));
        setCart([]);
        form.resetFields();
        onCreated();
      }
    } catch (error) {
      console.error(error);
      message.error(isEdit ? t('returns.messages.updateError') : t('returns.messages.createError'));
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<CartItem> = useMemo(() => [
    { title: t('returns.form.product'), dataIndex: 'product_name' },
    { title: t('returns.form.brand'), dataIndex: 'brand_name', render: (v) => v || '-' },
    { title: t('returns.form.category'), dataIndex: 'category_name', render: (v) => v || '-' },
    { title: t('returns.form.quantity'), dataIndex: 'quantity' },
    {
      title: t('returns.form.status'),
      dataIndex: 'status',
      render: (value: StatusType) => (
        <Tag color={value === 'healthy' ? 'green' : 'red'}>
          {value === 'healthy' ? t('returns.status.healthy') : t('returns.status.defect')}
        </Tag>
      ),
    },
    { title: t('returns.form.comment'), dataIndex: 'comment', render: (v) => v || '-' },
    {
      title: '',
      dataIndex: 'actions',
      width: 80,
      render: (_v, record) => (
        <Button danger type="link" onClick={() => handleRemoveItem(record.product_id)}>
          {t('common:actions.delete')}
        </Button>
      ),
    },
  ], [t]);

  return (
    <Card>
      <Form layout="vertical" form={form}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12} lg={8}>
            <Form.Item
              name="dealer"
              label={t('returns.form.dealer')}
              rules={[{ required: true, message: t('returns.form.dealerRequired') }]}
            >
              <Select
                showSearch
                loading={loadingDealers}
                placeholder={t('returns.form.selectDealer')}
                optionFilterProp="label"
                onChange={() => {
                  // Clear dependent fields when dealer changes
                  form.setFieldsValue({ brand_id: undefined, category_id: undefined, product_id: undefined });
                  setBrands([]);
                  setCategories([]);
                  setProducts([]);
                  setDealerProducts([]);
                }}
                options={dealers.map((dealer) => ({ label: dealer.name, value: dealer.id }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Form.Item
              name="brand_id"
              label={t('returns.form.brand')}
              rules={[{ required: true, message: t('returns.form.brandRequired') }]}
            >
              <Select
                showSearch
                loading={loadingBrands}
                placeholder={t('returns.form.selectBrand')}
                optionFilterProp="label"
                onChange={() => {
                  // Clear dependent fields when brand changes
                  form.setFieldsValue({ category_id: undefined, product_id: undefined });
                }}
                options={brands.map((brand) => ({ label: brand.name, value: brand.id }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Form.Item
              name="category_id"
              label={t('returns.form.category')}
              rules={[{ required: true, message: t('returns.form.categoryRequired') }]}
            >
              <Select
                showSearch
                loading={loadingCategories}
                placeholder={t('returns.form.selectCategory')}
                optionFilterProp="label"
                onChange={() => {
                  // Clear product field when category changes
                  form.setFieldsValue({ product_id: undefined });
                }}
                options={categories.map((category) => ({ label: category.name, value: category.id }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={12} lg={8}>
            <Form.Item
              name="product_id"
              label={t('returns.form.product')}
              rules={[{ required: true, message: t('returns.form.productRequired') }]}
            >
              <Select
                showSearch
                loading={loadingProducts}
                placeholder={t('returns.form.selectProduct')}
                optionFilterProp="label"
                options={products.map((product) => ({ label: product.name, value: product.id }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12} lg={6}>
            <Form.Item
              name="quantity"
              label={t('returns.form.quantity')}
              rules={[{ required: true, message: t('returns.form.quantityRequired') }]}
            >
              <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12} lg={6}>
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
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12} lg={4}>
            <Form.Item name="item_comment" label={t('returns.form.comment')}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12} lg={24}>
            <Button icon={<PlusOutlined />} type="dashed" onClick={handleAddItem}>
              {t('returns.form.addItem')}
            </Button>
          </Col>
        </Row>

        <div className="mt-4">
          <Table<CartItem>
            size="small"
            rowKey="key"
            dataSource={cart}
            columns={columns}
            pagination={false}
          />
        </div>

        <Form.Item name="general_comment" label={t('returns.form.generalComment')} className="mt-4">
          <Input.TextArea rows={3} placeholder={t('returns.form.commentPlaceholder')} />
        </Form.Item>

        <Space>
          <Button type="primary" onClick={handleSave} loading={saving} disabled={!cart.length}>
            {t('common:actions.save')}
          </Button>
          <Button onClick={onCancel}>{t('common:actions.cancel')}</Button>
        </Space>
      </Form>
    </Card>
  );
};

export default CreateReturnForm;
