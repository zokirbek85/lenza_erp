import { useState } from 'react';
import { Select, Tag, Button, Space, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { CheckOutlined, SyncOutlined } from '@ant-design/icons';
import { updateOrderStatus } from '../services/orders';

interface OrderStatusProps {
  value: string;
  orderId: number;
  onStatusUpdated?: (orderId: number, newStatus: string) => void;
  canEdit?: boolean;
  allowedStatuses?: string[];
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

export const OrderStatus = ({ 
  value, 
  orderId, 
  onStatusUpdated, 
  canEdit = true, 
  allowedStatuses = [] 
}: OrderStatusProps) => {
  const { t } = useTranslation();
  const [selectedStatus, setSelectedStatus] = useState(value);
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const isEditable = canEdit && allowedStatuses.length > 0;

  const handleChange = (newStatus: string) => {
    if (newStatus === value) {
      setSelectedStatus(value);
      setIsDirty(false);
      return;
    }

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
      });

      const response = await updateOrderStatus(orderId, selectedStatus);

      console.log('Status update response:', {
        orderId,
        newStatus: selectedStatus,
        responseData: response,
      });

      message.success(t('orders.status.updated'));
      
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
      setSelectedStatus(value);
      setIsDirty(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Space className="flex items-center gap-2">
      <Select
        style={{ width: 160 }}
        value={selectedStatus}
        onChange={handleChange}
        disabled={!isEditable}
        popupMatchSelectWidth={false}
        onClick={(e) => e.stopPropagation()}
        className="transition-all duration-200"
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
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="btn btn-success btn-sm animate-scaleIn"
          type="button"
        >
          {loading ? (
            <>
              <SyncOutlined spin />
              <span className="ml-1">{t('common.saving', 'Saqlanmoqda...')}</span>
            </>
          ) : (
            <>
              <CheckOutlined />
              <span className="ml-1">{t('common.confirm')}</span>
            </>
          )}
        </button>
      )}
    </Space>
  );
};

export default OrderStatus;