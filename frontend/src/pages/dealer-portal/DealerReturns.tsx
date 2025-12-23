import { useEffect, useState } from 'react';
import { Table, Button, Typography, message, Tabs } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import axios from 'axios';

const { Title } = Typography;
const { TabPane } = Tabs;

interface Return {
  id: number;
  created_at: string;
  general_comment: string;
  status: string;
  total_sum: string;
}

interface OrderReturn {
  id: number;
  order_display_no: string;
  product_name: string;
  product_sku: string;
  quantity: string;
  is_defect: boolean;
  amount_usd: string;
  amount_uzs: string;
  created_at: string;
}

export default function DealerReturns() {
  const [returns, setReturns] = useState<Return[]>([]);
  const [orderReturns, setOrderReturns] = useState<OrderReturn[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReturns();
    loadOrderReturns();
  }, []);

  const loadReturns = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/dealer-portal/returns/', {
        withCredentials: true,
      });
      setReturns(response.data.results || response.data);
    } catch (error) {
      message.error('Ma\'lumotlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const loadOrderReturns = async () => {
    try {
      const response = await axios.get('/api/dealer-portal/returns/order_returns/', {
        withCredentials: true,
      });
      setOrderReturns(response.data);
    } catch (error) {
      console.error('Failed to load order returns');
    }
  };

  const downloadPDF = async () => {
    try {
      const response = await axios.get('/api/dealer-portal/returns/export_pdf/', {
        responseType: 'blob',
        withCredentials: true,
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'returns_report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();

      message.success('PDF yuklab olindi');
    } catch (error) {
      message.error('PDF yuklashda xatolik');
    }
  };

  const returnColumns: ColumnsType<Return> = [
    {
      title: 'Sana',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (val: string) => new Date(val).toLocaleDateString('uz-UZ'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: 'Jami summa',
      dataIndex: 'total_sum',
      key: 'total_sum',
      render: (val: string) => parseFloat(val).toFixed(2),
    },
    {
      title: 'Izoh',
      dataIndex: 'general_comment',
      key: 'general_comment',
      render: (val: string) => val || '-',
    },
  ];

  const orderReturnColumns: ColumnsType<OrderReturn> = [
    {
      title: 'Buyurtma',
      dataIndex: 'order_display_no',
      key: 'order_display_no',
    },
    {
      title: 'Mahsulot',
      dataIndex: 'product_name',
      key: 'product_name',
    },
    {
      title: 'SKU',
      dataIndex: 'product_sku',
      key: 'product_sku',
    },
    {
      title: 'Miqdor',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (val: string) => parseFloat(val).toFixed(0),
    },
    {
      title: 'Nuqsonli',
      dataIndex: 'is_defect',
      key: 'is_defect',
      render: (val: boolean) => val ? 'Ha' : 'Yo\'q',
    },
    {
      title: 'USD',
      dataIndex: 'amount_usd',
      key: 'amount_usd',
      render: (val: string) => `$${parseFloat(val).toFixed(2)}`,
    },
    {
      title: 'Sana',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (val: string) => new Date(val).toLocaleDateString('uz-UZ'),
    },
  ];

  return (
    <div style={{
      padding: 'clamp(12px, 3vw, 24px)',
      background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)',
      minHeight: '100vh'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <Title level={2} style={{ color: '#fff', margin: 0, fontSize: 'clamp(20px, 4vw, 30px)' }}>Qaytarishlar</Title>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={downloadPDF}
          style={{
            background: 'linear-gradient(135deg, #66c0f4 0%, #4a9fd8 100%)',
            border: 'none',
            fontWeight: 600,
            height: 40,
            boxShadow: '0 4px 12px rgba(102, 192, 244, 0.3)'
          }}
        >
          PDF yuklash
        </Button>
      </div>

      <Tabs
        defaultActiveKey="1"
        className="steam-tabs"
      >
        <TabPane tab="Qaytarish hujjatlari" key="1">
          <Table
            columns={returnColumns}
            dataSource={returns}
            loading={loading}
            rowKey="id"
            scroll={{ x: 600 }}
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              borderRadius: 8,
              overflow: 'hidden'
            }}
            className="steam-table"
          />
        </TabPane>
        <TabPane tab="Buyurtmadan qaytarishlar" key="2">
          <Table
            columns={orderReturnColumns}
            dataSource={orderReturns}
            loading={loading}
            rowKey="id"
            scroll={{ x: 800 }}
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              borderRadius: 8,
              overflow: 'hidden'
            }}
            className="steam-table"
          />
        </TabPane>
      </Tabs>

      <style>{`
        .steam-tabs .ant-tabs-nav {
          margin-bottom: 24px;
        }
        .steam-tabs .ant-tabs-tab {
          color: #8f98a0;
          font-weight: 600;
        }
        .steam-tabs .ant-tabs-tab:hover {
          color: #66c0f4;
        }
        .steam-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #66c0f4;
        }
        .steam-tabs .ant-tabs-ink-bar {
          background: #66c0f4;
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
      `}</style>
    </div>
  );
}
