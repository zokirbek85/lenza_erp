import { useEffect, useState } from 'react';
import { Table, Button, Tag, Typography, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import axios from 'axios';

const { Title } = Typography;

interface Refund {
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

export default function DealerRefunds() {
  const [data, setData] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRefunds();
  }, []);

  const loadRefunds = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/dealer-portal/refunds/', {
        withCredentials: true,
      });
      setData(response.data.results || response.data);
    } catch (error) {
      message.error('Ma\'lumotlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    try {
      const response = await axios.get('/api/dealer-portal/refunds/export_pdf/', {
        responseType: 'blob',
        withCredentials: true,
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'refunds_report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();

      message.success('PDF yuklab olindi');
    } catch (error) {
      message.error('PDF yuklashda xatolik');
    }
  };

  const columns: ColumnsType<Refund> = [
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2}>Refundlar</Title>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={downloadPDF}
        >
          PDF yuklash
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="id"
      />
    </div>
  );
}
