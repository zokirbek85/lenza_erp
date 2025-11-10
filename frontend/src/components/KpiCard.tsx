import { Card, Statistic, Tooltip, theme } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';
import { useTheme } from '../context/ThemeContext';

interface KpiCardProps {
  title: string;
  value: number | string;
  prefix?: string;
  suffix?: string;
  precision?: number;
  change?: number;
  tooltip?: string;
  icon?: ReactNode;
  loading?: boolean;
  valueStyle?: React.CSSProperties;
}

const KpiCard = ({
  title,
  value,
  prefix = '',
  suffix = '',
  precision = 2,
  change,
  tooltip,
  icon,
  loading = false,
  valueStyle,
}: KpiCardProps) => {
  const { token } = theme.useToken();
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  const trendIcon =
    change !== undefined && change !== 0 ? (
      change >= 0 ? (
        <ArrowUpOutlined style={{ color: '#52c41a', fontSize: '14px' }} />
      ) : (
        <ArrowDownOutlined style={{ color: '#ff4d4f', fontSize: '14px' }} />
      )
    ) : null;

  const cardContent = (
    <Card
      bordered={false}
      loading={loading}
      className="kpi-card group transition-all duration-300 hover:shadow-lg"
      style={{
        borderRadius: '16px',
        background: token.colorBgContainer,
        boxShadow: token.boxShadow,
        borderColor: token.colorBorder,
      }}
      bodyStyle={{ padding: '24px' }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p 
            className="m-0 text-xs uppercase tracking-widest"
            style={{ color: token.colorTextSecondary }}
          >
            {title}
          </p>
          <Statistic
            value={value}
            precision={precision}
            prefix={prefix}
            suffix={suffix}
            valueStyle={{
              fontSize: '28px',
              fontWeight: 600,
              color: token.colorText,
              marginTop: '8px',
              ...valueStyle,
            }}
          />
          {change !== undefined && (
            <div className="mt-2 flex items-center gap-1">
              {trendIcon}
              <span
                className="text-xs font-semibold"
                style={{
                  color: change >= 0 ? '#52c41a' : '#ff4d4f',
                }}
              >
                {Math.abs(change)}%
              </span>
              <span className="text-xs" style={{ color: token.colorTextTertiary }}>
                vs oxirgi oy
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div 
            className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-all group-hover:bg-amber-50 group-hover:text-amber-600"
            style={{
              backgroundColor: isDark ? '#2a2a2a' : '#f8fafc',
              color: token.colorTextSecondary,
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );

  return tooltip ? <Tooltip title={tooltip}>{cardContent}</Tooltip> : cardContent;
};

export default KpiCard;
