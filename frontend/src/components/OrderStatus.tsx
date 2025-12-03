import { useState } from 'react';
import { Select, Tag, Button, Space, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { CheckOutlined, SyncOutlined } from '@ant-design/icons';
import { updateOrderStatus } from '../services/orders';
import { useAuthStore } from '../auth/useAuthStore';

interface OrderStatusProps {
  value: string;
  orderId: number;
  onStatusUpdated?: (orderId: number, newStatus: string) => void;
  canEdit?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'created', color: 'default' },
  { value: 'confirmed', color: 'blue' },
  { value: 'packed', color: 'orange' },
  { value: 'shipped', color: 'purple' },
  { value: 'delivered', color: 'green' },
  { value: 'cancelled', color: 'red' },
  { value: 'returned', color: 'magenta' },
] as const;

// Rol bo'yicha ruxsatlar jadvali
const ROLE_PERMISSIONS: Record<string, string[]> = {
  sales: ['created', 'confirmed', 'cancelled'],
  warehouse: ['packed', 'shipped', 'delivered', 'returned'],
  accountant: STATUS_OPTIONS.map((s) => s.value),
  admin: STATUS_OPTIONS.map((s) => s.value),
  owner: STATUS_OPTIONS.map((s) => s.value),
};

export const OrderStatus = ({ value, orderId, onStatusUpdated, canEdit = true }: OrderStatusProps) => {
  const { t } = useTranslation();
  const { role } = useAuthStore();
  const [selectedStatus, setSelectedStatus] = useState(value);
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Foydalanuvchi roliga qarab ruxsat berilgan statuslar
  const allowedStatuses = ROLE_PERMISSIONS[role || ''] || [];

  // can_edit=false bo'lsa, hech narsa qilmaslik
  const isEditable = canEdit && allowedStatuses.length > 0;

  const handleChange = (newStatus: string) => {
    if (newStatus === value) {
      setSelectedStatus(value);
      setIsDirty(false);
      return;
    }

    // Ruxsat etilmagan status tanlansa
    if (!allowedStatuses.includes(newStatus)) {
      message.warning(t('orders.status.notAllowed'));
      setSelectedStatus(value);
      setIsDirty(false);
      return;
    }

    setSelectedStatus(newStatus);
    setIsDirty(newStatus !== value);
  };

  const handleConfirm = async () => {
    if (!orderId) {
      console.warn('No orderId passed to OrderStatus component');
      return;
    }

    // Oxirgi tekshiruv - ruxsat bormi?
    if (!allowedStatuses.includes(selectedStatus)) {
      message.warning(t('orders.status.notAllowed'));
      setSelectedStatus(value);
      setIsDirty(false);
      return;
    }

    setLoading(true);
    try {
      console.log('Updating order status:', {
        orderId,
        oldStatus: value,
        newStatus: selectedStatus,
        userRole: role,
      });

      const response = await updateOrderStatus(orderId, selectedStatus);

      console.log('Status update response:', {
        orderId,
        newStatus: selectedStatus,
        responseData: response,
      });

      message.success(t('orders.status.updated'));
      
      // Parent komponentga xabar berish
      if (onStatusUpdated) {
        onStatusUpdated(orderId, response?.status || selectedStatus);
      }
      
      setIsDirty(false);
    } catch (err) {
      console.error('Status update failed:', {
        orderId,
        oldStatus: value,
        newStatus: selectedStatus,
        error: err,
      });
      
      message.error(t('orders.status.updateFailed'));
      
      // Xatolik bo'lsa, eski statusga qaytarish
      setSelectedStatus(value);
      setIsDirty(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Space>
      <Select
        style={{ width: 160 }}
        value={selectedStatus}
        onChange={handleChange}
        disabled={!isEditable}
        popupMatchSelectWidth={false}
        onClick={(e) => e.stopPropagation()}
        options={STATUS_OPTIONS.map((s) => ({
          label: (
            <Tag
              color={s.color}
              style={{
                margin: 0,
                opacity: allowedStatuses.includes(s.value) ? 1 : 0.4,
              }}
            >
              {t(`order.status.${s.value}`, { defaultValue: s.value })}
            </Tag>
          ),
          value: s.value,
          disabled: !allowedStatuses.includes(s.value),
        }))}
      />
      {isDirty && allowedStatuses.includes(selectedStatus) && (
        <Button
          type="primary"
          size="small"
          icon={loading ? <SyncOutlined spin /> : <CheckOutlined />}
          loading={loading}
          onClick={handleConfirm}
        >
          {t('common.confirm')}
        </Button>
      )}
    </Space>
  );
};

export default OrderStatus;
