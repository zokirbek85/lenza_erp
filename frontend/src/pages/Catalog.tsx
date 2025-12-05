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

import { Card, Col, Input, Row, Select, Spin, Typography, Image, Empty, Button, Space, Segmented, Tooltip, message, Divider } from 'antd';
import { AppstoreOutlined, FileExcelOutlined, FilePdfOutlined, LayoutOutlined, PictureOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchVariantCatalog, type VariantCatalog } from '../api/productsApi';
import { matchesSearch } from '../utils/transliteration';
import http from '../app/http';
import './Catalog.css';

const { Title, Text } = Typography;
const { Option } = Select;

// View modes
type ViewMode = 'cards' | 'gallery-comfort' | 'gallery-compact' | 'gallery-ultra';

const Catalog = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<VariantCatalog[]>([]);
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
      const data = await fetchVariantCatalog();
      setVariants(data);
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
        timeout: 60000, // 60 seconds for PDF generation
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

  // Extract unique brands from variants
  const brands = useMemo(() => {
    const brandSet = new Set<string>();
    variants.forEach((v) => {
      if (v.brand) brandSet.add(v.brand);
    });
    return Array.from(brandSet).sort();
  }, [variants]);

  // Filter variants by brand and search (with transliteration)
  const filteredVariants = useMemo(() => {
    let result = variants;

    // Brand filter
    if (selectedBrand !== 'all') {
      result = result.filter((v) => v.brand === selectedBrand);
    }

    // Search filter (with transliteration support)
    // Search should match model, color, or door type
    if (searchText.trim()) {
      result = result.filter((v) => {
        const fullName = `${v.model} ${v.color} ${v.door_type}`.toLowerCase();
        return matchesSearch(fullName, searchText) ||
               matchesSearch(v.model, searchText) ||
               matchesSearch(v.color, searchText) ||
               matchesSearch(v.brand, searchText);
      });
    }

    return result;
  }, [variants, selectedBrand, searchText]);

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

  // Render variant with three-tier pricing (komplektatsiya)
  const renderVariant = (variant: VariantCatalog) => {
    const hasKit = variant.kit_details && variant.kit_details.length > 0;
    const variantTitle = `${variant.model} ${variant.color} ${variant.door_type}`;
    
    if (viewMode === 'cards') {
      // Card view with detailed pricing
      return (
        <Col key={variant.id} {...getGridColumns()}>
          <Card
            hoverable
            cover={
              variant.image ? (
                <div className="catalog-card-image">
                  <Image
                    src={variant.image}
                    alt={variantTitle}
                    preview={true}
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
              title={<Text strong style={{ fontSize: 14 }}>{variantTitle}</Text>}
              description={
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }} className="catalog-brand-text">
                    {variant.brand}
                  </Text>
                  
                  {/* Three-tier pricing */}
                  <div style={{ marginTop: 10, marginBottom: 10 }}>
                    {hasKit ? (
                      // Show three-tier pricing
                      <div className="catalog-price-breakdown">
                        {/* Polotno price */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>Полотно:</Text>
                          <Text strong style={{ fontSize: 14 }}>${variant.polotno_price_usd?.toFixed(2)}</Text>
                        </div>
                        
                        {/* Kit price */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>+ Комплект:</Text>
                          <Text strong style={{ fontSize: 14, color: '#52c41a' }}>
                            + ${variant.kit_price_usd?.toFixed(2)}
                          </Text>
                        </div>
                        
                        {/* Kit components tooltip */}
                        <Tooltip 
                          placement="topLeft"
                          title={
                            <div style={{ fontSize: 11 }}>
                              {variant.kit_details.map((item) => (
                                <div key={item.id} style={{ marginBottom: 4 }}>
                                  {item.component_name} × {item.quantity}: ${item.total_price_usd.toFixed(2)}
                                </div>
                              ))}
                            </div>
                          }
                        >
                          <Text type="secondary" style={{ fontSize: 10, fontStyle: 'italic', cursor: 'help' }}>
                            ({variant.kit_details.length} компонентов)
                          </Text>
                        </Tooltip>
                        
                        <Divider style={{ margin: '8px 0' }} />
                        
                        {/* Full set price */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text strong style={{ fontSize: 13 }}>= Итого:</Text>
                          <Text strong style={{ fontSize: 18, color: '#1890ff' }} className="catalog-price-text">
                            ${variant.full_set_price_usd?.toFixed(2)}
                          </Text>
                        </div>
                        
                        {/* Stock availability */}
                        {variant.max_full_sets_by_stock !== null && (
                          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircleOutlined style={{ fontSize: 12, color: '#52c41a' }} />
                            <Text type="secondary" style={{ fontSize: 10 }}>
                              Доступно: {variant.max_full_sets_by_stock} комплектов
                            </Text>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Simple polotno-only pricing
                      <div>
                        <Text strong style={{ fontSize: 18 }} className="catalog-price-text">
                          ${variant.polotno_price_usd?.toFixed(2)}
                        </Text>
                      </div>
                    )}
                  </div>
                  
                  {/* Sizes and stock */}
                  <div className="catalog-stock" style={{ marginTop: 12 }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
                      {t('catalog.stockByWidth')}:
                    </Text>
                    <div className="catalog-stock-grid">
                      {variant.sizes.map((sizeItem) => {
                        const inStock = sizeItem.stock > 0;
                        return (
                          <div 
                            key={sizeItem.size} 
                            className="catalog-stock-item"
                            data-in-stock={inStock}
                          >
                            <Text type="secondary" style={{ fontSize: 10 }}>{sizeItem.size}:</Text>
                            <Text
                              strong
                              style={{
                                fontSize: 12,
                                color: inStock ? 'var(--success)' : 'var(--error)',
                              }}
                            >
                              {inStock ? `${sizeItem.stock}` : t('catalog.notAvailable')}
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

    const stockText = variant.sizes
      .filter((s) => s.stock > 0)
      .map((s) => `${s.size}: ${s.stock}`)
      .join(', ') || t('catalog.notAvailable');

    const content = (
      <Card
        hoverable
        cover={
          variant.image ? (
            <div className={`catalog-gallery-image ${viewMode}`}>
              <Image
                src={variant.image}
                alt={variantTitle}
                preview={!isUltra}
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
            {variantTitle}
          </Text>
          {!isUltra && (
            <>
              <Text type="secondary" style={{ fontSize: isCompact ? 9 : 10, display: 'block' }} className="catalog-brand-text">
                {variant.brand}
              </Text>
              
              {/* Gallery pricing */}
              {hasKit ? (
                <div style={{ marginTop: 4 }}>
                  <Text strong style={{ fontSize: isCompact ? 12 : 13, display: 'block', color: '#1890ff' }} className="catalog-price-text">
                    ${variant.full_set_price_usd?.toFixed(2)}
                  </Text>
                  <Text type="secondary" style={{ fontSize: isCompact ? 8 : 9 }}>
                    ({variant.kit_details.length} компонентов)
                  </Text>
                </div>
              ) : (
                <Text strong style={{ fontSize: isCompact ? 13 : 14, display: 'block', marginTop: 4 }} className="catalog-price-text">
                  ${variant.polotno_price_usd?.toFixed(2)}
                </Text>
              )}
              
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
        <Col key={variant.id} {...getGridColumns()}>
          <Tooltip
            title={
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{variantTitle}</div>
                <div>{variant.brand}</div>
                <div style={{ marginTop: 4 }}>
                  ${hasKit ? variant.full_set_price_usd?.toFixed(2) : variant.polotno_price_usd?.toFixed(2)}
                </div>
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
      <Col key={variant.id} {...getGridColumns()}>
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
      ) : filteredVariants.length === 0 ? (
        <Empty description={t('catalog.noProducts')} style={{ marginTop: 60 }} />
      ) : (
        <Row gutter={[16, 16]} className="catalog-grid" style={{ marginTop: 24 }}>
          {filteredVariants.map((variant) => renderVariant(variant))}
        </Row>
      )}
    </div>
  );
};

export default Catalog;
