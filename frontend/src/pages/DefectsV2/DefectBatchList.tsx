/**
 * Defect Batch List Page
 * Main page for viewing and managing defect batches
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Table,
  Tag,
  Input,
  Space,
  DatePicker,
  Select,
  Tooltip,
  Image,
  Card,
  Statistic,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  ClearOutlined,
  EyeOutlined,
  LineChartOutlined,
  ToolOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';
import dayjs, { Dayjs } from 'dayjs';

import { getDefectBatches } from '../../api/defectsV2';
import type { DefectBatchListItem, DefectBatchStatus, DefectBatchFilters } from '../../types/defectsV2';
import { formatQuantity, formatDate } from '../../utils/formatters';
import { useAuthStore } from '../../auth/useAuthStore';

const { RangePicker } = DatePicker;

const DefectBatchListPage = () => {
  const { t } = useTranslation(['defects', 'common']);
  const navigate = useNavigate();
  const role = useAuthStore((state) => state.role);
  const isAdmin = role === 'admin';
  const isWarehouse = role === 'warehouse';

  // State
  const [batches, setBatches] = useState<DefectBatchListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DefectBatchStatus | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);

  // Statistics
  const [stats, setStats] = useState({
    totalBatches: 0,
    pendingBatches: 0,
    processingBatches: 0,
    completedBatches: 0,
  });

  // Fetch batches
  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const params: DefectBatchFilters = {
        search: searchQuery || undefined,
        status: statusFilter,
        start_date: dateRange[0] ? dateRange[0].format('YYYY-MM-DD') : undefined,
        end_date: dateRange[1] ? dateRange[1].format('YYYY-MM-DD') : undefined,
        page,
        page_size: pageSize,
        ordering: '-detected_at',
      };

      const response = await getDefectBatches(params);
      setBatches(response.results);
      setTotal(response.count);

      // Calculate statistics
      const pending = response.results.filter((b) => b.status === 'pending').length;
      const processing = response.results.filter((b) => b.status === 'processing').length;
      const completed = response.results.filter((b) => b.status === 'completed').length;
      setStats({
        totalBatches: response.count,
        pendingBatches: pending,
        processingBatches: processing,
        completedBatches: completed,
      });
    } catch (error) {
      console.error('Failed to fetch defect batches:', error);
      toast.error(t('defects:fetchError'));
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, dateRange, page, pageSize, t]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // Handlers
  const handleCreate = () => {
    navigate('/defects-v2/create');
  };

  const handleViewDetails = (id: number) => {
    navigate(`/defects-v2/batches/${id}`);
  };

  const handleViewAnalytics = () => {
    navigate('/defects-v2/analytics');
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter(undefined);
    setDateRange([null, null]);
    setPage(1);
  };

  const getStatusColor = (status: DefectBatchStatus): string => {
    const colors: Record<DefectBatchStatus, string> = {
      pending: 'orange',
      inspected: 'blue',
      processing: 'cyan',
      completed: 'green',
    };
    return colors[status] || 'default';
  };

  const getStatusIcon = (status: DefectBatchStatus) => {
    const icons: Record<DefectBatchStatus, React.ReactNode> = {
      pending: <ClockCircleOutlined />,
      inspected: <EyeOutlined />,
      processing: <ToolOutlined />,
      completed: <CheckCircleOutlined />,
    };
    return icons[status];
  };

  const columns = [
    {
      title: t('defects:batchId'),
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: number) => `#${id}`,
    },
    {
      title: t('defects:product'),
      dataIndex: 'product_name',
      key: 'product',
      width: 250,
      render: (_: any, record: DefectBatchListItem) => (
        <Space>
          {record.product_image && (
            <Image
              src={record.product_image}
              alt={record.product_name}
              width={48}
              height={48}
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
      dataIndex: 'total_qty',
      key: 'total_qty',
      width: 100,
      render: (qty: string) => (
        <span className="font-semibold">{formatQuantity(parseFloat(qty))}</span>
      ),
    },
    {
      title: t('defects:repairableQty'),
      dataIndex: 'repairable_qty',
      key: 'repairable_qty',
      width: 120,
      render: (qty: string) => (
        <span className="text-green-600 font-medium">
          {formatQuantity(parseFloat(qty))}
        </span>
      ),
    },
    {
      title: t('defects:nonRepairableQty'),
      dataIndex: 'non_repairable_qty',
      key: 'non_repairable_qty',
      width: 140,
      render: (qty: string) => (
        <span className="text-red-600 font-medium">
          {formatQuantity(parseFloat(qty))}
        </span>
      ),
    },
    {
      title: t('common:labels.status'),
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: DefectBatchStatus, record: DefectBatchListItem) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {record.status_display}
        </Tag>
      ),
    },
    {
      title: t('defects:warehouse'),
      dataIndex: 'warehouse_name',
      key: 'warehouse',
      width: 150,
      render: (warehouse: string) => warehouse || '-',
    },
    {
      title: t('defects:detectedAt'),
      dataIndex: 'detected_at',
      key: 'detected_at',
      width: 120,
      render: (date: string) => formatDate(date, 'DD.MM.YYYY'),
    },
    {
      title: t('defects:createdBy'),
      dataIndex: 'created_by_name',
      key: 'created_by',
      width: 120,
    },
    {
      title: t('common:labels.actions'),
      key: 'actions',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: DefectBatchListItem) => (
        <Space size="small">
          <Tooltip title={t('common:actions.view')}>
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record.id)}
              size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('defects:defectBatches')}</h1>
        <Space>
          <Button
            type="default"
            icon={<LineChartOutlined />}
            onClick={handleViewAnalytics}
          >
            {t('defects:analytics')}
          </Button>
          {(isAdmin || isWarehouse) && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              {t('defects:createBatch')}
            </Button>
          )}
        </Space>
      </div>

      {/* Statistics Cards */}
      <Row gutter={16} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('defects:totalBatches')}
              value={stats.totalBatches}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('defects:pendingBatches')}
              value={stats.pendingBatches}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('defects:processingBatches')}
              value={stats.processingBatches}
              valueStyle={{ color: '#13c2c2' }}
              prefix={<ToolOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('defects:completedBatches')}
              value={stats.completedBatches}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-4">
        <Space wrap size="middle">
          <Input
            placeholder={t('defects:searchPlaceholder')}
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onPressEnter={fetchBatches}
            style={{ width: 280 }}
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
            <Select.Option value="inspected">{t('defects:status.inspected')}</Select.Option>
            <Select.Option value="processing">{t('defects:status.processing')}</Select.Option>
            <Select.Option value="completed">{t('defects:status.completed')}</Select.Option>
          </Select>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null])}
            format="DD.MM.YYYY"
            placeholder={[t('common:startDate'), t('common:endDate')]}
          />
          <Button icon={<SearchOutlined />} type="primary" onClick={fetchBatches}>
            {t('common:actions.search')}
          </Button>
          <Button icon={<ClearOutlined />} onClick={handleClearFilters}>
            {t('common:actions.clear')}
          </Button>
        </Space>
      </Card>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={batches}
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
            pageSizeOptions: ['10', '25', '50', '100'],
          }}
          scroll={{ x: 1400 }}
        />
      </Card>
    </div>
  );
};

export default DefectBatchListPage;
