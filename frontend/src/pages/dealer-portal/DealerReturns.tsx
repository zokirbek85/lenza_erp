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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2}>Qaytarishlar</Title>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={downloadPDF}
        >
          PDF yuklash
        </Button>
      </div>

      <Tabs defaultActiveKey="1">
        <TabPane tab="Qaytarish hujjatlari" key="1">
          <Table
            columns={returnColumns}
            dataSource={returns}
            loading={loading}
            rowKey="id"
          />
        </TabPane>
        <TabPane tab="Buyurtmadan qaytarishlar" key="2">
          <Table
            columns={orderReturnColumns}
            dataSource={orderReturns}
            loading={loading}
            rowKey="id"
          />
        </TabPane>
      </Tabs>
    </div>
  );
}
