import { useEffect, useState } from 'react';
import { Table, Input, Select, Typography, Card, message, Button, InputNumber, Modal, Row, Col, Tag } from 'antd';
import { SearchOutlined, ShoppingCartOutlined, AppstoreOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import axios from 'axios';
import { addToCart } from '../../api/dealer-cart';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

interface Product {
  id: number;
  name: string;
  sku: string;
  category_name: string;
  brand_name: string;
  stock_ok: number;
  unit: string;
  price_usd: number;
}

interface Category {
  id: number;
  name: string;
}

interface Brand {
  id: number;
  name: string;
}

export default function DealerProducts() {
  const navigate = useNavigate();
  const [allProducts, setAllProducts] = useState<Product[]>([]); // Store all products
  const [data, setData] = useState<Product[]>([]); // Displayed products
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    category: undefined as string | undefined,
    brand: undefined as string | undefined,
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // Cart modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    loadAllProducts();
  }, []);

  useEffect(() => {
    filterAndPaginateProducts();
  }, [pagination.current, filters, allProducts]);

  const loadAllProducts = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/dealer-portal/products/', {
        withCredentials: true,
      });
      const products = Array.isArray(response.data) ? response.data : (response.data.results || []);
      setAllProducts(products);

      // Extract unique categories
      const uniqueCategories = Array.from(
        new Map(
          products
            .filter((p: Product) => p.category_name)
            .map((p: Product) => [p.category_name, { id: p.id, name: p.category_name }])
        ).values()
      ) as Category[];
      setCategories(uniqueCategories);

      // Extract unique brands
      const uniqueBrands = Array.from(
        new Map(
          products
            .filter((p: Product) => p.brand_name)
            .map((p: Product) => [p.brand_name, { id: p.id, name: p.brand_name }])
        ).values()
      ) as Brand[];
      setBrands(uniqueBrands);
    } catch (error: any) {
      message.error('Ma\'lumotlarni yuklashda xatolik');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndPaginateProducts = () => {
    let filtered = [...allProducts];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.sku.toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter
    if (filters.category) {
      filtered = filtered.filter((p) => p.category_name === filters.category);
    }

    // Apply brand filter
    if (filters.brand) {
      filtered = filtered.filter((p) => p.brand_name === filters.brand);
    }

    // Apply pagination
    const startIndex = (pagination.current - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    const paginatedProducts = filtered.slice(startIndex, endIndex);

    setData(paginatedProducts);
    setPagination((prev) => ({
      ...prev,
      total: filtered.length,
    }));
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters(prev => ({ ...prev, search: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleCategoryChange = (value: string | undefined) => {
    setFilters(prev => ({ ...prev, category: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleBrandChange = (value: string | undefined) => {
    setFilters(prev => ({ ...prev, brand: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleOpenCartModal = (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setIsModalOpen(true);
  };

  const handleAddToCart = async () => {
    if (!selectedProduct) return;

    setAddingToCart(true);
    try {
      await addToCart({
        product_id: selectedProduct.id,
        quantity: quantity,
      });
      message.success(`${selectedProduct.name} savatchaga qo'shildi`);
      setIsModalOpen(false);
      setSelectedProduct(null);
      setQuantity(1);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.response?.data?.quantity || 'Xatolik yuz berdi';
      message.error(errorMsg);
    } finally {
      setAddingToCart(false);
    }
  };

  const columns: ColumnsType<Product> = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      width: 150,
    },
    {
      title: 'Mahsulot nomi',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Product) => {
        const stockValue = typeof record.stock_ok === 'number' ? record.stock_ok : parseFloat(record.stock_ok) || 0;
        return (
          <span style={{ color: stockValue <= 0 ? '#e74c3c' : '#c7d5e0' }}>
            {name}
          </span>
        );
      },
    },
    {
      title: 'Brand',
      dataIndex: 'brand_name',
      key: 'brand_name',
      width: 150,
    },
    {
      title: 'Kategoriya',
      dataIndex: 'category_name',
      key: 'category_name',
      width: 150,
    },
    {
      title: 'Qoldiq',
      dataIndex: 'stock_ok',
      key: 'stock_ok',
      width: 120,
      align: 'right',
      render: (stock: number, record: Product) => {
        const stockValue = typeof stock === 'number' ? stock : parseFloat(stock) || 0;
        return (
          <span style={{
            color: stockValue <= 0 ? '#e74c3c' : '#52c41a',
            fontWeight: 'bold'
          }}>
            {stockValue.toFixed(2)} {record.unit}
          </span>
        );
      },
    },
    {
      title: '',
      key: 'action',
      width: 150,
      align: 'center',
      render: (_: any, record: Product) => {
        const stockValue = typeof record.stock_ok === 'number' ? record.stock_ok : parseFloat(record.stock_ok) || 0;
        return (
          <Button
            type="primary"
            icon={<ShoppingCartOutlined />}
            onClick={() => handleOpenCartModal(record)}
            disabled={stockValue <= 0}
            style={{
              background: stockValue <= 0 ? '#555' : '#66c0f4',
              borderColor: stockValue <= 0 ? '#555' : '#66c0f4',
            }}
          >
            Savatchaga
          </Button>
        );
      },
    },
  ];

  // Mobile card render
  const renderMobileCard = (product: Product) => {
    const stockValue = typeof product.stock_ok === 'number' ? product.stock_ok : parseFloat(product.stock_ok) || 0;
    const isOutOfStock = stockValue <= 0;

    return (
      <Card
        key={product.id}
        style={{
          marginBottom: 16,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          border: '1px solid #2a3f5f',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          opacity: isOutOfStock ? 0.6 : 1,
        }}
        bodyStyle={{ padding: 'clamp(12px, 3vw, 16px)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <Text strong style={{ color: isOutOfStock ? '#e74c3c' : '#66c0f4', fontSize: 'clamp(14px, 3vw, 16px)' }}>
              <AppstoreOutlined /> {product.name}
            </Text>
            <div>
              <Text style={{ color: '#8f98a0', fontSize: '11px', display: 'block' }}>
                SKU: {product.sku}
              </Text>
            </div>
          </div>
          <Tag color={isOutOfStock ? 'red' : 'green'}>
            {isOutOfStock ? 'Tugagan' : 'Mavjud'}
          </Tag>
        </div>

        <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
          <Col span={12}>
            <div style={{ padding: '8px', background: '#0f1419', borderRadius: '6px', border: '1px solid #2a3f5f' }}>
              <Text style={{ color: '#8f98a0', fontSize: '10px', display: 'block' }}>BRAND</Text>
              <Text strong style={{ color: '#66c0f4', fontSize: 'clamp(12px, 2.5vw, 14px)' }}>
                {product.brand_name || '-'}
              </Text>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ padding: '8px', background: '#0f1419', borderRadius: '6px', border: '1px solid #2a3f5f' }}>
              <Text style={{ color: '#8f98a0', fontSize: '10px', display: 'block' }}>KATEGORIYA</Text>
              <Text strong style={{ color: '#66c0f4', fontSize: 'clamp(12px, 2.5vw, 14px)' }}>
                {product.category_name || '-'}
              </Text>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ padding: '8px', background: '#0f1419', borderRadius: '6px', border: '1px solid #2a3f5f' }}>
              <Text style={{ color: '#8f98a0', fontSize: '10px', display: 'block' }}>QOLDIQ</Text>
              <Text strong style={{ color: isOutOfStock ? '#e74c3c' : '#52c41a', fontSize: 'clamp(12px, 2.5vw, 14px)' }}>
                {stockValue.toFixed(2)} {product.unit}
              </Text>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ padding: '8px', background: '#0f1419', borderRadius: '6px', border: '1px solid #2a3f5f' }}>
              <Text style={{ color: '#8f98a0', fontSize: '10px', display: 'block' }}>NARX</Text>
              <Text strong style={{ color: '#52c41a', fontSize: 'clamp(12px, 2.5vw, 14px)' }}>
                ${product.price_usd}
              </Text>
            </div>
          </Col>
        </Row>

        <div style={{ paddingTop: 8, borderTop: '1px dashed #2a3f5f' }}>
          <Button
            type="primary"
            block
            icon={<ShoppingCartOutlined />}
            onClick={() => handleOpenCartModal(product)}
            disabled={isOutOfStock}
            style={{
              background: isOutOfStock ? '#555' : '#66c0f4',
              borderColor: isOutOfStock ? '#555' : '#66c0f4',
              fontWeight: 'bold',
            }}
          >
            {isOutOfStock ? 'Tugagan' : 'Savatchaga qo\'shish'}
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div style={{
      padding: 'clamp(12px, 3vw, 24px)',
      background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)',
      minHeight: '100vh'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'clamp(16px, 3vw, 24px)', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <Title level={2} style={{ color: '#fff', margin: 0, fontSize: 'clamp(18px, 4vw, 30px)' }}>Mahsulotlar</Title>
        <Button
          type="primary"
          size="large"
          icon={<ShoppingCartOutlined />}
          onClick={() => navigate('/dealer-portal/cart')}
          style={{
            background: '#66c0f4',
            borderColor: '#66c0f4',
            fontWeight: 'bold',
          }}
        >
          <span className="btn-text">Savatcha</span>
        </Button>
      </div>

      <Card
        style={{
          marginBottom: 'clamp(16px, 3vw, 24px)',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          border: '1px solid #2a3f5f',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}
      >
        <div style={{ display: 'flex', gap: 'clamp(8px, 2vw, 16px)', flexWrap: 'wrap' }}>
          <Input
            placeholder="Qidirish (nom, SKU)..."
            prefix={<SearchOutlined style={{ color: '#66c0f4' }} />}
            allowClear
            onChange={handleSearch}
            style={{
              flex: '1 1 250px',
              minWidth: '200px',
              background: '#0f1419',
              borderColor: '#2a3f5f',
              color: '#c7d5e0'
            }}
          />
          <Select
            placeholder="Kategoriya"
            allowClear
            onChange={handleCategoryChange}
            style={{ flex: '1 1 180px', minWidth: '150px' }}
            options={categories.map(c => ({ value: c.name, label: c.name }))}
          />
          <Select
            placeholder="Brand"
            allowClear
            onChange={handleBrandChange}
            style={{ flex: '1 1 180px', minWidth: '150px' }}
            options={brands.map(b => ({ value: b.name, label: b.name }))}
          />
        </div>
      </Card>

      {/* Desktop Table */}
      <div className="desktop-view">
        <Card
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            border: '1px solid #2a3f5f',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}
          className="steam-table"
        >
          <Table
            columns={columns}
            dataSource={data}
            rowKey="id"
            loading={loading}
            pagination={{
              ...pagination,
              onChange: (page) => setPagination(prev => ({ ...prev, current: page })),
              showSizeChanger: false,
              showTotal: (total) => `Jami: ${total} ta mahsulot`,
            }}
            scroll={{ x: 1000 }}
          />
        </Card>
      </div>

      {/* Mobile Cards */}
      <div className="mobile-view">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#8f98a0' }}>
            Loading...
          </div>
        ) : data.length === 0 ? (
          <Card style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            border: '1px solid #2a3f5f',
            textAlign: 'center',
            padding: '40px'
          }}>
            <Text style={{ color: '#8f98a0' }}>Ma'lumot topilmadi</Text>
          </Card>
        ) : (
          <>
            {data.map(renderMobileCard)}
            {pagination.total > pagination.pageSize && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16, gap: 8 }}>
                <Button
                  onClick={() => setPagination(prev => ({ ...prev, current: Math.max(1, prev.current - 1) }))}
                  disabled={pagination.current === 1}
                  style={{ background: '#16213e', borderColor: '#2a3f5f', color: '#66c0f4' }}
                >
                  Oldingi
                </Button>
                <Text style={{ color: '#c7d5e0', lineHeight: '32px' }}>
                  {pagination.current} / {Math.ceil(pagination.total / pagination.pageSize)}
                </Text>
                <Button
                  onClick={() => setPagination(prev => ({ ...prev, current: Math.min(Math.ceil(pagination.total / pagination.pageSize), prev.current + 1) }))}
                  disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
                  style={{ background: '#16213e', borderColor: '#2a3f5f', color: '#66c0f4' }}
                >
                  Keyingi
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add to Cart Modal */}
      <Modal
        title="Savatchaga qo'shish"
        open={isModalOpen}
        onOk={handleAddToCart}
        onCancel={() => setIsModalOpen(false)}
        confirmLoading={addingToCart}
        okText="Qo'shish"
        cancelText="Bekor qilish"
        okButtonProps={{
          style: { background: '#66c0f4', borderColor: '#66c0f4' }
        }}
      >
        {selectedProduct && (
          <div style={{ padding: '16px 0' }}>
            <div style={{ marginBottom: 16 }}>
              <strong>Mahsulot:</strong> {selectedProduct.name}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>SKU:</strong> {selectedProduct.sku}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>Mavjud:</strong> {selectedProduct.stock_ok} {selectedProduct.unit}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>Narx:</strong> ${selectedProduct.price_usd}
            </div>
            <div>
              <strong>Miqdor:</strong>
              <InputNumber
                min={0.01}
                max={selectedProduct.stock_ok}
                step={1}
                value={quantity}
                onChange={(value) => setQuantity(value || 1)}
                style={{ width: '100%', marginTop: 8 }}
                addonAfter={selectedProduct.unit}
              />
            </div>
            {quantity > 0 && (
              <div style={{ marginTop: 16, fontSize: '16px', fontWeight: 'bold' }}>
                Jami: ${(selectedProduct.price_usd * quantity).toFixed(2)}
              </div>
            )}
          </div>
        )}
      </Modal>

      <style>{`
        .steam-table .ant-card-body {
          padding: 0;
        }
        .steam-table .ant-table {
          background: transparent;
        }
        .steam-table .ant-table-thead > tr > th {
          background: #16213e;
          color: #66c0f4;
          border-bottom: 1px solid #2a3f5f;
          font-weight: 600;
          font-size: clamp(12px, 2.5vw, 14px);
          padding: clamp(8px, 2vw, 16px);
        }
        .steam-table .ant-table-tbody > tr > td {
          background: transparent;
          color: #c7d5e0;
          border-bottom: 1px solid #2a3f5f;
          font-size: clamp(11px, 2.5vw, 14px);
          padding: clamp(8px, 2vw, 16px);
        }
        .steam-table .ant-table-tbody > tr:hover > td {
          background: rgba(102, 192, 244, 0.1);
        }
        .steam-table .ant-pagination {
          margin: 16px;
        }
        .steam-table .ant-pagination-item {
          background: #16213e;
          border-color: #2a3f5f;
        }
        .steam-table .ant-pagination-item a {
          color: #66c0f4;
        }
        .steam-table .ant-pagination-item-active {
          border-color: #66c0f4;
          background: rgba(102, 192, 244, 0.1);
        }
        .steam-table .ant-pagination-prev button,
        .steam-table .ant-pagination-next button {
          background: #16213e;
          border-color: #2a3f5f;
          color: #66c0f4;
        }

        /* Mobile/Desktop views */
        .mobile-view {
          display: none;
        }
        .desktop-view {
          display: block;
        }

        @media (max-width: 768px) {
          .mobile-view {
            display: block;
          }
          .desktop-view {
            display: none;
          }
        }

        @media (max-width: 576px) {
          .btn-text {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
