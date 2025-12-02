import { Card, Statistic, Tooltip, theme } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { useRef } from 'react';
import type { ReactNode } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAutoscale } from '../hooks/useAutoscale';

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
  
  // Autoscale: widget o'lchamiga qarab matn va icon o'lchamlarini moslashtirish
  const containerRef = useRef<HTMLDivElement>(null);
  const { fontSize, titleFontSize, iconSize, cardPadding } = useAutoscale(containerRef);

  const trendIcon =
    change !== undefined && change !== 0 ? (
      change >= 0 ? (
        <ArrowUpOutlined style={{ color: '#52c41a', fontSize: '14px' }} />
      ) : (
        <ArrowDownOutlined style={{ color: '#ff4d4f', fontSize: '14px' }} />
      )
    ) : null;

  const cardContent = (
    <div ref={containerRef} style={{ height: '100%', width: '100%' }}>
      <Card
        variant="borderless"
        loading={loading}
        className="kpi-card group transition-all duration-300 hover:shadow-lg"
        style={{
          borderRadius: '16px',
          background: token.colorBgContainer,
          boxShadow: token.boxShadow,
          borderColor: token.colorBorder,
          height: '100%',
        }}
        styles={{
          body: {
            padding: `${cardPadding}px`,
            height: '100%',
          },
        }}
      >
        <div className="flex items-start justify-between" style={{ height: '100%' }}>
          <div className="flex-1 flex flex-col justify-center">
            <p 
              className="m-0 uppercase tracking-widest"
              style={{ 
                color: token.colorTextSecondary,
                fontSize: `${Math.max(10, fontSize * 0.5)}px`, // Responsive title size
              }}
            >
              {title}
            </p>
            <Statistic
              value={value}
              precision={precision}
              prefix={prefix}
              suffix={suffix}
              valueStyle={{
                fontSize: `${titleFontSize}px`, // Autoscale: widget balandligiga mos
                fontWeight: 600,
                color: token.colorText,
                marginTop: `${cardPadding * 0.3}px`,
                ...valueStyle,
              }}
            />
            {change !== undefined && (
              <div className="mt-2 flex items-center gap-1">
                {trendIcon}
                <span
                  className="font-semibold"
                  style={{
                    color: change >= 0 ? '#52c41a' : '#ff4d4f',
                    fontSize: `${Math.max(10, fontSize * 0.6)}px`, // Responsive change text
                  }}
                >
                  {Math.abs(change)}%
                </span>
                <span 
                  style={{ 
                    color: token.colorTextTertiary,
                    fontSize: `${Math.max(10, fontSize * 0.6)}px`,
                  }}
                >
                  vs oxirgi oy
                </span>
              </div>
            )}
          </div>
          {icon && (
            <div 
              className="flex items-center justify-center rounded-xl transition-all group-hover:bg-amber-50 group-hover:text-amber-600"
              style={{
                backgroundColor: isDark ? '#2a2a2a' : '#f8fafc',
                color: token.colorTextSecondary,
                width: `${iconSize}px`, // Autoscale: icon o'lchami
                height: `${iconSize}px`,
                fontSize: `${iconSize * 0.5}px`, // Icon font size
              }}
            >
              {icon}
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  return tooltip ? <Tooltip title={tooltip}>{cardContent}</Tooltip> : cardContent;
};

export default KpiCard;
