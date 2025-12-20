import type { ReactNode } from 'react';

type ProductActionsProps = {
  onEdit?: () => void;
  onDelete?: () => void;
  onAdjust?: () => void;
  onPriceHistory?: () => void;
  canEdit: boolean;
  canDelete: boolean;
  canAdjust?: boolean;
  canViewPrices?: boolean;
  disabled?: boolean;
  children?: ReactNode;
  labels?: {
    edit?: string;
    delete?: string;
    adjust?: string;
    priceHistory?: string;
  };
};

const ProductActions = ({
  onEdit,
  onDelete,
  onAdjust,
  onPriceHistory,
  canEdit,
  canDelete,
  canAdjust = false,
  canViewPrices = false,
  disabled = false,
  children,
  labels,
}: ProductActionsProps) => {
  if (!canEdit && !canDelete && !canAdjust && !canViewPrices && !children) {
    return null;
  }

  const editLabel = labels?.edit ?? 'Edit';
  const deleteLabel = labels?.delete ?? 'Delete';
  const adjustLabel = labels?.adjust ?? 'Update';
  const priceHistoryLabel = labels?.priceHistory ?? 'Prices';

  return (
    <div className="flex items-center justify-end gap-2">
      {children}
      {canViewPrices && (
        <button
          className="text-sm font-semibold text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-60 dark:text-blue-400"
          onClick={onPriceHistory}
          disabled={disabled}
        >
          {priceHistoryLabel}
        </button>
      )}
      {canEdit && (
        <button
          className="text-sm font-semibold text-slate-600 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-300 dark:hover:text-white"
          onClick={onEdit}
          disabled={disabled}
        >
          {editLabel}
        </button>
      )}
      {canAdjust && (
        <button
          className="text-sm font-semibold text-amber-600 hover:text-amber-800 disabled:cursor-not-allowed disabled:opacity-60 dark:text-amber-300"
          onClick={onAdjust}
          disabled={disabled}
        >
          {adjustLabel}
        </button>
      )}
      {canDelete && (
        <button
          className="text-sm font-semibold text-rose-600 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onDelete}
          disabled={disabled}
        >
          {deleteLabel}
        </button>
      )}
    </div>
  );
};

export default ProductActions;
