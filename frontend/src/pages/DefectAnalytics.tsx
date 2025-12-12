import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Row, Col, Statistic, Table, DatePicker, Button, Space } from 'antd';
import {
  ShoppingOutlined,
  ToolOutlined,
  DeleteOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import toast from 'react-hot-toast';

import { getDefectStatistics } from '../api/defects';
import type { DefectStatistics } from '../types/defects';
import { formatQuantity } from '../utils/formatters';

const { RangePicker } = DatePicker;

const DefectAnalyticsPage = () => {
  const { t } = useTranslation(['defects', 'common']);
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<DefectStatistics | null>(null);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const params = {
        start_date: dateRange[0] ? dateRange[0].format('YYYY-MM-DD') : undefined,
        end_date: dateRange[1] ? dateRange[1].format('YYYY-MM-DD') : undefined,
      };

      const response = await getDefectStatistics(params);
      setStatistics(response.data);
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
      toast.error(t('defects.fetchStatisticsError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, []);

  const statusColumns = [
    {
      title: t('defects.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => t(`defects.status.${status}`, status),
    },
    {
      title: t('defects.count'),
      dataIndex: 'count',
      key: 'count',
    },
    {
      title: t('defects.totalQty'),
      dataIndex: 'qty_sum',
      key: 'qty_sum',
      render: (qty: number) => formatQuantity(qty),
    },
  ];

  const productColumns = [
    {
      title: t('defects.product'),
      dataIndex: 'product__name',
      key: 'product__name',
      render: (name: string, record: any) => (
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-xs text-gray-500">{record.product__sku}</div>
        </div>
      ),
    },
    {
      title: t('defects.count'),
      dataIndex: 'defect_count',
      key: 'defect_count',
    },
    {
      title: t('defects.totalQty'),
      dataIndex: 'defect_qty',
      key: 'defect_qty',
      render: (qty: number) => formatQuantity(qty),
    },
  ];

  const defectTypeColumns = [
    {
      title: t('defects.defectType'),
      dataIndex: 'type_name',
      key: 'type_name',
    },
    {
      title: t('defects.count'),
      dataIndex: 'count',
      key: 'count',
    },
    {
      title: t('defects.totalQty'),
      dataIndex: 'total_qty',
      key: 'total_qty',
      render: (qty: number) => formatQuantity(qty),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('defects.analytics')}</h1>
        <Space>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null])}
            format="DD.MM.YYYY"
          />
          <Button type="primary" onClick={fetchStatistics} loading={loading}>
            {t('common.refresh')}
          </Button>
        </Space>
      </div>

      {/* Summary Cards */}
      <Row gutter={16} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('defects.totalDefects')}
              value={statistics?.totals.total_defects || 0}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('defects.totalQty')}
              value={statistics?.totals.total_qty || 0}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('defects.repairableQty')}
              value={statistics?.totals.total_repairable || 0}
              prefix={<ToolOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('defects.nonRepairableQty')}
              value={statistics?.totals.total_non_repairable || 0}
              prefix={<DeleteOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tables */}
      <Row gutter={16} className="mb-6">
        <Col xs={24} lg={12}>
          <Card title={t('defects.byStatus')} loading={loading}>
            <Table
              columns={statusColumns}
              dataSource={statistics?.by_status || []}
              rowKey="status"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={t('defects.topDefectTypes')} loading={loading}>
            <Table
              columns={defectTypeColumns}
              dataSource={statistics?.by_defect_type?.slice(0, 10) || []}
              rowKey="type_name"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24}>
          <Card title={t('defects.topProducts')} loading={loading}>
            <Table
              columns={productColumns}
              dataSource={statistics?.by_product?.slice(0, 20) || []}
              rowKey="product__id"
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DefectAnalyticsPage;
