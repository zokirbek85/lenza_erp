import { useEffect, useState } from 'react';
import { Modal, Table, Tag, Spin, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import axios from 'axios';
import dayjs from 'dayjs';

interface Movement {
  date: string;
  type: string;
  type_label: string;
  quantity: number;
  delta: number;
  reference: string;
  dealer?: string;
  balance_before: number;
  balance_after: number;
  created_at?: string;
  previous_ok?: number;
  new_ok?: number;
  previous_defect?: number;
  new_defect?: number;
  created_by?: string;
  status?: string;
}

interface MovementsData {
  product_id: number;
  product_name: string;
  current_stock_ok: number;
  current_stock_defect: number;
  movements: Movement[];
}

interface ProductMovementsModalProps {
  productId: number | null;
  productName?: string;
  onClose: () => void;
}

export default function ProductMovementsModal({ productId, onClose }: ProductMovementsModalProps) {
  const [data, setData] = useState<MovementsData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (productId) {
      fetchMovements();
    }
  }, [productId]);

  const fetchMovements = async () => {
    if (!productId) return;

    setLoading(true);
    try {
      const response = await axios.get(`/api/products/${productId}/movements/`, {
        withCredentials: true,
      });
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sale':
        return 'red';
      case 'order_return':
      case 'return':
        return 'orange';
      case 'adjustment':
        return 'purple';
      case 'receipt':
        return 'green';
      default:
        return 'default';
    }
  };

  const columns: ColumnsType<Movement> = [
    {
      title: 'Sana',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('DD.MM.YYYY') : '-',
    },
    {
      title: 'Turi',
      dataIndex: 'type_label',
      key: 'type',
      width: 150,
      render: (label: string, record: Movement) => (
        <Tag color={getTypeColor(record.type)}>{label}</Tag>
      ),
    },
    {
      title: 'Miqdor',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'right',
      render: (qty: number) => qty.toFixed(2),
    },
    {
      title: 'O\'zgarish',
      dataIndex: 'delta',
      key: 'delta',
      width: 100,
      align: 'right',
      render: (delta: number) => (
        <span style={{ color: delta >= 0 ? '#52c41a' : '#f5222d' }}>
          {delta >= 0 ? '+' : ''}{delta.toFixed(2)}
        </span>
      ),
    },
    {
      title: 'Qoldiq (oldin)',
      dataIndex: 'balance_before',
      key: 'balance_before',
      width: 120,
      align: 'right',
      render: (balance: number) => balance?.toFixed(2) || '0.00',
    },
    {
      title: 'Qoldiq (keyin)',
      dataIndex: 'balance_after',
      key: 'balance_after',
      width: 120,
      align: 'right',
      render: (balance: number) => <strong>{balance?.toFixed(2) || '0.00'}</strong>,
    },
    {
      title: 'Ma\'lumotnoma',
      dataIndex: 'reference',
      key: 'reference',
      ellipsis: true,
      render: (ref: string, record: Movement) => (
        <div>
          <div>{ref}</div>
          {record.dealer && <div style={{ fontSize: 12, color: '#888' }}>{record.dealer}</div>}
          {record.created_by && <div style={{ fontSize: 12, color: '#888' }}>Kiritgan: {record.created_by}</div>}
        </div>
      ),
    },
  ];

  return (
    <Modal
      title={
        <div>
          <div>Mahsulot harakati</div>
          {data && (
            <div style={{ fontSize: 14, fontWeight: 'normal', marginTop: 4, color: '#666' }}>
              {data.product_name}
            </div>
          )}
        </div>
      }
      open={!!productId}
      onCancel={onClose}
      width={1200}
      footer={null}
      style={{ top: 20 }}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" tip="Yuklanmoqda..." />
        </div>
      ) : data ? (
        <div>
          <div style={{
            display: 'flex',
            gap: 24,
            marginBottom: 16,
            padding: 16,
            background: '#f5f5f5',
            borderRadius: 8
          }}>
            <div>
              <div style={{ fontSize: 12, color: '#666' }}>Hozirgi qoldiq (yaxshi)</div>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: '#52c41a' }}>
                {data.current_stock_ok.toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#666' }}>Hozirgi qoldiq (nuqsonli)</div>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: '#faad14' }}>
                {data.current_stock_defect.toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#666' }}>Jami harakatlar</div>
              <div style={{ fontSize: 20, fontWeight: 'bold' }}>
                {data.movements.length}
              </div>
            </div>
          </div>

          {data.movements.length > 0 ? (
            <Table
              columns={columns}
              dataSource={data.movements}
              rowKey={(_, index) => `movement-${index}`}
              pagination={{
                pageSize: 20,
                showSizeChanger: false,
                showTotal: (total) => `Jami: ${total} ta harakat`,
              }}
              scroll={{ x: 1000 }}
              size="small"
            />
          ) : (
            <Empty description="Harakatlar topilmadi" />
          )}
        </div>
      ) : (
        <Empty description="Ma'lumot topilmadi" />
      )}
    </Modal>
  );
}
