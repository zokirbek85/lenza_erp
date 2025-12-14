import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, DatePicker, Button, Table, Tag, Input, Space, Tooltip, Popconfirm, Image } from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ToolOutlined, 
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
  deleteProductDefect,
  exportDefects,
} from '../api/defects';
import type {
  ProductDefectListItem,
  DefectStatus,
  DefectFilters,
} from '../types/defects';
import DefectFormModal from '../components/defects/DefectFormModal';
import RepairModal from '../components/defects/RepairModal';
import DisposeModal from '../components/defects/DisposeModal';
import SellOutletModal from '../components/defects/SellOutletModal';
import { formatQuantity } from '../utils/formatters';
import { useAuthStore } from '../auth/useAuthStore';

const { RangePicker } = DatePicker;

const DefectsPage = () => {
  const { t } = useTranslation(['defects', 'common']);
  const role = useAuthStore((state) => state.role);
  const isAdmin = role === 'admin';
  const isWarehouse = role === 'warehouse';

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

  // Modals
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingDefect, setEditingDefect] = useState<ProductDefectListItem | null>(null);
  const [repairModalVisible, setRepairModalVisible] = useState(false);
  const [disposeModalVisible, setDisposeModalVisible] = useState(false);
  const [sellOutletModalVisible, setSellOutletModalVisible] = useState(false);
  const [selectedDefect, setSelectedDefect] = useState<ProductDefectListItem | null>(null);

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

  // Handlers
  const handleCreate = () => {
    setEditingDefect(null);
    setFormModalVisible(true);
  };

  const handleEdit = (defect: ProductDefectListItem) => {
    setEditingDefect(defect);
    setFormModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteProductDefect(id);
      toast.success(t('defects:deleteSuccess'));
      fetchDefects();
    } catch (error) {
      console.error('Failed to delete defect:', error);
      toast.error(t('defects:deleteError'));
    }
  };

  const handleRepair = (defect: ProductDefectListItem) => {
    setSelectedDefect(defect);
    setRepairModalVisible(true);
  };

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
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: ProductDefectListItem) => (
        <Space size="small">
          {record.repairable_qty > 0 && (isAdmin || isWarehouse) && (
            <Tooltip title={t('defects:repair')}>
              <Button
                type="link"
                icon={<ToolOutlined />}
                onClick={() => handleRepair(record)}
                size="small"
              />
            </Tooltip>
          )}
          {isAdmin && (
            <>
              <Tooltip title={t('common:actions.edit')}>
                <Button
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(record)}
                  size="small"
                />
              </Tooltip>
              <Popconfirm
                title={t('defects:deleteConfirm')}
                onConfirm={() => handleDelete(record.id)}
                okText={t('common:yes')}
                cancelText={t('common:no')}
              >
                <Tooltip title={t('common:actions.delete')}>
                  <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                  />
                </Tooltip>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
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
          {isAdmin && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              {t('defects:create')}
            </Button>
          )}
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

      {/* Modals */}
      {formModalVisible && (
        <DefectFormModal
          visible={formModalVisible}
          defect={editingDefect}
          onCancel={() => {
            setFormModalVisible(false);
            setEditingDefect(null);
          }}
          onSuccess={() => {
            setFormModalVisible(false);
            setEditingDefect(null);
            fetchDefects();
          }}
        />
      )}

      {repairModalVisible && selectedDefect && (
        <RepairModal
          visible={repairModalVisible}
          defect={selectedDefect}
          onCancel={() => {
            setRepairModalVisible(false);
            setSelectedDefect(null);
          }}
          onSuccess={() => {
            setRepairModalVisible(false);
            setSelectedDefect(null);
            fetchDefects();
          }}
        />
      )}

      {disposeModalVisible && selectedDefect && (
        <DisposeModal
          visible={disposeModalVisible}
          defect={selectedDefect}
          onCancel={() => {
            setDisposeModalVisible(false);
            setSelectedDefect(null);
          }}
          onSuccess={() => {
            setDisposeModalVisible(false);
            setSelectedDefect(null);
            fetchDefects();
          }}
        />
      )}

      {sellOutletModalVisible && selectedDefect && (
        <SellOutletModal
          visible={sellOutletModalVisible}
          defect={selectedDefect}
          onCancel={() => {
            setSellOutletModalVisible(false);
            setSelectedDefect(null);
          }}
          onSuccess={() => {
            setSellOutletModalVisible(false);
            setSelectedDefect(null);
            fetchDefects();
          }}
        />
      )}
    </div>
  );
};

export default DefectsPage;
