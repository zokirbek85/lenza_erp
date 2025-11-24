/**
 * Marketing Document Generator
 * 
 * Generates customized marketing documents (catalogs and price lists) for:
 * 1. Dealer Catalogs - With configurable markup and dealer branding
 * 2. Brand Catalogs - Brand-specific product showcases
 * 3. Price Lists - Simple price/stock tables for internal/external use
 * 
 * Features:
 * - Dealer markup calculation
 * - Configurable visibility (hide prices, hide stock)
 * - Brand filtering
 * - PDF and Excel export formats
 * - Multiple view modes for PDFs (cards/gallery)
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Form,
  Select,
  InputNumber,
  Switch,
  Button,
  Space,
  message,
  Row,
  Col,
  Divider,
  Typography,
  Segmented,
} from 'antd';
import { FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import http from '../../app/http';

const { Title, Text } = Typography;
const { Option } = Select;

interface Dealer {
  id: number;
  company_name: string;
}

interface Brand {
  id: number;
  name: string;
}

const DocumentGenerator: React.FC = () => {
  const { t } = useTranslation();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingDealers, setLoadingDealers] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);
  
  // Dealer Catalog State
  const [dealerForm] = Form.useForm();
  const [dealerPdfLoading, setDealerPdfLoading] = useState(false);
  const [dealerExcelLoading, setDealerExcelLoading] = useState(false);
  
  // Brand Catalog State
  const [brandForm] = Form.useForm();
  const [brandPdfLoading, setBrandPdfLoading] = useState(false);
  const [brandExcelLoading, setBrandExcelLoading] = useState(false);
  
  // Price List State
  const [pricelistForm] = Form.useForm();
  const [pricelistPdfLoading, setPricelistPdfLoading] = useState(false);
  const [pricelistExcelLoading, setPricelistExcelLoading] = useState(false);

  // Fetch dealers and brands on mount
  useEffect(() => {
    fetchDealers();
    fetchBrands();
  }, []);

  const fetchDealers = async () => {
    setLoadingDealers(true);
    try {
      const response = await http.get('/dealers/', { params: { page_size: 500 } });
      setDealers(response.data.results || []);
    } catch (error) {
      message.error(t('marketing.fetchDealersFailed'));
    } finally {
      setLoadingDealers(false);
    }
  };

  const fetchBrands = async () => {
    setLoadingBrands(true);
    try {
      const response = await http.get('/brands/', { params: { limit: 'all' } });
      setBrands(response.data.results || []);
    } catch (error) {
      message.error(t('marketing.fetchBrandsFailed'));
    } finally {
      setLoadingBrands(false);
    }
  };

  // ========================================
  // DEALER CATALOG HANDLERS
  // ========================================

  const handleDealerPDF = async () => {
    try {
      await dealerForm.validateFields();
      const values = dealerForm.getFieldsValue();
      
      setDealerPdfLoading(true);
      
      const params = new URLSearchParams({
        dealer_id: values.dealer_id.toString(),
        brand: values.brand || 'all',
        markup: values.markup?.toString() || '0',
        hide_price: values.hide_price ? 'true' : 'false',
        hide_stock: values.hide_stock ? 'true' : 'false',
        view: values.view_mode || 'cards',
      });

      const response = await http.get(`/marketing/dealer-catalog/pdf/?${params.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dealer_catalog_${values.dealer_id}_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      message.success(t('marketing.exportSuccess'));
    } catch (error) {
      message.error(t('marketing.exportFailed'));
    } finally {
      setDealerPdfLoading(false);
    }
  };

  const handleDealerExcel = async () => {
    try {
      await dealerForm.validateFields();
      const values = dealerForm.getFieldsValue();
      
      setDealerExcelLoading(true);
      
      const params = new URLSearchParams({
        dealer_id: values.dealer_id.toString(),
        brand: values.brand || 'all',
        markup: values.markup?.toString() || '0',
        hide_price: values.hide_price ? 'true' : 'false',
        hide_stock: values.hide_stock ? 'true' : 'false',
      });

      const response = await http.get(`/marketing/dealer-catalog/excel/?${params.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dealer_catalog_${values.dealer_id}_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      message.success(t('marketing.exportSuccess'));
    } catch (error) {
      message.error(t('marketing.exportFailed'));
    } finally {
      setDealerExcelLoading(false);
    }
  };

  // ========================================
  // BRAND CATALOG HANDLERS
  // ========================================

  const handleBrandPDF = async () => {
    try {
      await brandForm.validateFields();
      const values = brandForm.getFieldsValue();
      
      setBrandPdfLoading(true);
      
      const params = new URLSearchParams({
        brand: values.brand,
        hide_price: values.hide_price ? 'true' : 'false',
        hide_stock: values.hide_stock ? 'true' : 'false',
        view: values.view_mode || 'cards',
      });

      const response = await http.get(`/marketing/brand-catalog/pdf/?${params.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `brand_catalog_${values.brand}_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      message.success(t('marketing.exportSuccess'));
    } catch (error) {
      message.error(t('marketing.exportFailed'));
    } finally {
      setBrandPdfLoading(false);
    }
  };

  const handleBrandExcel = async () => {
    try {
      await brandForm.validateFields();
      const values = brandForm.getFieldsValue();
      
      setBrandExcelLoading(true);
      
      const params = new URLSearchParams({
        brand: values.brand,
        hide_price: values.hide_price ? 'true' : 'false',
        hide_stock: values.hide_stock ? 'true' : 'false',
      });

      const response = await http.get(`/marketing/brand-catalog/excel/?${params.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `brand_catalog_${values.brand}_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      message.success(t('marketing.exportSuccess'));
    } catch (error) {
      message.error(t('marketing.exportFailed'));
    } finally {
      setBrandExcelLoading(false);
    }
  };

  // ========================================
  // PRICE LIST HANDLERS
  // ========================================

  const handlePricelistPDF = async () => {
    try {
      const values = pricelistForm.getFieldsValue();
      
      setPricelistPdfLoading(true);
      
      const params = new URLSearchParams({
        brand: values.brand || 'all',
        hide_stock: values.hide_stock ? 'true' : 'false',
      });

      const response = await http.get(`/marketing/pricelist/pdf/?${params.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pricelist_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      message.success(t('marketing.exportSuccess'));
    } catch (error) {
      message.error(t('marketing.exportFailed'));
    } finally {
      setPricelistPdfLoading(false);
    }
  };

  const handlePricelistExcel = async () => {
    try {
      const values = pricelistForm.getFieldsValue();
      
      setPricelistExcelLoading(true);
      
      const params = new URLSearchParams({
        brand: values.brand || 'all',
        hide_stock: values.hide_stock ? 'true' : 'false',
      });

      const response = await http.get(`/marketing/pricelist/excel/?${params.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pricelist_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      message.success(t('marketing.exportSuccess'));
    } catch (error) {
      message.error(t('marketing.exportFailed'));
    } finally {
      setPricelistExcelLoading(false);
    }
  };

  // ========================================
  // TAB ITEMS
  // ========================================

  const tabItems = [
    {
      key: 'dealer',
      label: t('marketing.dealerCatalog'),
      children: (
        <Form
          form={dealerForm}
          layout="vertical"
          initialValues={{
            markup: 0,
            hide_price: false,
            hide_stock: false,
            view_mode: 'cards',
            brand: 'all',
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="dealer_id"
                label={t('marketing.selectDealer')}
                rules={[{ required: true, message: t('marketing.dealerRequired') }]}
              >
                <Select
                  showSearch
                  placeholder={t('marketing.selectDealer')}
                  loading={loadingDealers}
                  filterOption={(input, option) =>
                    (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {dealers.map((dealer) => (
                    <Option key={dealer.id} value={dealer.id}>
                      {dealer.company_name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="brand" label={t('marketing.filterByBrand')}>
                <Select
                  showSearch
                  placeholder={t('marketing.allBrands')}
                  loading={loadingBrands}
                  filterOption={(input, option) =>
                    (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                  }
                >
                  <Option value="all">{t('marketing.allBrands')}</Option>
                  {brands.map((brand) => (
                    <Option key={brand.id} value={brand.name}>
                      {brand.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="markup" label={t('marketing.dealerMarkup')} tooltip={t('marketing.markupTooltip')}>
                <InputNumber
                  min={0}
                  max={100}
                  step={1}
                  style={{ width: '100%' }}
                  addonAfter="%"
                  placeholder="0"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="view_mode" label={t('marketing.viewMode')}>
                <Segmented
                  options={[
                    { label: t('catalog.viewCards'), value: 'cards' },
                    { label: t('catalog.viewComfort'), value: 'gallery-comfort' },
                    { label: t('catalog.viewCompact'), value: 'gallery-compact' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="hide_price" label={t('marketing.hidePrices')} valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="hide_stock" label={t('marketing.hideStock')} valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Space>
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              loading={dealerPdfLoading}
              onClick={handleDealerPDF}
            >
              {t('marketing.generatePDF')}
            </Button>
            <Button
              type="default"
              icon={<FileExcelOutlined />}
              loading={dealerExcelLoading}
              onClick={handleDealerExcel}
            >
              {t('marketing.generateExcel')}
            </Button>
          </Space>
        </Form>
      ),
    },
    {
      key: 'brand',
      label: t('marketing.brandCatalog'),
      children: (
        <Form
          form={brandForm}
          layout="vertical"
          initialValues={{
            hide_price: false,
            hide_stock: false,
            view_mode: 'cards',
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="brand"
                label={t('marketing.selectBrand')}
                rules={[{ required: true, message: t('marketing.brandRequired') }]}
              >
                <Select
                  showSearch
                  placeholder={t('marketing.selectBrand')}
                  loading={loadingBrands}
                  filterOption={(input, option) =>
                    (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {brands.map((brand) => (
                    <Option key={brand.id} value={brand.name}>
                      {brand.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="view_mode" label={t('marketing.viewMode')}>
                <Segmented
                  options={[
                    { label: t('catalog.viewCards'), value: 'cards' },
                    { label: t('catalog.viewComfort'), value: 'gallery-comfort' },
                    { label: t('catalog.viewCompact'), value: 'gallery-compact' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="hide_price" label={t('marketing.hidePrices')} valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="hide_stock" label={t('marketing.hideStock')} valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Space>
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              loading={brandPdfLoading}
              onClick={handleBrandPDF}
            >
              {t('marketing.generatePDF')}
            </Button>
            <Button
              type="default"
              icon={<FileExcelOutlined />}
              loading={brandExcelLoading}
              onClick={handleBrandExcel}
            >
              {t('marketing.generateExcel')}
            </Button>
          </Space>
        </Form>
      ),
    },
    {
      key: 'pricelist',
      label: t('marketing.priceList'),
      children: (
        <Form
          form={pricelistForm}
          layout="vertical"
          initialValues={{
            brand: 'all',
            hide_stock: false,
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="brand" label={t('marketing.filterByBrand')}>
                <Select
                  showSearch
                  placeholder={t('marketing.allBrands')}
                  loading={loadingBrands}
                  filterOption={(input, option) =>
                    (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                  }
                >
                  <Option value="all">{t('marketing.allBrands')}</Option>
                  {brands.map((brand) => (
                    <Option key={brand.id} value={brand.name}>
                      {brand.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="hide_stock" label={t('marketing.hideStock')} valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Space>
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              loading={pricelistPdfLoading}
              onClick={handlePricelistPDF}
            >
              {t('marketing.generatePDF')}
            </Button>
            <Button
              type="default"
              icon={<FileExcelOutlined />}
              loading={pricelistExcelLoading}
              onClick={handlePricelistExcel}
            >
              {t('marketing.generateExcel')}
            </Button>
          </Space>
        </Form>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>{t('marketing.documentGenerator')}</Title>
      <Text type="secondary">{t('marketing.documentGeneratorDescription')}</Text>

      <Card style={{ marginTop: '24px' }}>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
};

export default DocumentGenerator;
