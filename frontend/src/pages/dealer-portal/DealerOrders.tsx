import { useEffect, useState } from 'react';
import { Table, Button, Tag, Typography, Space, message, Card, Row, Col } from 'antd';
import { DownloadOutlined, CalendarOutlined, DollarOutlined, FileTextOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import axios from 'axios';

const { Title, Text } = Typography;

interface Order {
  id: number;
  display_no: string;
  status: string;
  total_usd: string;
  total_uzs: string;
  created_at: string;
  value_date: string;
}

const statusColors: Record<string, string> = {
  CREATED: 'blue',
  CONFIRMED: 'cyan',
  PACKED: 'purple',
  SHIPPED: 'orange',
  DELIVERED: 'green',
  CANCELLED: 'red',
  RETURNED: 'volcano',
};

export default function DealerOrders() {
  const [data, setData] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  useEffect(() => {
    loadOrders();
  }, [pagination.current]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/dealer-portal/orders/', {
        params: {
          page: pagination.current,
          page_size: pagination.pageSize,
        },
        withCredentials: true,
      });

      setData(response.data.results || response.data);
      if (response.data.count) {
        setPagination(prev => ({
          ...prev,
          total: response.data.count,
        }));
      }
    } catch (error: any) {
      message.error('Ma\'lumotlarni yuklashda xatolik');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async (id: number, displayNo: string) => {
    try {
      const response = await axios.get(`/api/dealer-portal/orders/${id}/pdf/`, {
        responseType: 'blob',
        withCredentials: true,
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `order_${displayNo}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      message.success('PDF yuklab olindi');
    } catch (error) {
      message.error('PDF yuklashda xatolik');
    }
  };

  const columns: ColumnsType<Order> = [
    {
      title: '№',
      dataIndex: 'display_no',
      key: 'display_no',
      width: 150,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Summa (USD)',
      dataIndex: 'total_usd',
      key: 'total_usd',
      width: 120,
      render: (val: string) => `$${parseFloat(val).toFixed(2)}`,
    },
    {
      title: 'Summa (UZS)',
      dataIndex: 'total_uzs',
      key: 'total_uzs',
      width: 150,
      render: (val: string) => parseFloat(val).toLocaleString('uz-UZ'),
    },
    {
      title: 'Sana',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (val: string) => new Date(val).toLocaleDateString('uz-UZ'),
    },
    {
      title: 'Amallar',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => downloadPDF(record.id, record.display_no)}
          >
            PDF
          </Button>
        </Space>
      ),
    },
  ];

  // Mobile card render
  const renderMobileCard = (order: Order) => (
    <Card
      key={order.id}
      style={{
        marginBottom: 16,
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        border: '1px solid #2a3f5f',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}
      bodyStyle={{ padding: 'clamp(12px, 3vw, 16px)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
        <div>
          <Text strong style={{ color: '#66c0f4', fontSize: 'clamp(14px, 3vw, 16px)' }}>
            <FileTextOutlined /> #{order.display_no}
          </Text>
        </div>
        <Tag color={statusColors[order.status] || 'default'}>{order.status}</Tag>
      </div>

      <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
        <Col span={12}>
          <div style={{ padding: '8px', background: '#0f1419', borderRadius: '6px', border: '1px solid #2a3f5f' }}>
            <Text style={{ color: '#8f98a0', fontSize: '10px', display: 'block' }}>USD</Text>
            <Text strong style={{ color: '#66c0f4', fontSize: 'clamp(14px, 3vw, 16px)' }}>
              ${parseFloat(order.total_usd).toFixed(2)}
            </Text>
          </div>
        </Col>
        <Col span={12}>
          <div style={{ padding: '8px', background: '#0f1419', borderRadius: '6px', border: '1px solid #2a3f5f' }}>
            <Text style={{ color: '#8f98a0', fontSize: '10px', display: 'block' }}>UZS</Text>
            <Text strong style={{ color: '#66c0f4', fontSize: 'clamp(12px, 2.5vw, 14px)' }}>
              {parseFloat(order.total_uzs).toLocaleString('uz-UZ')}
            </Text>
          </div>
        </Col>
      </Row>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px dashed #2a3f5f' }}>
        <Text style={{ color: '#8f98a0', fontSize: '12px' }}>
          <CalendarOutlined /> {new Date(order.created_at).toLocaleDateString('uz-UZ')}
        </Text>
        <Button
          type="primary"
          size="small"
          icon={<DownloadOutlined />}
          onClick={() => downloadPDF(order.id, order.display_no)}
          style={{ background: '#66c0f4', borderColor: '#66c0f4' }}
        >
          PDF
        </Button>
      </div>
    </Card>
  );

  return (
    <div style={{
      padding: 'clamp(12px, 3vw, 24px)',
      background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)',
      minHeight: '100vh'
    }}>
      <Title level={2} style={{ color: '#fff', marginBottom: 24, fontSize: 'clamp(20px, 4vw, 30px)' }}>Buyurtmalar</Title>

      {/* Desktop Table */}
      <div className="desktop-view">
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          pagination={{
            ...pagination,
            onChange: (page) => setPagination(prev => ({ ...prev, current: page })),
          }}
          scroll={{ x: 800 }}
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            borderRadius: 8,
            overflow: 'hidden'
          }}
          className="steam-table"
        />
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

      <style>{`
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
          color: #c7d5e0;
        }
        .steam-table .ant-pagination-item {
          background: #1a1a2e;
          border: 1px solid #2a3f5f;
        }
        .steam-table .ant-pagination-item a {
          color: #c7d5e0;
        }
        .steam-table .ant-pagination-item-active {
          background: #66c0f4;
          border-color: #66c0f4;
        }
        .steam-table .ant-pagination-item-active a {
          color: #1a1a2e;
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
      `}</style>
    </div>
  );
}
