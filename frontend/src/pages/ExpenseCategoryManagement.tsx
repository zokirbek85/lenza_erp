import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { message, Modal, Table, Button, Input, Form, ColorPicker, Space, Tag, Popconfirm, Select, Checkbox } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, BarChartOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../auth/useAuthStore';

import {
  getExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  getExpenseCategoryStatistics,
} from '../api/finance';
import type { ExpenseCategory, ExpenseCategoryCreate, ExpenseCategoryStatistics } from '../types/finance';

// Emoji picker - simple input for now
const EmojiInput = ({ value, onChange }: { value?: string; onChange?: (val: string) => void }) => (
  <Input 
    value={value}
    onChange={(e) => onChange?.(e.target.value)}
    placeholder="Emoji tanlang (masalan: 💰)"
    maxLength={10}
    style={{ fontSize: '1.5rem' }}
  />
);

export default function ExpenseCategoryManagement() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const role = useAuthStore((s) => s.role);
  const [filterMode, setFilterMode] = useState<'all' | 'global' | 'mine'>('all');
  const [statistics, setStatistics] = useState<ExpenseCategoryStatistics[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await getExpenseCategories();
      // Handle both array and paginated response
      const responseData: any = response.data;
      const data = Array.isArray(responseData) ? responseData : (responseData?.results || []);
      setCategories(data);
    } catch (error: any) {
      message.error(t('common.loadError', 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const response = await getExpenseCategoryStatistics();
      // Handle both array and paginated response
      const responseData: any = response.data;
      const data = Array.isArray(responseData) ? responseData : (responseData?.results || []);
      setStatistics(data);
      setStatsModalVisible(true);
    } catch (error: any) {
      message.error(t('common.loadError', 'Failed to load statistics'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCategory(null);
    form.resetFields();
    form.setFieldsValue({
      color: '#6B7280',
      icon: '📁',
      is_active: true,
      is_global: false,
    });
    setModalVisible(true);
  };

  const handleEdit = (category: ExpenseCategory) => {
    setEditingCategory(category);
    form.setFieldsValue({
      name: category.name,
      color: category.color,
      icon: category.icon,
      is_active: category.is_active,
      is_global: category.is_global,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteExpenseCategory(id);
      message.success(t('common.deleteSuccess', 'Successfully deleted'));
      loadCategories();
    } catch (error: any) {
      if (error.response?.data?.detail) {
        message.error(error.response.data.detail);
      } else {
        message.error(t('common.deleteError', 'Failed to delete'));
      }
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // Convert Color object to hex string
      const colorValue = values.color;
      const hexColor = typeof colorValue === 'object' && colorValue?.toHexString 
        ? colorValue.toHexString() 
        : colorValue;

      const data: ExpenseCategoryCreate = {
        name: values.name,
        color: hexColor,
        icon: values.icon || '📁',
        is_active: values.is_active !== false,
      };

      if (editingCategory) {
        await updateExpenseCategory(editingCategory.id, data);
        message.success(t('common.updateSuccess', 'Successfully updated'));
      } else {
        await createExpenseCategory(data);
        message.success(t('common.createSuccess', 'Successfully created'));
      }

      setModalVisible(false);
      form.resetFields();
      loadCategories();
    } catch (error: any) {
      if (error.response?.data) {
        const errors = error.response.data;
        Object.keys(errors).forEach(key => {
          message.error(`${key}: ${errors[key]}`);
        });
      } else {
        message.error(t('common.saveError', 'Failed to save'));
      }
    }
  };

  const columns: ColumnsType<ExpenseCategory> = [
    {
      title: t('expenseCategory.icon', 'Belgi'),
      dataIndex: 'icon',
      key: 'icon',
      width: 80,
      render: (icon: string) => <span style={{ fontSize: '1.5rem' }}>{icon}</span>,
    },
    {
      title: t('expenseCategory.name', 'Nomi'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Space>
          <span>{name}</span>
          {record.is_global && <Tag color="green">{t('expenseCategory.global', 'Global')}</Tag>}
          {!record.is_active && <Tag color="red">{t('common.inactive', 'Inactive')}</Tag>}
        </Space>
      ),
    },
    {
      title: t('expenseCategory.color', 'Rang'),
      dataIndex: 'color',
      key: 'color',
      width: 100,
      render: (color: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, backgroundColor: color, borderRadius: 4, border: '1px solid #d9d9d9' }} />
          <span style={{ fontSize: '0.75rem', color: '#666' }}>{color}</span>
        </div>
      ),
    },
    {
      title: t('expenseCategory.usage', 'Foydalanish'),
      dataIndex: 'usage_count',
      key: 'usage_count',
      width: 120,
      render: (count: number) => <Tag color={count > 0 ? 'blue' : 'default'}>{count} ta</Tag>,
    },
    {
      title: t('common.actions', 'Amallar'),
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          {record.can_edit ? (
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              {t('common.edit', 'Edit')}
            </Button>
          ) : (
            <Button type="link" disabled icon={<EditOutlined />}>{t('common.edit', 'Edit')}</Button>
          )}

          <Popconfirm
            title={t('common.confirmDelete', 'Are you sure to delete this?')}
            description={
              record.usage_count > 0 
                ? t('expenseCategory.deleteWarning', `This category is used in ${record.usage_count} transactions`)
                : undefined
            }
            onConfirm={() => handleDelete(record.id)}
            okText={t('common.yes', 'Yes')}
            cancelText={t('common.no', 'No')}
          >
            {record.can_delete ? (
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
              >
                {t('common.delete', 'Delete')}
              </Button>
            ) : (
              <Button type="link" disabled danger icon={<DeleteOutlined />}>{t('common.delete', 'Delete')}</Button>
            )}
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const statsColumns: ColumnsType<ExpenseCategoryStatistics> = [
    {
      title: t('expenseCategory.icon', 'Belgi'),
      dataIndex: 'icon',
      key: 'icon',
      width: 60,
      render: (icon: string) => <span style={{ fontSize: '1.5rem' }}>{icon}</span>,
    },
    {
      title: t('expenseCategory.name', 'Kategoriya'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('expenseCategory.transactions', 'Operatsiyalar'),
      dataIndex: 'transaction_count',
      key: 'transaction_count',
      width: 120,
      render: (count: number) => <Tag color="blue">{count} ta</Tag>,
    },
    {
      title: t('expenseCategory.totalUZS', 'Jami UZS'),
      dataIndex: 'total_uzs',
      key: 'total_uzs',
      width: 150,
      render: (amount: number) => new Intl.NumberFormat('en-US').format(amount),
    },
    {
      title: t('expenseCategory.totalUSD', 'Jami USD'),
      dataIndex: 'total_usd',
      key: 'total_usd',
      width: 150,
      render: (amount: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(amount),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('expenseCategory.title', 'Chiqim Kategoriyalari')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('expenseCategory.subtitle', 'Chiqim kategoriyalarini boshqaring')}
          </p>
        </div>
        <Space>
          <Button
            icon={<BarChartOutlined />}
            onClick={loadStatistics}
          >
            {t('expenseCategory.statistics', 'Statistika')}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            {t('expenseCategory.create', 'Yangi Kategoriya')}
          </Button>
        </Space>
      </div>

      <div className="mb-4">
        <Space>
          <Select value={filterMode} onChange={(v: any) => setFilterMode(v)} options={[
            { label: t('common.all', 'All'), value: 'all' },
            { label: t('expenseCategory.globalFilter', 'Global'), value: 'global' },
            { label: t('expenseCategory.mineFilter', 'My Categories'), value: 'mine' },
          ]} />
        </Space>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <Table
          columns={columns}
          dataSource={categories.filter(c => {
            if (filterMode === 'all') return true;
            if (filterMode === 'global') return c.is_global === true;
            return c.is_global !== true; // mine
          })}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `${t('common.total', 'Total')}: ${total}`,
          }}
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        title={editingCategory ? t('expenseCategory.edit', 'Kategoriyani tahrirlash') : t('expenseCategory.create', 'Yangi kategoriya')}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        okText={t('common.save', 'Save')}
        cancelText={t('common.cancel', 'Cancel')}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 24 }}
        >
          <Form.Item
            label={t('expenseCategory.name', 'Nomi')}
            name="name"
            rules={[
              { required: true, message: t('expenseCategory.nameRequired', 'Name is required') },
              { min: 3, message: t('expenseCategory.nameMinLength', 'Name must be at least 3 characters') },
            ]}
          >
            <Input placeholder={t('expenseCategory.namePlaceholder', 'Masalan: Maosh')} />
          </Form.Item>

          <Form.Item
            label={t('expenseCategory.icon', 'Belgi (Emoji)')}
            name="icon"
            rules={[
              { required: true, message: t('expenseCategory.iconRequired', 'Icon is required') },
            ]}
          >
            <EmojiInput />
          </Form.Item>

          <Form.Item
            label={t('expenseCategory.color', 'Rang')}
            name="color"
            rules={[
              { required: true, message: t('expenseCategory.colorRequired', 'Color is required') },
            ]}
          >
            <ColorPicker 
              showText
              format="hex"
              presets={[
                {
                  label: 'Recommended',
                  colors: [
                    '#6B7280', '#3B82F6', '#8B5CF6', '#F59E0B', '#10B981',
                    '#EF4444', '#EC4899', '#6366F1', '#F97316', '#14B8A6',
                  ],
                },
              ]}
            />
          </Form.Item>

          <Form.Item
            label={t('expenseCategory.status', 'Holat')}
            name="is_active"
            valuePropName="checked"
          >
            <Space>
              <input type="checkbox" />
              <span>{t('expenseCategory.active', 'Faol')}</span>
            </Space>
          </Form.Item>

          {role && ['admin', 'accountant', 'owner'].includes(role) && (
            <Form.Item
              label={t('expenseCategory.globalLabel', 'Global category')}
              name="is_global"
              valuePropName="checked"
            >
              <Checkbox>{t('expenseCategory.makeGlobal', 'Visible to all users (admin only)')}</Checkbox>
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Statistics Modal */}
      <Modal
        title={t('expenseCategory.statistics', 'Kategoriya Statistikasi')}
        open={statsModalVisible}
        onCancel={() => setStatsModalVisible(false)}
        footer={null}
        width={800}
      >
        <Table
          columns={statsColumns}
          dataSource={statistics}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Modal>
    </div>
  );
}
