import { DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import { formatCurrency, formatDate } from '../../utils/formatters';
import MobileCard, { type MobileCardProps } from '../../components/responsive/cards/MobileCard';
import MobileCardList from '../../components/responsive/cards/MobileCardList';

export type ExpenseMobileItem = {
  id: number;
  category: { name?: string } | null;
  description: string;
  amount: number;
  currency: string;
  amount_usd: number;
  amount_uzs: number;
  expense_date: string;
  note?: string;
  created_by?: { full_name?: string };
};

export type ExpensesMobileHandlers = {
  onView: (expenseId: number) => void;
  onEdit: (expenseId: number) => void;
  onDelete: (expenseId: number) => void;
};

export type ExpenseMobilePermissions = {
  canEdit: boolean;
  canDelete: boolean;
};

type ExpensesMobileCardProps = {
  expense: ExpenseMobileItem;
  handlers: ExpensesMobileHandlers;
  permissions: ExpenseMobilePermissions;
};

export const ExpensesMobileCard = ({ expense, handlers, permissions }: ExpensesMobileCardProps) => {
  const fields = [
    { label: 'Category', value: expense.category?.name ?? 'Uncategorized' },
    { label: 'Amount', value: `${formatCurrency(expense.amount)} ${expense.currency}` },
    { label: 'USD Equivalent', value: formatCurrency(expense.amount_usd) },
    { label: 'UZS Equivalent', value: formatCurrency(expense.amount_uzs, 'UZS') },
    { label: 'Date', value: formatDate(expense.expense_date) },
    { label: 'Created By', value: expense.created_by?.full_name ?? '—' },
    ...(expense.note ? [{ label: 'Note', value: expense.note }] : []),
  ];

  const badges: NonNullable<MobileCardProps['badges']> = [
    {
      label: expense.currency,
      variant: 'info',
    },
  ];

  type Action = { icon: React.ReactElement; label: string; onClick: () => void };

  const actions: Action[] = [
    { icon: <EyeOutlined />, label: 'View', onClick: () => handlers.onView(expense.id) },
    permissions.canEdit ? { icon: <EditOutlined />, label: 'Edit', onClick: () => handlers.onEdit(expense.id) } : null,
    permissions.canDelete
      ? { icon: <DeleteOutlined />, label: 'Delete', onClick: () => handlers.onDelete(expense.id) }
      : null,
  ].filter((item): item is Action => item !== null);

  return (
    <MobileCard
      title={expense.description}
      subtitle={expense.category?.name ?? 'No category'}
      badges={badges}
      fields={fields}
      actions={actions}
    />
  );
};

type ExpensesMobileCardsProps = {
  data: ExpenseMobileItem[];
  handlers: ExpensesMobileHandlers;
  permissions: ExpenseMobilePermissions;
};

const ExpensesMobileCards = ({ data, handlers, permissions }: ExpensesMobileCardsProps) => (
  <MobileCardList
    data={data}
    keyExtractor={(expense) => expense.id}
    renderCard={(expense) => (
      <ExpensesMobileCard key={expense.id} expense={expense} handlers={handlers} permissions={permissions} />
    )}
  />
);

export default ExpensesMobileCards;
