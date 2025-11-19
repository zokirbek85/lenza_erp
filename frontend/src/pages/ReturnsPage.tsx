import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Form, Input, Modal, Select, Space, Table, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

import http from '../app/http';
import { downloadFile } from '../utils/download';
import { formatDate, formatQuantity } from '../utils/formatters';
import ReturnItemRow from '../components/returns/ReturnItemRow';

interface OrderOption {
  id: number;
  display_no: string;
}

interface OrderItem {
  id: number;
  product: number;
  product_name: string;
  qty: string;
}

interface ReturnItem {
  product_id: number;
  quantity: number;
  comment: string;
}

interface ReturnRecord {
  id: number;
  order: number;
  order_display_no?: string;
  items: Array<{
    product_name: string;
    quantity: string;
    comment: string;
  }>;
  comment: string;
  created_at: string;
}

const ReturnsPage = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [itemIndexes, setItemIndexes] = useState<number[]>([0]);

  const orderOptions = useMemo(
    () => orders.map((order) => ({ label: order.display_no, value: order.id })),
    [orders]
  );

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const response = await http.get('/api/returns/');
      const payload = response.data;
      const list: ReturnRecord[] = Array.isArray(payload) ? payload : (payload.results || []);
      setReturns(list);
    } catch (error) {
      console.error('Error fetching returns:', error);
      message.error(t('returns.messages.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await http.get('/api/orders/', { params: { limit: 'all' } });
      const payload = response.data;
      const list: OrderOption[] = Array.isArray(payload) ? payload : payload.results || [];
      setOrders(list);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchOrderItems = async (orderId: number) => {
    try {
      const response = await http.get(`/api/orders/${orderId}/`);
      const order = response.data;
      if (order && order.items) {
        setOrderItems(order.items);
      }
    } catch (error) {
      console.error(error);
      message.error(t('returns.messages.orderLoadError'));
    }
  };

  useEffect(() => {
    fetchReturns();
    fetchOrders();
  }, []);

  const handleOrderChange = (orderId: number) => {
    setSelectedOrderId(orderId);
    fetchOrderItems(orderId);
    setItemIndexes([0]);
    form.setFieldsValue({ items: [{}] });
  };

  const handleAddItem = () => {
    const newIndex = itemIndexes.length > 0 ? Math.max(...itemIndexes) + 1 : 0;
    setItemIndexes([...itemIndexes, newIndex]);
  };

  const handleRemoveItem = (index: number) => {
    if (itemIndexes.length > 1) {
      setItemIndexes(itemIndexes.filter(i => i !== index));
      const currentItems = form.getFieldValue('items') || [];
      const newItems = currentItems.filter((_: any, i: number) => i !== index);
      form.setFieldsValue({ items: newItems });
    }
  };

  const selectedProducts = useMemo(() => {
    const items = form.getFieldValue('items') || [];
    return items.map((item: ReturnItem) => item?.product_id).filter(Boolean);
  }, [form]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const payload = {
        order_id: selectedOrderId,
        comment: values.comment || '',
        items: values.items.filter((item: ReturnItem) => item?.product_id && item?.quantity)
      };
      
      await http.post('/api/returns/', payload);
      message.success(t('returns.messages.created'));
      setModalOpen(false);
      form.resetFields();
      setSelectedOrderId(null);
      setOrderItems([]);
      setItemIndexes([0]);
      fetchReturns();
    } catch (error: any) {
      console.error(error);
      const errorMsg = error?.response?.data?.message || t('returns.messages.createError');
      message.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleModalOpen = () => {
    setModalOpen(true);
    setSelectedOrderId(null);
    setOrderItems([]);
    setItemIndexes([0]);
    form.resetFields();
  };

  const handleExportPdf = () => {
      downloadFile('/api/returns/export/pdf/', 'returns_report.pdf');
  };

  const handleExportExcel = () => {
      downloadFile('/api/returns/export/excel/', 'returns.xlsx');
  };

  const columns: ColumnsType<ReturnRecord> = [
    {
      title: t('returns.table.order'),
      dataIndex: 'order_display_no',
      render: (value: string | null, record) => value || `Order #${record.order}`,
    },
    {
      title: t('returns.table.items'),
      dataIndex: 'items',
      render: (items: ReturnRecord['items']) => (
        <div>
          {items.map((item, idx) => (
            <div key={idx}>
              {item.product_name} × {formatQuantity(item.quantity)}
              {item.comment && <span className="text-slate-500 text-xs ml-2">({item.comment})</span>}
            </div>
          ))}
        </div>
      ),
    },
    {
      title: t('returns.table.comment'),
      dataIndex: 'comment',
      render: (value: string | null) => value || '—',
    },
    {
      title: t('returns.table.date'),
      dataIndex: 'created_at',
      render: (value: string) => formatDate(value),
    },
  ];

  return (
    <Card
      title={t('returns.title')}
      className="rounded-2xl border border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      extra={
        <Space>
          <Button onClick={handleExportPdf}>{t('actions.exportPdf')}</Button>
          <Button onClick={handleExportExcel}>{t('actions.exportExcel')}</Button>
          <Button type="primary" onClick={handleModalOpen}>
            {t('returns.new')}
          </Button>
        </Space>
      }
    >
      <Table<ReturnRecord>
        rowKey="id"
        columns={columns}
        dataSource={returns}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={t('returns.createTitle')}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setSelectedOrderId(null);
          setOrderItems([]);
          setItemIndexes([0]);
          form.resetFields();
        }}
        okText={t('actions.save')}
        cancelText={t('actions.cancel')}
        confirmLoading={submitting}
        onOk={() => form.submit()}
        destroyOnHidden
        width={900}
      >
        <Form layout="vertical" form={form} onFinish={handleSubmit}>
          <Form.Item 
            name="order_id" 
            label={t('returns.form.order')} 
            rules={[{ required: true, message: t('returns.form.orderRequired') }]}
          >
            <Select
              showSearch
              placeholder={t('returns.form.selectOrder')}
              options={orderOptions}
              optionFilterProp="label"
              onChange={handleOrderChange}
            />
          </Form.Item>

          {selectedOrderId && orderItems.length > 0 && (
            <>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">{t('returns.form.items')}</label>
                  <Button 
                    type="dashed" 
                    onClick={handleAddItem}
                    icon={<PlusOutlined />}
                    size="small"
                  >
                    {t('returns.form.addItem')}
                  </Button>
                </div>
                
                <div className="space-y-3">
                  <Form.List name="items">
                    {() => (
                      <>
                        {itemIndexes.map((index) => (
                          <ReturnItemRow
                            key={index}
                            index={index}
                            orderItems={orderItems}
                            selectedProducts={selectedProducts}
                            onRemove={handleRemoveItem}
                          />
                        ))}
                      </>
                    )}
                  </Form.List>
                </div>
              </div>

              <Form.Item name="comment" label={t('returns.form.generalComment')}>
                <Input.TextArea rows={2} placeholder={t('returns.form.commentPlaceholder')} />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </Card>
  );
};

export default ReturnsPage;
