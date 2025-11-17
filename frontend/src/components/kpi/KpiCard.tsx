import clsx from 'clsx';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  accentColor?: string;
  className?: string;
}

const KpiCard = ({ title, value, subtitle, accentColor = 'text-slate-900', className }: KpiCardProps) => {
  return (
    <article
      className={clsx(
        'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60',
        className
      )}
    >
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
      <p className={clsx('mt-2 text-3xl font-semibold dark:text-white', accentColor)}>{value}</p>
      {subtitle ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
    </article>
  );
};

export default KpiCard;
