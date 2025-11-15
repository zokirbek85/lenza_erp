import React, { memo } from 'react';
import { Card, Tag } from 'antd';
import {
  ShoppingCartOutlined,
  CreditCardOutlined,
  RollbackOutlined,
  DollarOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export interface NotificationItemProps {
  id: number;
  title: string;
  message: string;
  created_at: string;
  level?: string;
  type?: string;
  is_read?: boolean;
  onClick?: () => void;
}

const typeConfig: Record<string, { color: string; Icon: React.ReactNode }> = {
  order: { color: 'blue', Icon: <ShoppingCartOutlined /> },
  payment: { color: 'green', Icon: <CreditCardOutlined /> },
  return: { color: 'red', Icon: <RollbackOutlined /> },
  currency: { color: 'gold', Icon: <DollarOutlined /> },
  default: { color: 'default', Icon: <InfoCircleOutlined /> },
};

const NotificationItem = memo((props: NotificationItemProps) => {
  const { title, message, created_at, type, is_read, onClick } = props;
  const cfg = typeConfig[type ?? 'default'];
  return (
    <Card
      size="small"
      variant="borderless"
      className="notification-item hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="text-lg mt-0.5" aria-label={type}>{cfg.Icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900 dark:text-white truncate">{title}</span>
            <Tag color={cfg.color} className="m-0 text-[10px] uppercase tracking-wider">
              {type ?? 'info'}
            </Tag>
            {!is_read && (
              <Tag color="red" className="m-0 text-[10px]" aria-label="new">New</Tag>
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-1 break-words">{message}</p>
          <span className="text-[10px] uppercase tracking-widest text-slate-400">
            {dayjs(created_at).fromNow()}
          </span>
        </div>
      </div>
    </Card>
  );
});

export default NotificationItem;
