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

import { Card, Col, Input, Row, Select, Spin, Typography, Image, Empty } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchCatalogProducts, type CatalogProduct } from '../api/productsApi';
import { matchesSearch } from '../utils/transliteration';
import './Catalog.css';

const { Title, Text } = Typography;
const { Option } = Select;

const widthLabels = ['400', '600', '700', '800', '900'] as const;

// Types for grouped products
interface GroupedProduct {
  id: string; // composite ID for the group
  baseName: string; // name without width
  brand_name: string;
  price_usd: string;
  image: string | null;
  stock: {
    '400': number;
    '600': number;
    '700': number;
    '800': number;
    '900': number;
  };
  originalProducts: CatalogProduct[]; // keep reference to original products for search
}

/**
 * Extract base name from product name by removing width suffix
 * Examples:
 *   "Венеция Ясень белый ПГ, 600мм" -> "Венеция Ясень белый ПГ"
 *   "Porta Prima, 800mm" -> "Porta Prima"
 *   "Door Model, 700" -> "Door Model"
 */
const extractBaseName = (productName: string): string => {
  // Regex pattern to match comma + optional spaces + digits (2-4 digits) + optional mm/мм/м
  // This handles: ", 600мм", ", 800mm", ", 700", ",600", ", 900 мм", etc.
  const widthPattern = /,\s*\d{2,4}\s*(мм?|mm?)?$/i;
  
  const baseName = productName.replace(widthPattern, '').trim();
  return baseName || productName; // fallback to original if pattern doesn't match
};

/**
 * Extract width from product name
 * Returns one of: '400', '600', '700', '800', '900', or null
 */
const extractWidth = (productName: string): string | null => {
  const match = productName.match(/,\s*(\d{3,4})\s*(мм?|mm?)?$/i);
  if (match) {
    const width = match[1];
    // Only return if it's one of our standard widths
    if (['400', '600', '700', '800', '900'].includes(width)) {
      return width;
    }
  }
  return null;
};

/**
 * Group products by base name
 */
const groupProducts = (products: CatalogProduct[]): GroupedProduct[] => {
  const groups: Record<string, GroupedProduct> = {};

  products.forEach((product) => {
    const baseName = extractBaseName(product.name);
    const width = extractWidth(product.name);

    if (!groups[baseName]) {
      // Initialize new group
      groups[baseName] = {
        id: `group-${baseName.replace(/\s+/g, '-').toLowerCase()}`,
        baseName,
        brand_name: product.brand_name,
        price_usd: product.price_usd,
        image: product.image,
        stock: {
          '400': 0,
          '600': 0,
          '700': 0,
          '800': 0,
          '900': 0,
        },
        originalProducts: [],
      };
    }

    // Add product to group
    groups[baseName].originalProducts.push(product);

    // Update stock for this width
    if (width && (width in groups[baseName].stock)) {
      groups[baseName].stock[width as keyof typeof groups[string]['stock']] = product.stock[width as keyof typeof product.stock];
    }

    // Prefer image from smallest width or first available
    if (!groups[baseName].image && product.image) {
      groups[baseName].image = product.image;
    } else if (product.image && width === '400') {
      // Prioritize 400mm image if available
      groups[baseName].image = product.image;
    }

    // Use price from smallest width if available
    if (width === '400' || !groups[baseName].price_usd) {
      groups[baseName].price_usd = product.price_usd;
    }
  });

  // Convert to array and sort by base name
  return Object.values(groups).sort((a, b) => a.baseName.localeCompare(b.baseName));
};

const Catalog = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');

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

  return (
    <div className="catalog-page">
      <div className="catalog-header">
        <Title level={2}>
          <AppstoreOutlined /> {t('catalog.title')}
        </Title>
      </div>

      <div className="catalog-filters">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
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
          <Col xs={24} sm={12} md={16}>
            <Input.Search
              placeholder={t('catalog.searchPlaceholder')}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size="large"
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
        <Row gutter={[16, 16]} className="catalog-grid">
          {filteredProducts.map((group) => (
            <Col key={group.id} xs={24} sm={12} md={8} lg={6}>
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
          ))}
        </Row>
      )}
    </div>
  );
};

export default Catalog;
