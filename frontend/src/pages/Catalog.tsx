/**
 * Catalog Page - Door Panel Product Catalog
 * 
 * This page displays door panel products grouped by their base name.
 * Products with the same model but different widths (400mm, 600mm, 700mm, 800mm, 900mm)
 * are grouped together and displayed as a single card with stock breakdown by width.
 * 
 * Implementation Notes:
 * - Grouping happens ONLY in this component (frontend-only)
 * - Backend API and Product model remain unchanged
 * - Products admin page (/products/) is not affected
 * - Search supports both base names and full product names with transliteration
 * 
 * Example:
 *   Input products: "Венеция Ясень белый ПГ, 600мм", "Венеция Ясень белый ПГ, 800мм"
 *   Output: Single card "Венеция Ясень белый ПГ" with stock for both 600mm and 800mm
 */

import { Card, Col, Input, Row, Select, Spin, Typography, Image, Empty, Button, Space, Segmented, Tooltip, message } from 'antd';
import { AppstoreOutlined, FileExcelOutlined, FilePdfOutlined, LayoutOutlined, PictureOutlined } from '@ant-design/icons';
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchCatalogProducts, type CatalogProduct } from '../api/productsApi';
import { matchesSearch } from '../utils/transliteration';
import http from '../app/http';
import {
  type GroupedProduct,
  groupProducts,
  widthLabels
} from '../utils/catalogGrouper';
import './Catalog.css';

const { Title, Text } = Typography;
const { Option } = Select;

// View modes
type ViewMode = 'cards' | 'gallery-comfort' | 'gallery-compact' | 'gallery-ultra';

const Catalog = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const data = await fetchCatalogProducts();
      setProducts(data);
    } catch (error) {
      console.error('Failed to load catalog:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (selectedBrand !== 'all') params.append('brand', selectedBrand);
      if (searchText) params.append('search', searchText);
      
      // Map view mode to PDF format
      const pdfView = viewMode === 'cards' ? 'cards' : 'gallery';
      params.append('view', pdfView);

      const response = await http.get(`/catalog/export/pdf/?${params.toString()}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const brandSlug = selectedBrand !== 'all' ? selectedBrand.replace(/\s+/g, '_') : 'all';
      link.download = `catalog_${brandSlug}_${today}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success(t('catalog.exportSuccess'));
    } catch (error) {
      console.error('PDF export failed:', error);
      message.error(t('catalog.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (selectedBrand !== 'all') params.append('brand', selectedBrand);
      if (searchText) params.append('search', searchText);

      const response = await http.get(`/catalog/export/excel/?${params.toString()}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const brandSlug = selectedBrand !== 'all' ? selectedBrand.replace(/\s+/g, '_') : 'all';
      link.download = `catalog_${brandSlug}_${today}.xlsx`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success(t('catalog.exportSuccess'));
    } catch (error) {
      console.error('Excel export failed:', error);
      message.error(t('catalog.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  // Group products by base name
  const groupedProducts = useMemo(() => {
    return groupProducts(products);
  }, [products]);

  // Extract unique brands from grouped products
  const brands = useMemo(() => {
    const brandSet = new Set<string>();
    groupedProducts.forEach((g) => {
      if (g.brand_name) brandSet.add(g.brand_name);
    });
    return Array.from(brandSet).sort();
  }, [groupedProducts]);

  // Filter grouped products by brand and search (with transliteration)
  const filteredProducts = useMemo(() => {
    let result = groupedProducts;

    // Brand filter
    if (selectedBrand !== 'all') {
      result = result.filter((g) => g.brand_name === selectedBrand);
    }

    // Search filter (with transliteration support)
    // Search should match either the base name OR any of the original product names
    if (searchText.trim()) {
      result = result.filter((g) => {
        // Check base name
        if (matchesSearch(g.baseName, searchText)) {
          return true;
        }
        // Check any original product name in the group
        return g.originalProducts.some((p) => matchesSearch(p.name, searchText));
      });
    }

    return result;
  }, [groupedProducts, selectedBrand, searchText]);

  const getGridColumns = () => {
    switch (viewMode) {
      case 'cards':
        return { xs: 24, sm: 12, md: 8, lg: 6 };
      case 'gallery-comfort':
        return { xs: 24, sm: 12, md: 8, lg: 6 };
      case 'gallery-compact':
        return { xs: 12, sm: 8, md: 6, lg: 4 };
      case 'gallery-ultra':
        return { xs: 12, sm: 6, md: 4, lg: 3 };
      default:
        return { xs: 24, sm: 12, md: 8, lg: 6 };
    }
  };

  const renderProduct = (group: GroupedProduct) => {
    if (viewMode === 'cards') {
      // Original card view
      return (
        <Col key={group.id} {...getGridColumns()}>
          <Card
            hoverable
            cover={
              group.image ? (
                <div className="catalog-card-image">
                  <Image
                    src={group.image}
                    alt={group.baseName}
                    preview={true}
                    style={{ objectFit: 'cover' }}
                  />
                </div>
              ) : (
                <div className="catalog-card-image catalog-card-no-image">
                  <AppstoreOutlined style={{ fontSize: 48, color: '#ccc' }} />
                </div>
              )
            }
            className="catalog-card"
          >
            <Card.Meta
              title={<Text strong>{group.baseName}</Text>}
              description={
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {group.brand_name}
                  </Text>
                  <div style={{ marginTop: 8 }}>
                    <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                      ${group.price_usd}
                    </Text>
                  </div>
                  <div className="catalog-stock" style={{ marginTop: 12 }}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                      {t('catalog.stockByWidth')}:
                    </Text>
                    <div className="catalog-stock-grid">
                      {widthLabels.map((width) => {
                        const stock = group.stock[width];
                        return (
                          <div key={width} className="catalog-stock-item">
                            <Text style={{ fontSize: 11, color: '#888' }}>{width}mm:</Text>
                            <Text
                              strong
                              style={{
                                fontSize: 13,
                                color: stock > 0 ? '#52c41a' : '#ff4d4f',
                              }}
                            >
                              {stock > 0 ? `${stock} ${t('catalog.inStock')}` : t('catalog.notAvailable')}
                            </Text>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              }
            />
          </Card>
        </Col>
      );
    }

    // Gallery views
    const isUltra = viewMode === 'gallery-ultra';
    const isCompact = viewMode === 'gallery-compact';

    const stockText = widthLabels
      .filter((w) => group.stock[w] > 0)
      .map((w) => `${w}: ${group.stock[w]}`)
      .join(', ') || t('catalog.notAvailable');

    const content = (
      <Card
        hoverable
        cover={
          group.image ? (
            <div className={`catalog-gallery-image ${viewMode}`}>
              <Image
                src={group.image}
                alt={group.baseName}
                preview={!isUltra}
                style={{ objectFit: 'cover' }}
              />
            </div>
          ) : (
            <div className={`catalog-gallery-image catalog-card-no-image ${viewMode}`}>
              <PictureOutlined style={{ fontSize: isUltra ? 32 : 48, color: '#ccc' }} />
            </div>
          )
        }
        className={`catalog-gallery-card ${viewMode}`}
        bodyStyle={{ padding: isUltra ? 8 : isCompact ? 10 : 12 }}
      >
        <div className="catalog-gallery-content">
          <Text
            strong
            ellipsis
            style={{ 
              fontSize: isUltra ? 10 : isCompact ? 11 : 12, 
              display: '-webkit-box',
              WebkitLineClamp: isUltra ? 1 : 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              marginBottom: 4 
            }}
          >
            {group.baseName}
          </Text>
          {!isUltra && (
            <>
              <Text type="secondary" style={{ fontSize: isCompact ? 9 : 10, display: 'block' }}>
                {group.brand_name}
              </Text>
              <Text strong style={{ fontSize: isCompact ? 13 : 14, color: '#1890ff', display: 'block', marginTop: 4 }}>
                ${group.price_usd}
              </Text>
              {!isCompact && (
                <Text type="secondary" style={{ fontSize: 9, display: 'block', marginTop: 4 }}>
                  {stockText}
                </Text>
              )}
            </>
          )}
        </div>
      </Card>
    );

    if (isUltra) {
      return (
        <Col key={group.id} {...getGridColumns()}>
          <Tooltip
            title={
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{group.baseName}</div>
                <div>{group.brand_name}</div>
                <div style={{ marginTop: 4 }}>${group.price_usd}</div>
                <div style={{ marginTop: 4, fontSize: 11 }}>{stockText}</div>
              </div>
            }
          >
            {content}
          </Tooltip>
        </Col>
      );
    }

    return (
      <Col key={group.id} {...getGridColumns()}>
        {content}
      </Col>
    );
  };

  return (
    <div className="catalog-page">
      <div className="catalog-header">
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              <AppstoreOutlined /> {t('catalog.title')}
            </Title>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<FilePdfOutlined />}
                onClick={handleExportPDF}
                loading={exporting}
                type="default"
              >
                {t('catalog.exportPdf')}
              </Button>
              <Button
                icon={<FileExcelOutlined />}
                onClick={handleExportExcel}
                loading={exporting}
                type="default"
              >
                {t('catalog.exportExcel')}
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <div className="catalog-filters">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Select
              value={selectedBrand}
              onChange={setSelectedBrand}
              style={{ width: '100%' }}
              placeholder={t('catalog.selectBrand')}
            >
              <Option value="all">{t('catalog.allBrands')}</Option>
              {brands.map((brand) => (
                <Option key={brand} value={brand}>
                  {brand}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={10}>
            <Input.Search
              placeholder={t('catalog.searchPlaceholder')}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size="large"
            />
          </Col>
          <Col xs={24} md={8}>
            <Segmented
              value={viewMode}
              onChange={(value) => setViewMode(value as ViewMode)}
              options={[
                { label: t('catalog.viewCards'), value: 'cards', icon: <LayoutOutlined /> },
                { label: t('catalog.viewComfort'), value: 'gallery-comfort', icon: <PictureOutlined /> },
                { label: t('catalog.viewCompact'), value: 'gallery-compact', icon: <AppstoreOutlined /> },
                { label: t('catalog.viewUltra'), value: 'gallery-ultra', icon: <AppstoreOutlined /> },
              ]}
              block
            />
          </Col>
        </Row>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <Empty description={t('catalog.noProducts')} style={{ marginTop: 60 }} />
      ) : (
        <Row gutter={[16, 16]} className="catalog-grid" style={{ marginTop: 24 }}>
          {filteredProducts.map((group) => renderProduct(group))}
        </Row>
      )}
    </div>
  );
};

export default Catalog;
