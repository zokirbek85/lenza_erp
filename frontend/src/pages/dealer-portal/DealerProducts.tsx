import { useEffect, useState } from 'react';
import { Table, Input, Select, Typography, Card, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import axios from 'axios';

const { Title } = Typography;

interface Product {
  id: number;
  name: string;
  sku: string;
  category_name: string;
  brand_name: string;
  stock_ok: number;
  unit: string;
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
        params: { page_size: 10000 }
      });
      const products = response.data.results || response.data;
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
  ];

  return (
    <div style={{
      padding: 24,
      background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)',
      minHeight: '100vh'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' }}>
        <Title level={2} style={{ color: '#fff', margin: 0 }}>Mahsulotlar</Title>
      </div>

      <Card
        style={{
          marginBottom: 24,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          border: '1px solid #2a3f5f',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}
      >
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Input
            placeholder="Qidirish (nom, SKU)..."
            prefix={<SearchOutlined style={{ color: '#66c0f4' }} />}
            allowClear
            onChange={handleSearch}
            style={{
              width: 300,
              background: '#0f1419',
              borderColor: '#2a3f5f',
              color: '#c7d5e0'
            }}
          />
          <Select
            placeholder="Kategoriya"
            allowClear
            onChange={handleCategoryChange}
            style={{ width: 200 }}
            options={categories.map(c => ({ value: c.name, label: c.name }))}
          />
          <Select
            placeholder="Brand"
            allowClear
            onChange={handleBrandChange}
            style={{ width: 200 }}
            options={brands.map(b => ({ value: b.name, label: b.name }))}
          />
        </div>
      </Card>

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
        }
        .steam-table .ant-table-tbody > tr > td {
          background: transparent;
          color: #c7d5e0;
          border-bottom: 1px solid #2a3f5f;
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
      `}</style>
    </div>
  );
}
