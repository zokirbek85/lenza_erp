import { useEffect, useState } from "react"
import { Table, Card, Button, Modal, Form, Input, Switch, Space, message, Divider } from "antd"
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined } from "@ant-design/icons"
import http from '../app/http'

interface ExpenseType {
  id: number
  name: string
  description: string
  is_active: boolean
}

export default function ExpenseTypes() {
  const [data, setData] = useState<ExpenseType[]>([])
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const [form] = Form.useForm()
  const [editing, setEditing] = useState<ExpenseType | null>(null)

  const fetchData = () => {
    setLoading(true)
    http
      .get("/api/expense-types/")
      .then((res) => {
        setData(res.data)
      })
      .catch(() => {
        message.error("Ma'lumotlarni yuklashda xatolik")
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchData()
  }, [])

  const openModal = (record: ExpenseType | null = null) => {
    setEditing(record)
    form.setFieldsValue(
      record || {
        name: "",
        description: "",
        is_active: true,
      }
    )
    setVisible(true)
  }

  const handleSave = () => {
    form
      .validateFields()
      .then((values) => {
        const req = editing
          ? http.put(`/api/expense-types/${editing.id}/`, values)
          : http.post("/api/expense-types/", values)
        req
          .then(() => {
            message.success("Saqlash muvaffaqiyatli")
            setVisible(false)
            form.resetFields()
            fetchData()
          })
          .catch(() => {
            message.error("Saqlashda xatolik")
          })
      })
      .catch(() => {
        message.warning("Iltimos, barcha maydonlarni to'ldiring")
      })
  }

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: "O'chirishni tasdiqlaysizmi?",
      content: "Bu chiqim turini o'chirishni tasdiqlaysizmi?",
      okText: "Ha",
      cancelText: "Yo'q",
      okButtonProps: { danger: true },
      onOk: () => {
        http
          .delete(`/api/expense-types/${id}/`)
          .then(() => {
            message.success("O'chirildi")
            fetchData()
          })
          .catch(() => {
            message.error("O'chirishda xatolik")
          })
      },
    })
  }

  return (
    <div>
      <Card>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
          <SettingOutlined style={{ fontSize: 24, marginRight: 8, color: "#1890ff" }} />
          <h2 style={{ margin: 0, fontSize: 20 }}>Chiqim turlari boshqaruvi</h2>
        </div>
        <Divider style={{ margin: "16px 0" }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} size="large">
          Yangi tur qo'shish
        </Button>
        <Table
          loading={loading}
          dataSource={data}
          rowKey="id"
          style={{ marginTop: 16 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Jami: ${total} ta`,
          }}
          columns={[
            {
              title: "Nomi",
              dataIndex: "name",
              key: "name",
              sorter: (a, b) => a.name.localeCompare(b.name),
            },
            {
              title: "Tavsif",
              dataIndex: "description",
              key: "description",
              render: (text) => text || "-",
            },
            {
              title: "Holat",
              dataIndex: "is_active",
              key: "is_active",
              width: 100,
              align: "center" as const,
              render: (val) => (val ? "✅ Faol" : "❌ Faol emas"),
              filters: [
                { text: "Faol", value: true },
                { text: "Faol emas", value: false },
              ],
              onFilter: (value, record) => record.is_active === value,
            },
            {
              title: "Harakatlar",
              key: "actions",
              width: 150,
              align: "center" as const,
              render: (_, record) => (
                <Space>
                  <Button
                    type="primary"
                    ghost
                    icon={<EditOutlined />}
                    onClick={() => openModal(record)}
                  />
                  <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
                </Space>
              ),
            },
          ]}
        />

        <Modal
          open={visible}
          title={
            <div style={{ display: "flex", alignItems: "center" }}>
              <SettingOutlined style={{ marginRight: 8 }} />
              {editing ? "Chiqim turini tahrirlash" : "Yangi chiqim turi"}
            </div>
          }
          onOk={handleSave}
          onCancel={() => {
            setVisible(false)
            form.resetFields()
          }}
          okText="Saqlash"
          cancelText="Bekor qilish"
          width={600}
        >
          <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item
              label="Nomi"
              name="name"
              rules={[{ required: true, message: "Nom kiritish majburiy" }]}
            >
              <Input placeholder="Masalan: Transport, Maosh, Ofis xarajatlari" />
            </Form.Item>
            <Form.Item label="Tavsif" name="description">
              <Input.TextArea rows={3} placeholder="Chiqim turi haqida qo'shimcha ma'lumot" />
            </Form.Item>
            <Form.Item label="Faol" name="is_active" valuePropName="checked">
              <Switch checkedChildren="Faol" unCheckedChildren="Faol emas" />
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    </div>
  )
}
