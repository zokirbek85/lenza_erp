import clsx from 'clsx';

type BadgeVariant = 'status' | 'info' | 'warning';

type BadgeProps = {
  value: string;
  variant?: BadgeVariant;
};

const variantClasses: Record<BadgeVariant, string> = {
  status: 'bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200',
  info: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
};

const CardBadge = ({ value, variant = 'status' }: BadgeProps) => (
  <span
    className={clsx(
      'rounded-full px-3 py-0.5 text-xs font-semibold tracking-wide',
      variantClasses[variant]
    )}
  >
    {value}
  </span>
);

export default CardBadge;
