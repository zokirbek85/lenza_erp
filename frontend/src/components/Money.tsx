import { Typography } from 'antd';
import React from 'react';
import { formatCurrency } from '../utils/formatters';

export interface MoneyProps {
  value: number | string | null | undefined;
  currency?: string; // e.g. 'USD', 'UZS'
  className?: string;
  strong?: boolean;
}

const Money: React.FC<MoneyProps> = ({ value, currency = 'USD', className, strong }) => {
  const content = formatCurrency(value as any, currency);
  if (strong) {
    return (
      <Typography.Text className={className} strong>
        {content}
      </Typography.Text>
    );
  }
  return <Typography.Text className={className}>{content}</Typography.Text>;
};

export default Money;
