import { EyeOutlined } from '@ant-design/icons';
import { Card } from 'antd';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import { useThemeTokens } from '../../../utils/themeTokens';

type Action = {
  icon: ReactNode;
  label: string;
  onClick: () => void;
};

type CardField = {
  label: string;
  value: ReactNode;
};

export type MobileCardProps = {
  title: string;
  subtitle?: string;
  badges?: { label: string; variant?: 'status' | 'info' | 'warning' }[];
  fields?: CardField[];
  actions?: Action[];
  extra?: ReactNode;
};

const MobileCard = ({
  title,
  subtitle,
  badges = [],
  fields = [],
  actions = [],
  extra,
}: MobileCardProps) => {
  const tokens = useThemeTokens();
  const borderColor = tokens.colorBorder;

  return (
    <Card
      variant="outlined"
      size="small"
      className="w-full rounded-lg border shadow-sm transition-transform duration-200 hover:-translate-y-0.5 dark:shadow-lg"
      bodyStyle={{
        background: tokens.colorBgContainer,
        borderColor,
        padding: '0.75rem',
        borderRadius: tokens.borderRadius,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-300">{subtitle}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {badges.map((badge) => (
            <span
              key={badge.label}
              className={clsx(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide whitespace-nowrap',
                badge.variant === 'status'
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200'
                  : badge.variant === 'warning'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
              )}
            >
              {badge.label}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
        {fields.map((field) => (
          <div key={field.label} className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {field.label}
            </span>
            <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {field.value}
            </span>
          </div>
        ))}
      </div>
      {actions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-dashed border-slate-200 pt-2 dark:border-slate-800">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className="flex-nowrap flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <span className="text-sm">{action.icon || <EyeOutlined />}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}
      {extra && <div className="mt-2">{extra}</div>}
    </Card>
  );
};

export default MobileCard;
