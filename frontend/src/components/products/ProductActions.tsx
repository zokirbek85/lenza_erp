import type { ReactNode } from 'react';

type ProductActionsProps = {
  onEdit?: () => void;
  onDelete?: () => void;
  onAdjust?: () => void;
  canEdit: boolean;
  canDelete: boolean;
  canAdjust?: boolean;
  disabled?: boolean;
  children?: ReactNode;
  labels?: {
    edit?: string;
    delete?: string;
    adjust?: string;
  };
};

const ProductActions = ({
  onEdit,
  onDelete,
  onAdjust,
  canEdit,
  canDelete,
  canAdjust = false,
  disabled = false,
  children,
  labels,
}: ProductActionsProps) => {
  if (!canEdit && !canDelete && !canAdjust && !children) {
    return null;
  }

  const editLabel = labels?.edit ?? 'Edit';
  const deleteLabel = labels?.delete ?? 'Delete';
  const adjustLabel = labels?.adjust ?? 'Update';

  return (
    <div className="flex items-center justify-end gap-2">
      {children}
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
