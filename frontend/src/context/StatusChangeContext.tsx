import { createContext, useContext, type ReactNode } from 'react';
import { Modal, message } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import http from '../app/http';

interface StatusChangeContextValue {
  showStatusChangeModal: (
    oldStatus: string,
    newStatus: string,
    recordId: number,
    onConfirm?: (updatedStatus: string) => void
  ) => void;
}

const StatusChangeContext = createContext<StatusChangeContextValue | null>(null);

interface StatusChangeProviderProps {
  children: ReactNode;
}

export const StatusChangeProvider = ({ children }: StatusChangeProviderProps) => {
  const { t } = useTranslation();

  const showStatusChangeModal = (
    oldStatus: string,
    newStatus: string,
    recordId: number,
    onConfirm?: (updatedStatus: string) => void
  ) => {
    const oldStatusLabel = t(`order.status.${oldStatus}`, { defaultValue: oldStatus });
    const newStatusLabel = t(`order.status.${newStatus}`, { defaultValue: newStatus });

    Modal.confirm({
      title: t('order.confirm_change_title'),
      icon: <ExclamationCircleOutlined />,
      content: t('order.confirm_change_message', {
        oldStatus: oldStatusLabel,
        newStatus: newStatusLabel,
      }),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okButtonProps: { type: 'primary' },
      onOk: async () => {
        try {
          console.log('Status change request:', {
            recordId,
            oldStatus,
            newStatus,
          });

          const response = await http.patch(`/api/orders/${recordId}/status/`, {
            status: newStatus,
          });

          console.log('Status update response:', {
            recordId,
            newStatus,
            responseStatus: response.status,
            responseData: response.data,
          });

          message.success(t('order.status_updated_success'));

          // Callback chaqirish - yangilangan statusni qaytarish
          if (onConfirm) {
            const updatedStatus = response.data?.status || newStatus;
            onConfirm(updatedStatus);
          }
        } catch (err) {
          console.error('Status update failed:', {
            recordId,
            oldStatus,
            newStatus,
            error: err,
          });
          message.error(t('order.status_update_failed'));
        }
      },
      onCancel: () => {
        console.log('Status change cancelled:', {
          recordId,
          oldStatus,
          newStatus,
        });
      },
    });
  };

  return (
    <StatusChangeContext.Provider value={{ showStatusChangeModal }}>
      {children}
    </StatusChangeContext.Provider>
  );
};

export const useStatusChange = () => {
  const context = useContext(StatusChangeContext);
  if (!context) {
    throw new Error('useStatusChange must be used within StatusChangeProvider');
  }
  return context;
};
