import clsx from 'clsx';

interface StatusBadgeProps {
  status: string;
}

const COLORS: Record<string, string> = {
  created: 'bg-slate-100 text-slate-700',
  draft: 'bg-slate-100 text-slate-700',
  confirmed: 'bg-blue-100 text-blue-700',
  packed: 'bg-indigo-100 text-indigo-700',
  shipped: 'bg-amber-100 text-amber-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
  returned: 'bg-orange-100 text-orange-700',
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const color = COLORS[status] ?? 'bg-slate-100 text-slate-700';
  return (
    <span className={clsx('rounded-full px-3 py-1 text-xs font-semibold capitalize', color)}>
      {status}
    </span>
  );
};

export default StatusBadge;
