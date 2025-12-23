import type { ReactNode } from 'react';

type ProductActionsProps = {
  onEdit?: () => void;
  onDelete?: () => void;
  onAdjust?: () => void;
  onPriceHistory?: () => void;
  onViewMovements?: () => void;
  canEdit: boolean;
  canDelete: boolean;
  canAdjust?: boolean;
  canViewPrices?: boolean;
  canViewMovements?: boolean;
  disabled?: boolean;
  children?: ReactNode;
  labels?: {
    edit?: string;
    delete?: string;
    adjust?: string;
    priceHistory?: string;
    movements?: string;
  };
};

const ProductActions = ({
  onEdit,
  onDelete,
  onAdjust,
  onPriceHistory,
  onViewMovements,
  canEdit,
  canDelete,
  canAdjust = false,
  canViewPrices = false,
  canViewMovements = false,
  disabled = false,
  children,
  labels,
}: ProductActionsProps) => {
  if (!canEdit && !canDelete && !canAdjust && !canViewPrices && !canViewMovements && !children) {
    return null;
  }

  const editLabel = labels?.edit ?? 'Edit';
  const deleteLabel = labels?.delete ?? 'Delete';
  const adjustLabel = labels?.adjust ?? 'Update';
  const priceHistoryLabel = labels?.priceHistory ?? 'Prices';
  const movementsLabel = labels?.movements ?? 'Movements';

  return (
    <div className="flex items-center justify-end gap-2">
      {children}
      {canViewMovements && (
        <button
          className="text-sm font-semibold text-purple-600 hover:text-purple-800 disabled:cursor-not-allowed disabled:opacity-60 dark:text-purple-400"
          onClick={onViewMovements}
          disabled={disabled}
        >
          {movementsLabel}
        </button>
      )}
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
