import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

// Modern badge classes using new design system
const BADGE_CLASSES: Record<string, string> = {
  created: 'badge badge-info',
  draft: 'badge badge-info',
  confirmed: 'badge badge-blue',
  packed: 'badge badge-blue',
  shipped: 'badge badge-blue',
  delivered: 'badge badge-success',
  completed: 'badge badge-success',
  cancelled: 'badge badge-error',
  returned: 'badge badge-warning',
};

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const { t } = useTranslation();
  
  // Get badge class from map, fallback to info
  const badgeClass = BADGE_CLASSES[status] ?? 'badge badge-info';
  
  // Try to translate, fallback to raw status if no translation exists
  const label = t(`order.status.${status}`, { defaultValue: status });
  
  return (
    <span className={clsx(badgeClass, className)}>
      {label}
    </span>
  );
};

export default StatusBadge;