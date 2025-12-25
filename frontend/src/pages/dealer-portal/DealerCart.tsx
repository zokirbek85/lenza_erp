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
  Row,
  Col,
} from 'antd';
import {
  ShoppingCartOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  SendOutlined,
  ClearOutlined,
  AppstoreOutlined,
  DollarOutlined,
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

  // Mobile card render for cart items
  const renderCartItemCard = (item: CartItem) => (
    <Card
      key={item.id}
      style={{
        marginBottom: 16,
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        border: '1px solid #2a3f5f',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}
      bodyStyle={{ padding: 'clamp(12px, 3vw, 16px)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <Text strong style={{ color: '#66c0f4', fontSize: 'clamp(14px, 3vw, 16px)' }}>
            <AppstoreOutlined /> {item.product_name}
          </Text>
          <div>
            <Text style={{ color: '#8f98a0', fontSize: '11px', display: 'block' }}>
              SKU: {item.product_sku}
            </Text>
          </div>
        </div>
        <Popconfirm
          title="O'chirish"
          description="Mahsulotni savatchadan o'chirishni xohlaysizmi?"
          onConfirm={() => handleRemoveItem(item.id)}
          okText="Ha"
          cancelText="Yo'q"
        >
          <Button
            danger
            icon={<DeleteOutlined />}
            size="small"
            type="text"
          />
        </Popconfirm>
      </div>

      <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
        <Col span={12}>
          <div style={{ padding: '8px', background: '#0f1419', borderRadius: '6px', border: '1px solid #2a3f5f' }}>
            <Text style={{ color: '#8f98a0', fontSize: '10px', display: 'block' }}>NARX</Text>
            <Text strong style={{ color: '#66c0f4', fontSize: 'clamp(14px, 3vw, 16px)' }}>
              ${Number(item.product_price).toFixed(2)}
            </Text>
          </div>
        </Col>
        <Col span={12}>
          <div style={{ padding: '8px', background: '#0f1419', borderRadius: '6px', border: '1px solid #2a3f5f' }}>
            <Text style={{ color: '#8f98a0', fontSize: '10px', display: 'block' }}>JAMI</Text>
            <Text strong style={{ color: '#52c41a', fontSize: 'clamp(14px, 3vw, 16px)' }}>
              ${Number(item.subtotal).toFixed(2)}
            </Text>
          </div>
        </Col>
      </Row>

      <div style={{ paddingTop: 8, borderTop: '1px dashed #2a3f5f' }}>
        <Text style={{ color: '#8f98a0', fontSize: '11px', display: 'block', marginBottom: 8 }}>
          MIQDOR
        </Text>
        <InputNumber
          min={0.01}
          max={item.product_stock}
          step={1}
          value={item.quantity}
          onChange={(value) => value && handleUpdateQuantity(item.id, value)}
          addonAfter={item.product_unit}
          style={{ width: '100%' }}
        />
      </div>
    </Card>
  );

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <div
      style={{
        padding: 'clamp(12px, 3vw, 24px)',
        background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 'clamp(16px, 3vw, 24px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 2vw, 16px)', marginBottom: 16 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/dealer-portal/products')}
            style={{
              background: '#16213e',
              borderColor: '#2a3f5f',
              color: '#66c0f4',
            }}
          >
            <span className="btn-text">Orqaga</span>
          </Button>
          <Title level={2} style={{ color: '#fff', margin: 0, fontSize: 'clamp(18px, 4vw, 30px)' }}>
            <ShoppingCartOutlined /> Savatcha
          </Title>
        </div>
        {!isEmpty && (
          <div style={{ display: 'flex', gap: 'clamp(8px, 2vw, 12px)', flexWrap: 'wrap' }}>
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
                <span className="btn-text">Tozalash</span>
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
          {/* Desktop Cart Items Table */}
          <div className="desktop-view">
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
          </div>

          {/* Mobile Cart Items */}
          <div className="mobile-view" style={{ marginBottom: 24 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#8f98a0' }}>
                Loading...
              </div>
            ) : (
              cart.items.map(renderCartItemCard)
            )}
          </div>

          {/* Cart Summary */}
          <Card
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              border: '1px solid #2a3f5f',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'clamp(12px, 3vw, 40px)', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 auto', minWidth: '100px', textAlign: 'center' }}>
                <Text style={{ color: '#c7d5e0', fontSize: 'clamp(12px, 2.5vw, 16px)' }}>
                  Mahsulotlar soni:
                </Text>
                <br />
                <Text strong style={{ color: '#66c0f4', fontSize: 'clamp(16px, 3.5vw, 20px)' }}>
                  {cart.total_items} ta
                </Text>
              </div>
              <div style={{ flex: '1 1 auto', minWidth: '100px', textAlign: 'center' }}>
                <Text style={{ color: '#c7d5e0', fontSize: 'clamp(12px, 2.5vw, 16px)' }}>
                  Jami miqdor:
                </Text>
                <br />
                <Text strong style={{ color: '#66c0f4', fontSize: 'clamp(16px, 3.5vw, 20px)' }}>
                  {Number(cart.total_quantity).toFixed(2)}
                </Text>
              </div>
              <div style={{ flex: '1 1 auto', minWidth: '100px', textAlign: 'center' }}>
                <Text style={{ color: '#c7d5e0', fontSize: 'clamp(12px, 2.5vw, 16px)' }}>
                  Jami summa:
                </Text>
                <br />
                <Text strong style={{ color: '#52c41a', fontSize: 'clamp(18px, 4vw, 24px)' }}>
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
          font-size: clamp(12px, 2.5vw, 14px);
          padding: clamp(8px, 2vw, 16px);
        }
        .steam-table .ant-table-tbody > tr > td {
          background: transparent;
          color: #c7d5e0;
          border-bottom: 1px solid #2a3f5f;
          font-size: clamp(11px, 2.5vw, 14px);
          padding: clamp(8px, 2vw, 16px);
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
          .btn-text {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
