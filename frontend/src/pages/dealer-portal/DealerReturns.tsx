import { useEffect, useState } from 'react';
import { Table, Button, Typography, message, Tabs, Card, Row, Col, Tag } from 'antd';
import { DownloadOutlined, CalendarOutlined, DollarOutlined, FileTextOutlined, ShoppingOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import axios from 'axios';

const { Title, Text } = Typography;
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

  // Mobile card render for return documents
  const renderReturnCard = (returnDoc: Return) => (
    <Card
      key={returnDoc.id}
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
            <FileTextOutlined /> Qaytarish #{returnDoc.id}
          </Text>
        </div>
        <Tag color="orange">{returnDoc.status}</Tag>
      </div>

      <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
        <Col span={24}>
          <div style={{ padding: '8px', background: '#0f1419', borderRadius: '6px', border: '1px solid #2a3f5f' }}>
            <Text style={{ color: '#8f98a0', fontSize: '10px', display: 'block' }}>JAMI SUMMA</Text>
            <Text strong style={{ color: '#52c41a', fontSize: 'clamp(16px, 3.5vw, 18px)' }}>
              ${parseFloat(returnDoc.total_sum).toFixed(2)}
            </Text>
          </div>
        </Col>
      </Row>

      {returnDoc.general_comment && (
        <div style={{ marginBottom: 8, padding: '6px 8px', background: '#0f1419', borderRadius: '4px', border: '1px solid #2a3f5f' }}>
          <Text style={{ color: '#8f98a0', fontSize: '11px' }}>{returnDoc.general_comment}</Text>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px dashed #2a3f5f' }}>
        <Text style={{ color: '#8f98a0', fontSize: '12px' }}>
          <CalendarOutlined /> {new Date(returnDoc.created_at).toLocaleDateString('uz-UZ')}
        </Text>
      </div>
    </Card>
  );

  // Mobile card render for order returns
  const renderOrderReturnCard = (orderReturn: OrderReturn) => (
    <Card
      key={orderReturn.id}
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
            <ShoppingOutlined /> #{orderReturn.order_display_no}
          </Text>
          <div>
            <Text style={{ color: '#8f98a0', fontSize: '11px', display: 'block' }}>
              {orderReturn.product_name}
            </Text>
            <Text style={{ color: '#8f98a0', fontSize: '10px' }}>
              SKU: {orderReturn.product_sku}
            </Text>
          </div>
        </div>
        <Tag color={orderReturn.is_defect ? 'red' : 'blue'}>
          {orderReturn.is_defect ? 'Nuqsonli' : 'Normal'}
        </Tag>
      </div>

      <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
        <Col span={12}>
          <div style={{ padding: '8px', background: '#0f1419', borderRadius: '6px', border: '1px solid #2a3f5f' }}>
            <Text style={{ color: '#8f98a0', fontSize: '10px', display: 'block' }}>MIQDOR</Text>
            <Text strong style={{ color: '#66c0f4', fontSize: 'clamp(14px, 3vw, 16px)' }}>
              {parseFloat(orderReturn.quantity).toFixed(0)}
            </Text>
          </div>
        </Col>
        <Col span={12}>
          <div style={{ padding: '8px', background: '#0f1419', borderRadius: '6px', border: '1px solid #2a3f5f' }}>
            <Text style={{ color: '#8f98a0', fontSize: '10px', display: 'block' }}>USD</Text>
            <Text strong style={{ color: '#52c41a', fontSize: 'clamp(14px, 3vw, 16px)' }}>
              ${parseFloat(orderReturn.amount_usd).toFixed(2)}
            </Text>
          </div>
        </Col>
      </Row>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px dashed #2a3f5f' }}>
        <Text style={{ color: '#8f98a0', fontSize: '12px' }}>
          <CalendarOutlined /> {new Date(orderReturn.created_at).toLocaleDateString('uz-UZ')}
        </Text>
      </div>
    </Card>
  );

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
          {/* Desktop Table */}
          <div className="desktop-view">
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
          </div>

          {/* Mobile Cards */}
          <div className="mobile-view">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#8f98a0' }}>
                Loading...
              </div>
            ) : returns.length === 0 ? (
              <Card style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                border: '1px solid #2a3f5f',
                textAlign: 'center',
                padding: '40px'
              }}>
                <Text style={{ color: '#8f98a0' }}>Ma'lumot topilmadi</Text>
              </Card>
            ) : (
              returns.map(renderReturnCard)
            )}
          </div>
        </TabPane>
        <TabPane tab="Buyurtmadan qaytarishlar" key="2">
          {/* Desktop Table */}
          <div className="desktop-view">
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
          </div>

          {/* Mobile Cards */}
          <div className="mobile-view">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#8f98a0' }}>
                Loading...
              </div>
            ) : orderReturns.length === 0 ? (
              <Card style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                border: '1px solid #2a3f5f',
                textAlign: 'center',
                padding: '40px'
              }}>
                <Text style={{ color: '#8f98a0' }}>Ma'lumot topilmadi</Text>
              </Card>
            ) : (
              orderReturns.map(renderOrderReturnCard)
            )}
          </div>
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
