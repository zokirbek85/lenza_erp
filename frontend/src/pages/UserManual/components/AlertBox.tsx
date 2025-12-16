import { Alert } from 'antd';
import type { ReactNode } from 'react';
import {
  CheckCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';

interface AlertBoxProps {
  type: 'success' | 'info' | 'warning' | 'error';
  icon?: ReactNode;
  children: ReactNode;
  title?: string;
  className?: string;
}

const AlertBox = ({ type, icon, children, title, className = '' }: AlertBoxProps) => {
  const defaultIcons = {
    success: <CheckCircleOutlined style={{ fontSize: '18px' }} />,
    info: <InfoCircleOutlined style={{ fontSize: '18px' }} />,
    warning: <WarningOutlined style={{ fontSize: '18px' }} />,
    error: <CloseCircleOutlined style={{ fontSize: '18px' }} />,
  };

  const emojiIcons = {
    success: '✅',
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
  };

  return (
    <Alert
      type={type}
      showIcon
      icon={icon || defaultIcons[type]}
      message={
        <div className="alert-box-content">
          {title && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{emojiIcons[type]}</span>
              <strong className="text-base">{title}</strong>
            </div>
          )}
          <div className="text-sm">{children}</div>
        </div>
      }
      className={`my-4 rounded-lg ${className}`}
      style={{
        borderRadius: '8px',
      }}
    />
  );
};

export default AlertBox;
