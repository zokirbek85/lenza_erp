import { Card } from 'antd';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import { useThemeTokens } from '../../utils/themeTokens';

type DashboardMobileWidgetProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  onClick?: () => void;
};

export const DashboardMobileWidget = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'primary',
  onClick,
}: DashboardMobileWidgetProps) => {
  const tokens = useThemeTokens();

  const variantStyles = {
    primary: 'bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300',
    success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300',
    warning: 'bg-amber-50 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
    danger: 'bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-300',
    info: 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  };

  return (
    <Card
      variant="outlined"
      size="small"
      onClick={onClick}
      className={clsx(
        'w-full rounded-xl border shadow-sm transition-transform duration-200',
        onClick && 'cursor-pointer hover:-translate-y-0.5'
      )}
      bodyStyle={{
        background: tokens.colorBgContainer,
        borderColor: tokens.colorBorder,
        padding: '1rem',
        borderRadius: tokens.borderRadius,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {icon && (
          <div className={clsx('flex h-12 w-12 items-center justify-center rounded-xl text-2xl', variantStyles[variant])}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

type DashboardMobileWidgetsProps = {
  widgets: DashboardMobileWidgetProps[];
};

const DashboardMobileWidgets = ({ widgets }: DashboardMobileWidgetsProps) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    {widgets.map((widget, index) => (
      <DashboardMobileWidget key={index} {...widget} />
    ))}
  </div>
);

export default DashboardMobileWidgets;
