import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, DatePicker, Button, Table, Tag, Input, Space, Tooltip, Image, Alert } from 'antd';
import { 
  ExportOutlined,
  SearchOutlined,
  ClearOutlined,
  EditOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

import EditDefectsModal from '../components/defects/EditDefectsModal';
import { formatQuantity } from '../utils/formatters';

const { RangePicker } = DatePicker;

// ============================================================================
// Type Definitions
// ============================================================================

interface ProductWithDefects {
  product_id: number;
  product_name: string;
  product_sku: string;
  product_image?: string | null;
  brand_name?: string;
  category_name?: string;
  current_stock_defect: number;
  latest_record_date?: string;
  total_records: number;
}

// ============================================================================
// Component
// ============================================================================

const DefectsPage = () => {
  const { t } = useTranslation(['defects', 'common']);

  const [products, setProducts] = useState<ProductWithDefects[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');

  // Edit modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);

  // Fetch products with defects
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      params.append('page', page.toString());
      params.append('page_size', pageSize.toString());

      const response = await fetch(`/api/defects/records/products-with-defects/?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch products');

      const data = await response.json();
      setProducts(data.results || []);
      setTotal(data.count || 0);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error(t('defects:fetchError'));
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page, pageSize, t]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handlers
  const handleEdit = (product: ProductWithDefects) => {
    setEditingProductId(product.product_id);
    setEditModalVisible(true);
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/defects/records/export-excel/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to export');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `defects_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(t('defects:exportSuccess'));
    } catch (error) {
      console.error('Failed to export defects:', error);
      toast.error(t('defects:exportError'));
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setPage(1);
  };

  const handleModalClose = () => {
    setEditModalVisible(false);
    setEditingProductId(null);
  };

  const handleModalSuccess = () => {
    fetchProducts();
  };

  // Table columns
  const columns = [
    {
      title: t('defects:product'),
      dataIndex: 'product_name',
      key: 'product',
      width: 250,
      render: (_: any, record: ProductWithDefects) => (
        <Space>
          {record.product_image && (
            <Image
              src={record.product_image}
              alt={record.product_name}
              width={40}
              height={40}
              style={{ objectFit: 'cover', borderRadius: 4 }}
              preview={false}
            />
          )}
          <div>
            <div className="font-medium">{record.product_name}</div>
            <div className="text-xs text-gray-500">{record.product_sku}</div>
            {record.brand_name && (
              <div className="text-xs text-gray-400">{record.brand_name}</div>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: t('defects:category'),
      dataIndex: 'category_name',
      key: 'category',
      width: 120,
      render: (category: string) => category || '-',
    },
    {
      title: t('defects:currentStockDefect'),
      dataIndex: 'current_stock_defect',
      key: 'current_stock_defect',
      width: 150,
      render: (qty: number) => (
        <span className="font-medium text-red-600">{formatQuantity(qty)}</span>
      ),
    },
    {
      title: t('defects:totalRecords'),
      dataIndex: 'total_records',
      key: 'total_records',
      width: 120,
      render: (count: number) => (
        <Tag color={count > 0 ? 'blue' : 'default'}>{count} {t('defects:records')}</Tag>
      ),
    },
    {
      title: t('defects:latestRecordDate'),
      dataIndex: 'latest_record_date',
      key: 'latest_record_date',
      width: 150,
      render: (date: string) => date ? dayjs(date).format('DD.MM.YYYY HH:mm') : '-',
    },
    {
      title: t('common:labels.actions'),
      key: 'actions',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: ProductWithDefects) => (
        <Space size="small">
          <Tooltip title={t('defects:editDefects')}>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              size="small"
            >
              {t('common:edit')}
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      {/* Info Alert */}
      <Alert
        message="Defects Management"
        description="Click Edit to manage defect details, classification (fixable/non-fixable), and spare parts consumption for each product."
        type="info"
        showIcon
        closable
        className="mb-4"
      />

      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('defects:title')}</h1>
        <Space>
          <Button
            type="default"
            icon={<ExportOutlined />}
            onClick={handleExport}
          >
            {t('common:actions.export')} (XLSX)
          </Button>
        </Space>
      </div>

      {/* Filters */}
      <div className="mb-4 p-4 bg-white rounded-lg shadow">
        <Space wrap size="middle">
          <Input
            placeholder={t('defects:searchPlaceholder')}
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onPressEnter={fetchProducts}
            style={{ width: 300 }}
            allowClear
          />
          <Button
            icon={<SearchOutlined />}
            type="primary"
            onClick={fetchProducts}
          >
            {t('common:actions.search')}
          </Button>
          <Button
            icon={<ClearOutlined />}
            onClick={handleClearFilters}
          >
            {t('common:actions.clear')}
          </Button>
        </Space>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={products}
        rowKey="product_id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (total) => t('common:totalItems', { total }),
          onChange: (page, pageSize) => {
            setPage(page);
            setPageSize(pageSize);
          },
        }}
        scroll={{ x: 1200 }}
      />

      {/* Edit Modal */}
      <EditDefectsModal
        visible={editModalVisible}
        productId={editingProductId}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default DefectsPage;
