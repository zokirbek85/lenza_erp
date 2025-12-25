import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Table,
  Typography,
  message,
  Popconfirm,
  InputNumber,
  Empty,
  Modal,
  Input,
} from 'antd';
import {
  ShoppingCartOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  SendOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  submitOrder,
  type Cart,
  type CartItem,
} from '../../api/dealer-cart';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function DealerCart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderNote, setOrderNote] = useState('');

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    setLoading(true);
    try {
      const data = await getCart();
      setCart(data);
    } catch (error: any) {
      message.error('Savatchani yuklashda xatolik');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (itemId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      message.error('Miqdor 0 dan katta bo\'lishi kerak');
      return;
    }

    try {
      await updateCartItem(itemId, newQuantity);
      message.success('Miqdor yangilandi');
      await loadCart();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.response?.data?.quantity || 'Xatolik yuz berdi';
      message.error(errorMsg);
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    try {
      const result = await removeCartItem(itemId);
      message.success(result.message);
      await loadCart();
    } catch (error: any) {
      message.error('O\'chirishda xatolik');
    }
  };

  const handleClearCart = async () => {
    try {
      const result = await clearCart();
      message.success(result.message);
      await loadCart();
    } catch (error: any) {
      message.error('Tozalashda xatolik');
    }
  };

  const handleSubmitOrder = async () => {
    setSubmitting(true);
    try {
      const result = await submitOrder({ note: orderNote });
      message.success(result.message);
      Modal.success({
        title: 'Buyurtma muvaffaqiyatli yaratildi',
        content: `Buyurtma raqami: ${result.order_number}`,
        onOk: () => {
          navigate('/dealer-portal/orders');
        },
      });
      setIsOrderModalOpen(false);
      setOrderNote('');
      await loadCart();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Buyurtma yaratishda xatolik';
      message.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<CartItem> = [
    {
      title: 'SKU',
      dataIndex: 'product_sku',
      key: 'product_sku',
      width: 120,
    },
    {
      title: 'Mahsulot',
      dataIndex: 'product_name',
      key: 'product_name',
    },
    {
      title: 'Narx',
      dataIndex: 'product_price',
      key: 'product_price',
      width: 120,
      align: 'right',
      render: (price: number | string) => (
        <Text style={{ color: '#66c0f4', fontWeight: 'bold' }}>
          ${Number(price).toFixed(2)}
        </Text>
      ),
    },
    {
      title: 'Miqdor',
      key: 'quantity',
      width: 180,
      align: 'center',
      render: (_: any, record: CartItem) => (
        <InputNumber
          min={0.01}
          max={record.product_stock}
          step={1}
          value={record.quantity}
          onChange={(value) => value && handleUpdateQuantity(record.id, value)}
          addonAfter={record.product_unit}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Jami',
      dataIndex: 'subtotal',
      key: 'subtotal',
      width: 120,
      align: 'right',
      render: (subtotal: number | string) => (
        <Text strong style={{ color: '#52c41a', fontSize: '16px' }}>
          ${Number(subtotal).toFixed(2)}
        </Text>
      ),
    },
    {
      title: '',
      key: 'action',
      width: 80,
      align: 'center',
      render: (_: any, record: CartItem) => (
        <Popconfirm
          title="O'chirish"
          description="Mahsulotni savatchadan o'chirishni xohlaysizmi?"
          onConfirm={() => handleRemoveItem(record.id)}
          okText="Ha"
          cancelText="Yo'q"
        >
          <Button
            danger
            icon={<DeleteOutlined />}
            type="text"
          />
        </Popconfirm>
      ),
    },
  ];

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <div
      style={{
        padding: 24,
        background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/dealer-portal/products')}
            style={{
              background: '#16213e',
              borderColor: '#2a3f5f',
              color: '#66c0f4',
            }}
          >
            Orqaga
          </Button>
          <Title level={2} style={{ color: '#fff', margin: 0 }}>
            <ShoppingCartOutlined /> Savatcha
          </Title>
        </div>
        {!isEmpty && (
          <div style={{ display: 'flex', gap: 12 }}>
            <Popconfirm
              title="Tozalash"
              description="Barcha mahsulotlarni savatchadan o'chirmoqchimisiz?"
              onConfirm={handleClearCart}
              okText="Ha"
              cancelText="Yo'q"
            >
              <Button
                icon={<ClearOutlined />}
                danger
                style={{
                  background: '#e74c3c',
                  borderColor: '#e74c3c',
                  color: '#fff',
                }}
              >
                Tozalash
              </Button>
            </Popconfirm>
            <Button
              type="primary"
              size="large"
              icon={<SendOutlined />}
              onClick={() => setIsOrderModalOpen(true)}
              style={{
                background: '#52c41a',
                borderColor: '#52c41a',
                fontWeight: 'bold',
              }}
            >
              Buyurtma berish
            </Button>
          </div>
        )}
      </div>

      {/* Cart Content */}
      {isEmpty ? (
        <Card
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            border: '1px solid #2a3f5f',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            textAlign: 'center',
            padding: '60px 24px',
          }}
        >
          <Empty
            description={
              <Text style={{ color: '#c7d5e0', fontSize: '18px' }}>
                Savatcha bo'sh
              </Text>
            }
          >
            <Button
              type="primary"
              size="large"
              onClick={() => navigate('/dealer-portal/products')}
              style={{
                background: '#66c0f4',
                borderColor: '#66c0f4',
                marginTop: 16,
              }}
            >
              Mahsulotlarga o'tish
            </Button>
          </Empty>
        </Card>
      ) : (
        <>
          {/* Cart Items Table */}
          <Card
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              border: '1px solid #2a3f5f',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              marginBottom: 24,
            }}
            className="steam-table"
          >
            <Table
              columns={columns}
              dataSource={cart.items}
              rowKey="id"
              loading={loading}
              pagination={false}
              scroll={{ x: 800 }}
            />
          </Card>

          {/* Cart Summary */}
          <Card
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              border: '1px solid #2a3f5f',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 40 }}>
              <div>
                <Text style={{ color: '#c7d5e0', fontSize: '16px' }}>
                  Mahsulotlar soni:
                </Text>
                <br />
                <Text strong style={{ color: '#66c0f4', fontSize: '20px' }}>
                  {cart.total_items} ta
                </Text>
              </div>
              <div>
                <Text style={{ color: '#c7d5e0', fontSize: '16px' }}>
                  Jami miqdor:
                </Text>
                <br />
                <Text strong style={{ color: '#66c0f4', fontSize: '20px' }}>
                  {Number(cart.total_quantity).toFixed(2)}
                </Text>
              </div>
              <div>
                <Text style={{ color: '#c7d5e0', fontSize: '16px' }}>
                  Jami summa:
                </Text>
                <br />
                <Text strong style={{ color: '#52c41a', fontSize: '24px' }}>
                  ${Number(cart.total_amount).toFixed(2)}
                </Text>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Submit Order Modal */}
      <Modal
        title="Buyurtma berish"
        open={isOrderModalOpen}
        onOk={handleSubmitOrder}
        onCancel={() => setIsOrderModalOpen(false)}
        confirmLoading={submitting}
        okText="Yuborish"
        cancelText="Bekor qilish"
        okButtonProps={{
          style: { background: '#52c41a', borderColor: '#52c41a' },
        }}
      >
        <div style={{ padding: '16px 0' }}>
          <div style={{ marginBottom: 16 }}>
            <Text strong>Mahsulotlar soni:</Text> {cart?.total_items} ta
          </div>
          <div style={{ marginBottom: 16 }}>
            <Text strong>Jami summa:</Text> ${cart?.total_amount ? Number(cart.total_amount).toFixed(2) : '0.00'}
          </div>
          <div>
            <Text strong>Izoh (ixtiyoriy):</Text>
            <TextArea
              rows={4}
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              placeholder="Buyurtma haqida qo'shimcha ma'lumot..."
              style={{ marginTop: 8 }}
            />
          </div>
        </div>
      </Modal>

      {/* Styles */}
      <style>{`
        .steam-table .ant-card-body {
          padding: 0;
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
