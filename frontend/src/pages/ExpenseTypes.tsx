import { useEffect, useState } from "react"
import { useTranslation } from 'react-i18next';
import { Table, Card, Button, Modal, Form, Input, Switch, Space, message, Divider, Empty } from "antd"
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined } from "@ant-design/icons"
import http from '../app/http'

interface ExpenseCategory {
  id: number
  name: string
  description: string
  is_active: boolean
}

export default function ExpenseTypes() {
  const { t } = useTranslation();
  const [data, setData] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const [form] = Form.useForm()
  const [editing, setEditing] = useState<ExpenseCategory | null>(null)

  const fetchData = () => {
    setLoading(true)
    http
      .get("/expense-categories/")
      .then((res) => {
        // Array tekshiruvi - DRF paginated bo'lsa results dan olish
        const rawData = res.data
        const dataArray = Array.isArray(rawData) 
          ? rawData 
          : (Array.isArray(rawData?.results) ? rawData.results : [])
        setData(dataArray)
      })
      .catch((error) => {
        console.error('Fetch expense types error:', error)
        message.error(t('expenseTypes.messages.loadError'))
        setData([]) // Xatolik bo'lsa bo'sh array
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchData()
  }, [])

  const openModal = (record: ExpenseCategory | null = null) => {
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
          ? http.put(`/expense-categories/${editing.id}/`, values)
          : http.post("/expense-categories/", values)
        req
          .then(() => {
            message.success(t('expenseTypes.messages.saved'))
            setVisible(false)
            form.resetFields()
            fetchData()
          })
          .catch(() => {
            message.error(t('expenseTypes.messages.saveError'))
          })
      })
      .catch(() => {
        message.warning(t('expenseTypes.messages.fillRequired'))
      })
  }

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: t('expenseTypes.confirmDelete.title'),
      content: t('expenseTypes.confirmDelete.content'),
      okText: t('actions.yes'),
      cancelText: t('actions.no'),
      okButtonProps: { danger: true },
      onOk: () => {
        http
          .delete(`/expense-categories/${id}/`)
          .then(() => {
            message.success(t('expenseTypes.messages.deleted'))
            fetchData()
          })
          .catch(() => {
            message.error(t('expenseTypes.messages.deleteError'))
          })
      },
    })
  }

  return (
    <div>
      <Card>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
          <SettingOutlined style={{ fontSize: 24, marginRight: 8, color: "#1890ff" }} />
          <h2 style={{ margin: 0, fontSize: 20 }}>{t('expenseTypes.title')}</h2>
        </div>
        <Divider style={{ margin: "16px 0" }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} size="large">
          {t('expenseTypes.new')}
        </Button>
        <Table
          loading={loading}
          dataSource={data}
          rowKey="id"
          style={{ marginTop: 16 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={t('expenseTypes.noTypes')}
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
                  {t('expenseTypes.addFirst')}
                </Button>
              </Empty>
            )
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => t('table.total', { count: total }),
          }}
          columns={[
            {
              title: t('expenseTypes.table.name'),
              dataIndex: "name",
              key: "name",
              sorter: (a, b) => a.name.localeCompare(b.name),
            },
            {
              title: t('expenseTypes.table.description'),
              dataIndex: "description",
              key: "description",
              render: (text) => text || "-",
            },
            {
              title: t('expenseTypes.table.status'),
              dataIndex: "is_active",
              key: "is_active",
              width: 100,
              align: "center" as const,
              render: (val) => (val ? t('expenseTypes.status.active') : t('expenseTypes.status.inactive')),
              filters: [
                { text: t('expenseTypes.status.active'), value: true },
                { text: t('expenseTypes.status.inactive'), value: false },
              ],
              onFilter: (value, record) => record.is_active === value,
            },
            {
              title: t('table.actions'),
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
              {editing ? t('expenseTypes.editTitle') : t('expenseTypes.createTitle')}
            </div>
          }
          onOk={handleSave}
          onCancel={() => {
            setVisible(false)
            form.resetFields()
          }}
          okText={t('actions.save')}
          cancelText={t('actions.cancel')}
          width={600}
        >
          <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item
              label={t('expenseTypes.form.name')}
              name="name"
              rules={[{ required: true, message: t('expenseTypes.form.nameRequired') }]}
            >
              <Input placeholder={t('expenseTypes.form.namePlaceholder')} />
            </Form.Item>
            <Form.Item label={t('expenseTypes.form.description')} name="description">
              <Input.TextArea rows={3} placeholder={t('expenseTypes.form.descriptionPlaceholder')} />
            </Form.Item>
            <Form.Item label={t('expenseTypes.form.active')} name="is_active" valuePropName="checked">
              <Switch checkedChildren={t('expenseTypes.status.active')} unCheckedChildren={t('expenseTypes.status.inactive')} />
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    </div>
  )
}
