import { useEffect, useState } from 'react';
import { Table, Modal, Form, Input, Button, Space, message, Switch, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import http from '../../app/http';

interface PaymentCard {
  id: number;
  name: string;
  number: string;
  holder_name: string;
  is_active: boolean;
  created_at: string;
  masked_number?: string;
}

export default function CompanyCardsPage() {
  const [data, setData] = useState<PaymentCard[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<PaymentCard>();
  const [loading, setLoading] = useState(false);

  const fetchCards = async () => {
    setLoading(true);
    try {
  const res = await http.get('/api/payment-cards/');
      setData(res.data?.results ?? res.data ?? []);
    } catch (e) {
      console.error(e);
      message.error("Karta ro'yxatini olishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleAdd = async (values: any) => {
    try {
  await http.post('/api/payment-cards/', values);
      message.success("Karta qo'shildi");
      setOpen(false);
      form.resetFields();
      fetchCards();
    } catch (e) {
      console.error(e);
      message.error("Karta qo'shishda xatolik");
    }
  };

  const handleUpdate = async (id: number, values: Partial<PaymentCard>) => {
    try {
  await http.patch(`/api/payment-cards/${id}/`, values);
      message.success('Yangilandi');
      fetchCards();
    } catch (e) {
      console.error(e);
      message.error('Yangilashda xatolik');
    }
  };

  const handleDelete = async (id: number) => {
    try {
  await http.delete(`/api/payment-cards/${id}/`);
      message.success("O'chirildi");
      fetchCards();
    } catch (e) {
      console.error(e);
      message.error("O'chirishda xatolik");
    }
  };

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<PlusOutlined />} type="primary" onClick={() => setOpen(true)}>
          Karta qo'shish
        </Button>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={[
          { title: 'Nomi', dataIndex: 'name' },
          {
            title: 'Raqami',
            dataIndex: 'number',
            render: (_: any, record: PaymentCard) => record.masked_number || `${record.number?.slice(0,4)} **** ${record.number?.slice(-4)}`,
          },
          { title: "Foydalanuvchi", dataIndex: 'holder_name' },
          {
            title: 'Faol',
            dataIndex: 'is_active',
            render: (value: boolean, record: PaymentCard) => (
              <Switch checked={value} onChange={(checked) => handleUpdate(record.id, { is_active: checked })} />
            ),
          },
          {
            title: 'Amallar',
            render: (_: any, record: PaymentCard) => (
              <Space>
                <Popconfirm title="Haqiqatan ham o'chirishni xohlaysizmi?" onConfirm={() => handleDelete(record.id)}>
                  <Button danger>O'chirish</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <Modal open={open} onCancel={() => setOpen(false)} title="Yangi karta" footer={null} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleAdd}>
          <Form.Item name="name" label="Karta nomi" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="number" label="Karta raqami" rules={[{ required: true }]}>
            <Input placeholder="8600 1234 5678 9876" />
          </Form.Item>
          <Form.Item name="holder_name" label="Foydalanuvchi" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="is_active" label="Faollik" initialValue={true} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            Saqlash
          </Button>
        </Form>
      </Modal>
    </>
  );
}
