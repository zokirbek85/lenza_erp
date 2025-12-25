import { useEffect, useState } from 'react';
import { Table, Button, Tag, Typography, message, Card, Row, Col } from 'antd';
import { DownloadOutlined, CalendarOutlined, BankOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import axios from 'axios';

const { Title, Text } = Typography;

interface Payment {
  id: number;
  date: string;
  amount: string;
  currency: string;
  amount_usd: string;
  amount_uzs: string;
  account_name: string;
  comment: string;
  status: string;
}

export default function DealerPayments() {
  const [data, setData] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/dealer-portal/payments/', {
        withCredentials: true,
      });
      setData(response.data.results || response.data);
    } catch (error) {
      message.error('Ma\'lumotlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const downloadAllPDF = async () => {
    try {
      const response = await axios.get('/api/dealer-portal/payments/export_pdf/', {
        responseType: 'blob',
        withCredentials: true,
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'payments_report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();

      message.success('PDF yuklab olindi');
    } catch (error) {
      message.error('PDF yuklashda xatolik');
    }
  };

  const columns: ColumnsType<Payment> = [
    {
      title: 'Sana',
      dataIndex: 'date',
      key: 'date',
      render: (val: string) => new Date(val).toLocaleDateString('uz-UZ'),
    },
    {
      title: 'Summa',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: string, record) => `${parseFloat(val).toFixed(2)} ${record.currency}`,
    },
    {
      title: 'USD',
      dataIndex: 'amount_usd',
      key: 'amount_usd',
      render: (val: string) => `$${parseFloat(val).toFixed(2)}`,
    },
    {
      title: 'UZS',
      dataIndex: 'amount_uzs',
      key: 'amount_uzs',
      render: (val: string) => parseFloat(val).toLocaleString('uz-UZ'),
    },
    {
      title: 'Hisob',
      dataIndex: 'account_name',
      key: 'account_name',
    },
    {
      title: 'Izoh',
      dataIndex: 'comment',
      key: 'comment',
      render: (val: string) => val || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'APPROVED' ? 'green' : 'orange';
        return <Tag color={color}>{status}</Tag>;
      },
    },
  ];

  // Mobile card render
  const renderMobileCard = (payment: Payment) => (
    <Card
      key={payment.id}
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
            <BankOutlined /> {payment.account_name}
          </Text>
        </div>
        <Tag color={payment.status === 'APPROVED' ? 'green' : 'orange'}>{payment.status}</Tag>
      </div>

      <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
        <Col span={12}>
          <div style={{ padding: '8px', background: '#0f1419', borderRadius: '6px', border: '1px solid #2a3f5f' }}>
            <Text style={{ color: '#8f98a0', fontSize: '10px', display: 'block' }}>USD</Text>
            <Text strong style={{ color: '#52c41a', fontSize: 'clamp(14px, 3vw, 16px)' }}>
              ${parseFloat(payment.amount_usd).toFixed(2)}
            </Text>
          </div>
        </Col>
        <Col span={12}>
          <div style={{ padding: '8px', background: '#0f1419', borderRadius: '6px', border: '1px solid #2a3f5f' }}>
            <Text style={{ color: '#8f98a0', fontSize: '10px', display: 'block' }}>UZS</Text>
            <Text strong style={{ color: '#52c41a', fontSize: 'clamp(12px, 2.5vw, 14px)' }}>
              {parseFloat(payment.amount_uzs).toLocaleString('uz-UZ')}
            </Text>
          </div>
        </Col>
      </Row>

      {payment.comment && (
        <div style={{ marginBottom: 8, padding: '6px 8px', background: '#0f1419', borderRadius: '4px', border: '1px solid #2a3f5f' }}>
          <Text style={{ color: '#8f98a0', fontSize: '11px' }}>{payment.comment}</Text>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px dashed #2a3f5f' }}>
        <Text style={{ color: '#8f98a0', fontSize: '12px' }}>
          <CalendarOutlined /> {new Date(payment.date).toLocaleDateString('uz-UZ')}
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
        <Title level={2} style={{ color: '#fff', margin: 0, fontSize: 'clamp(20px, 4vw, 30px)' }}>To'lovlar</Title>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={downloadAllPDF}
          style={{
            background: 'linear-gradient(135deg, #66c0f4 0%, #4a9fd8 100%)',
            border: 'none',
            fontWeight: 600,
            height: 40,
            boxShadow: '0 4px 12px rgba(102, 192, 244, 0.3)'
          }}
        >
          <span className="pdf-button-text">Barchani PDF yuklash</span>
          <span className="pdf-button-text-short" style={{ display: 'none' }}>PDF</span>
        </Button>
      </div>

      {/* Desktop Table */}
      <div className="desktop-view">
        <Table
          columns={columns}
          dataSource={data}
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
          data.map(renderMobileCard)
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

        @media (max-width: 576px) {
          .pdf-button-text {
            display: none;
          }
          .pdf-button-text-short {
            display: inline !important;
          }
        }
      `}</style>
    </div>
  );
}
