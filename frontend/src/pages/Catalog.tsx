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

  // Extract unique brands
  const brands = useMemo(() => {
    const brandSet = new Set<string>();
    products.forEach((p) => {
      if (p.brand_name) brandSet.add(p.brand_name);
    });
    return Array.from(brandSet).sort();
  }, [products]);

  // Filter products by brand and search (with transliteration)
  const filteredProducts = useMemo(() => {
    let result = products;

    // Brand filter
    if (selectedBrand !== 'all') {
      result = result.filter((p) => p.brand_name === selectedBrand);
    }

    // Search filter (with transliteration support)
    if (searchText.trim()) {
      result = result.filter((p) => matchesSearch(p.name, searchText));
    }

    return result;
  }, [products, selectedBrand, searchText]);

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
          {filteredProducts.map((product) => (
            <Col key={product.id} xs={24} sm={12} md={8} lg={6}>
              <Card
                hoverable
                cover={
                  product.image ? (
                    <div className="catalog-card-image">
                      <Image
                        src={product.image}
                        alt={product.name}
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
                  title={<Text strong>{product.name}</Text>}
                  description={
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {product.brand_name}
                      </Text>
                      <div style={{ marginTop: 8 }}>
                        <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                          ${product.price_usd}
                        </Text>
                      </div>
                      <div className="catalog-stock" style={{ marginTop: 12 }}>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                          {t('catalog.stockByWidth')}:
                        </Text>
                        <div className="catalog-stock-grid">
                          {widthLabels.map((width) => {
                            const stock = product.stock[width];
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
                                  {stock > 0 ? `${stock}` : t('catalog.notAvailable')}
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
