import type { PropsWithChildren, ReactNode } from 'react';
import clsx from 'clsx';

interface KpiSectionProps extends PropsWithChildren {
  title: string;
  description?: ReactNode;
  className?: string;
}

const KpiSection = ({ title, description, className, children }: KpiSectionProps) => {
  return (
    <section
      className={clsx(
        'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60',
        className
      )}
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
        {description ? <div className="text-sm text-slate-500 dark:text-slate-400">{description}</div> : null}
      </div>
      {children}
    </section>
  );
};

export default KpiSection;
