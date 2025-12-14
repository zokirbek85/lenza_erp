import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, DatePicker, Button, Table, Tag, Input, Space, Tooltip, Image, Alert } from 'antd';
import { 
  ExportOutlined,
  SearchOutlined,
  ClearOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

import {
  getProductDefects,
  // deleteProductDefect, // Disabled for stock-based defects
  exportDefects,
} from '../api/defects';
import type {
  ProductDefectListItem,
  DefectStatus,
  DefectFilters,
} from '../types/defects';
// Modals disabled for stock-based defects - manage via Products module
// import DefectFormModal from '../components/defects/DefectFormModal';
// import RepairModal from '../components/defects/RepairModal';
// import DisposeModal from '../components/defects/DisposeModal';
// import SellOutletModal from '../components/defects/SellOutletModal';
import { formatQuantity } from '../utils/formatters';
// import { useAuthStore } from '../auth/useAuthStore'; // Unused for stock-based defects

const { RangePicker } = DatePicker;

const DefectsPage = () => {
  const { t } = useTranslation(['defects', 'common']);
  // const role = useAuthStore((state) => state.role); // Unused for stock-based defects
  // const isAdmin = role === 'admin';
  // const isWarehouse = role === 'warehouse';

  const [defects, setDefects] = useState<ProductDefectListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);

  // Filters
  const [filters, setFilters] = useState<DefectFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DefectStatus | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);

  // Modals - disabled for stock-based defects
  // const [formModalVisible, setFormModalVisible] = useState(false);
  // const [editingDefect, setEditingDefect] = useState<ProductDefectListItem | null>(null);
  // const [repairModalVisible, setRepairModalVisible] = useState(false);
  // const [disposeModalVisible, setDisposeModalVisible] = useState(false);
  // const [sellOutletModalVisible, setSellOutletModalVisible] = useState(false);
  // const [selectedDefect, setSelectedDefect] = useState<ProductDefectListItem | null>(null);

  // Fetch defects
  const fetchDefects = useCallback(async () => {
    setLoading(true);
    try {
      const params: DefectFilters = {
        ...filters,
        search: searchQuery || undefined,
        status: statusFilter,
        start_date: dateRange[0] ? dateRange[0].format('YYYY-MM-DD') : undefined,
        end_date: dateRange[1] ? dateRange[1].format('YYYY-MM-DD') : undefined,
        page,
        page_size: pageSize,
      };

      const response = await getProductDefects(params);
      setDefects(response.data.results);
      setTotal(response.data.count);
    } catch (error) {
      console.error('Failed to fetch defects:', error);
      toast.error(t('defects:fetchError'));
    } finally {
      setLoading(false);
    }
  }, [filters, searchQuery, statusFilter, dateRange, page, pageSize, t]);

  useEffect(() => {
    fetchDefects();
  }, [fetchDefects]);

  // Handlers - create/edit/delete/repair disabled for stock-based defects
  // Defects are managed via Products module

  const handleExport = async () => {
    try {
      await exportDefects({
        ...filters,
        search: searchQuery || undefined,
        status: statusFilter,
        start_date: dateRange[0] ? dateRange[0].format('YYYY-MM-DD') : undefined,
        end_date: dateRange[1] ? dateRange[1].format('YYYY-MM-DD') : undefined,
      });
      toast.success(t('defects:exportSuccess'));
    } catch (error) {
      console.error('Failed to export defects:', error);
      toast.error(t('defects:exportError'));
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter(undefined);
    setDateRange([null, null]);
    setFilters({});
    setPage(1);
  };

  const getStatusColor = (status: DefectStatus) => {
    const colors: Record<DefectStatus, string> = {
      pending: 'orange',
      under_repair: 'blue',
      repaired: 'green',
      disposed: 'red',
      sold_outlet: 'purple',
    };
    return colors[status] || 'default';
  };

  const columns = [
    {
      title: t('defects:product'),
      dataIndex: 'product_name',
      key: 'product',
      width: 250,
      render: (_: any, record: ProductDefectListItem) => (
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
          </div>
        </Space>
      ),
    },
    {
      title: t('defects:totalQty'),
      dataIndex: 'qty',
      key: 'qty',
      width: 100,
      render: (qty: number) => formatQuantity(qty),
    },
    {
      title: t('defects:repairableQty'),
      dataIndex: 'repairable_qty',
      key: 'repairable_qty',
      width: 120,
      render: (qty: number) => (
        <span className="text-green-600 font-medium">{formatQuantity(qty)}</span>
      ),
    },
    {
      title: t('defects:nonRepairableQty'),
      dataIndex: 'non_repairable_qty',
      key: 'non_repairable_qty',
      width: 140,
      render: (qty: number) => (
        <span className="text-red-600 font-medium">{formatQuantity(qty)}</span>
      ),
    },
    {
      title: t('common:labels.status'),
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: DefectStatus, record: ProductDefectListItem) => (
        <Tag color={getStatusColor(status)}>
          {record.status_display || status}
        </Tag>
      ),
    },
    {
      title: t('defects:defectSummary'),
      dataIndex: 'defect_summary',
      key: 'defect_summary',
      ellipsis: true,
      render: (summary: string) => summary || '-',
    },
    {
      title: t('defects:createdBy'),
      dataIndex: 'created_by_name',
      key: 'created_by',
      width: 120,
    },
    {
      title: t('defects:createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
    },
    {
      title: t('common:labels.actions'),
      key: 'actions',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: ProductDefectListItem) => (
        <Space size="small">
          <Tooltip title="View/Edit in Products Module">
            <Button
              type="link"
              onClick={() => window.location.href = `/products?search=${record.product_sku}`}
              size="small"
            >
              View Product
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
        message="Stock-Based Defect Tracking"
        description="This page displays products with defective stock (stock_defect > 0). Defect quantities are managed directly in the Products module. To adjust defect stock, edit the product's defect quantity."
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
            icon={<LineChartOutlined />}
            onClick={() => window.location.href = '/defects/analytics'}
          >
            {t('defects:analytics')}
          </Button>
          <Button
            type="default"
            icon={<ExportOutlined />}
            onClick={handleExport}
          >
            {t('common:actions.export')}
          </Button>
          {/* Create button removed - defects managed via Products module */}
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
            onPressEnter={fetchDefects}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            placeholder={t('defects:statusFilter')}
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 180 }}
            allowClear
          >
            <Select.Option value="pending">{t('defects:status.pending')}</Select.Option>
            <Select.Option value="under_repair">{t('defects:status.underRepair')}</Select.Option>
            <Select.Option value="repaired">{t('defects:status.repaired')}</Select.Option>
            <Select.Option value="disposed">{t('defects:status.disposed')}</Select.Option>
            <Select.Option value="sold_outlet">{t('defects:status.soldOutlet')}</Select.Option>
          </Select>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null])}
            format="DD.MM.YYYY"
            placeholder={[t('common:startDate'), t('common:endDate')]}
          />
          <Button
            icon={<SearchOutlined />}
            type="primary"
            onClick={fetchDefects}
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
        dataSource={defects}
        rowKey="id"
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
        scroll={{ x: 1400 }}
      />

      {/* Modals removed - defects managed via Products module */}
    </div>
  );
};

export default DefectsPage;
