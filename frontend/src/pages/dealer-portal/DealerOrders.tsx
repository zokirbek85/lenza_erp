import { useEffect, useState } from 'react';
import { Table, Button, Tag, Typography, Space, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import axios from 'axios';

const { Title } = Typography;

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

  return (
    <div style={{
      padding: 'clamp(12px, 3vw, 24px)',
      background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)',
      minHeight: '100vh'
    }}>
      <Title level={2} style={{ color: '#fff', marginBottom: 24, fontSize: 'clamp(20px, 4vw, 30px)' }}>Buyurtmalar</Title>

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
      `}</style>
    </div>
  );
}
