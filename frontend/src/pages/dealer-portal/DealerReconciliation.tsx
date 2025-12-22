import { useState } from 'react';
import { Card, DatePicker, Button, Table, Typography, Space, message, Statistic, Row, Col } from 'antd';
import { DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs, { Dayjs } from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

interface ReconciliationData {
  dealer: string;
  dealer_code: string;
  period: string;
  opening_balance: number;
  closing_balance: number;
  orders: Array<{
    date: string;
    order_no: string;
    amount_usd: number;
    exchange_rate?: number;
  }>;
  payments: Array<{
    date: string;
    method: string;
    amount_usd: number;
    exchange_rate?: number;
  }>;
  returns: Array<{
    date: string;
    order_no: string;
    amount_usd: number;
  }>;
  totals: {
    orders: number;
    payments: number;
    returns: number;
  };
}

export default function DealerReconciliation() {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [data, setData] = useState<ReconciliationData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!dateRange) {
      message.error('Sanani tanlang');
      return;
    }

    setLoading(true);
    try {
      const [fromDate, toDate] = dateRange;
      const response = await axios.get('/api/dealer-portal/reconciliation/', {
        params: {
          from_date: fromDate.format('YYYY-MM-DD'),
          to_date: toDate.format('YYYY-MM-DD'),
        },
        withCredentials: true,
      });
      setData(response.data);
    } catch (error) {
      console.error('Failed to load reconciliation:', error);
      message.error('Ma\'lumotlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!dateRange) {
      message.error('Sanani tanlang');
      return;
    }

    try {
      const [fromDate, toDate] = dateRange;
      const response = await axios.get('/api/dealer-portal/reconciliation/pdf/', {
        params: {
          from_date: fromDate.format('YYYY-MM-DD'),
          to_date: toDate.format('YYYY-MM-DD'),
        },
        responseType: 'blob',
        withCredentials: true,
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `akt_sverka_${fromDate.format('YYYY-MM-DD')}_${toDate.format('YYYY-MM-DD')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success('PDF yuklab olindi');
    } catch (error) {
      console.error('Failed to download PDF:', error);
      message.error('PDF yuklab olishda xatolik');
    }
  };

  const orderColumns = [
    {
      title: 'Sana',
      dataIndex: 'date',
      key: 'date',
      render: (val: string) => new Date(val).toLocaleDateString('uz-UZ'),
    },
    {
      title: 'Buyurtma №',
      dataIndex: 'order_no',
      key: 'order_no',
    },
    {
      title: 'Summa (USD)',
      dataIndex: 'amount_usd',
      key: 'amount_usd',
      render: (val: number) => `$${val.toFixed(2)}`,
    },
    {
      title: 'Kurs',
      dataIndex: 'exchange_rate',
      key: 'exchange_rate',
      render: (val: number) => val ? val.toFixed(2) : '-',
    },
  ];

  const paymentColumns = [
    {
      title: 'Sana',
      dataIndex: 'date',
      key: 'date',
      render: (val: string) => new Date(val).toLocaleDateString('uz-UZ'),
    },
    {
      title: 'To\'lov turi',
      dataIndex: 'method',
      key: 'method',
    },
    {
      title: 'Summa (USD)',
      dataIndex: 'amount_usd',
      key: 'amount_usd',
      render: (val: number) => `$${val.toFixed(2)}`,
    },
  ];

  const returnColumns = [
    {
      title: 'Sana',
      dataIndex: 'date',
      key: 'date',
      render: (val: string) => new Date(val).toLocaleDateString('uz-UZ'),
    },
    {
      title: 'Buyurtma №',
      dataIndex: 'order_no',
      key: 'order_no',
    },
    {
      title: 'Summa (USD)',
      dataIndex: 'amount_usd',
      key: 'amount_usd',
      render: (val: number) => `$${val.toFixed(2)}`,
    },
  ];

  return (
    <div style={{
      padding: 24,
      background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)',
      minHeight: '100vh'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' }}>
        <Title level={2} style={{ color: '#fff', margin: 0 }}>Akt Sverka</Title>
      </div>

      <Card
        style={{
          marginBottom: 24,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          border: '1px solid #2a3f5f',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}
      >
        <Space size="middle" style={{ width: '100%', justifyContent: 'space-between' }}>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs])}
            format="DD.MM.YYYY"
            style={{ width: 300 }}
          />
          <Space>
            <Button
              type="primary"
              icon={<FileTextOutlined />}
              onClick={fetchData}
              loading={loading}
              style={{
                background: 'linear-gradient(135deg, #66c0f4 0%, #4a9fd8 100%)',
                border: 'none',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(102, 192, 244, 0.3)'
              }}
            >
              Ko'rsatish
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={downloadPDF}
              disabled={!data}
              style={{
                background: data ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : undefined,
                color: data ? '#fff' : undefined,
                border: 'none',
                fontWeight: 600,
              }}
            >
              PDF yuklash
            </Button>
          </Space>
        </Space>
      </Card>

      {data && (
        <>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col xs={24} md={12} lg={6}>
              <Card
                style={{
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                  border: '1px solid #2a3f5f',
                  borderLeft: '4px solid #3498db',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                }}
              >
                <Statistic
                  title={<span style={{ color: '#8f98a0' }}>Boshlang'ich qoldiq</span>}
                  value={data.opening_balance}
                  precision={2}
                  prefix="$"
                  valueStyle={{ color: '#66c0f4', fontSize: 24 }}
                />
              </Card>
            </Col>
            <Col xs={24} md={12} lg={6}>
              <Card
                style={{
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                  border: '1px solid #2a3f5f',
                  borderLeft: '4px solid #e74c3c',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                }}
              >
                <Statistic
                  title={<span style={{ color: '#8f98a0' }}>Buyurtmalar</span>}
                  value={data.totals.orders}
                  precision={2}
                  prefix="$"
                  valueStyle={{ color: '#e74c3c', fontSize: 24 }}
                />
              </Card>
            </Col>
            <Col xs={24} md={12} lg={6}>
              <Card
                style={{
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                  border: '1px solid #2a3f5f',
                  borderLeft: '4px solid #10b981',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                }}
              >
                <Statistic
                  title={<span style={{ color: '#8f98a0' }}>To'lovlar</span>}
                  value={data.totals.payments}
                  precision={2}
                  prefix="$"
                  valueStyle={{ color: '#10b981', fontSize: 24 }}
                />
              </Card>
            </Col>
            <Col xs={24} md={12} lg={6}>
              <Card
                style={{
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                  border: '1px solid #2a3f5f',
                  borderLeft: '4px solid #e74c3c',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                }}
              >
                <Statistic
                  title={<span style={{ color: '#8f98a0' }}>Yakuniy qoldiq</span>}
                  value={data.closing_balance}
                  precision={2}
                  prefix="$"
                  valueStyle={{
                    color: data.closing_balance > 0 ? '#e74c3c' : '#66c0f4',
                    fontSize: 24,
                    fontWeight: 'bold'
                  }}
                />
              </Card>
            </Col>
          </Row>

          {data.orders && data.orders.length > 0 && (
            <Card
              title={<span style={{ color: '#66c0f4' }}>Buyurtmalar</span>}
              style={{
                marginBottom: 24,
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                border: '1px solid #2a3f5f',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
              }}
              className="steam-table"
            >
              <Table
                columns={orderColumns}
                dataSource={data.orders}
                rowKey={(_, index) => `order-${index}`}
                pagination={false}
                style={{ background: 'transparent' }}
              />
            </Card>
          )}

          {data.payments && data.payments.length > 0 && (
            <Card
              title={<span style={{ color: '#66c0f4' }}>To'lovlar</span>}
              style={{
                marginBottom: 24,
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                border: '1px solid #2a3f5f',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
              }}
              className="steam-table"
            >
              <Table
                columns={paymentColumns}
                dataSource={data.payments}
                rowKey={(_, index) => `payment-${index}`}
                pagination={false}
                style={{ background: 'transparent' }}
              />
            </Card>
          )}

          {data.returns && data.returns.length > 0 && (
            <Card
              title={<span style={{ color: '#66c0f4' }}>Qaytarishlar</span>}
              style={{
                marginBottom: 24,
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                border: '1px solid #2a3f5f',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
              }}
              className="steam-table"
            >
              <Table
                columns={returnColumns}
                dataSource={data.returns}
                rowKey={(_, index) => `return-${index}`}
                pagination={false}
                style={{ background: 'transparent' }}
              />
            </Card>
          )}
        </>
      )}

      <style>{`
        .steam-table .ant-card-head {
          background: #16213e;
          border-bottom: 1px solid #2a3f5f;
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
