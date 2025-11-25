import { DeleteOutlined, EditOutlined, EyeOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { formatCurrency, formatDate } from '../../utils/formatters';
import MobileCard, { type MobileCardProps } from '../../components/responsive/cards/MobileCard';
import MobileCardList from '../../components/responsive/cards/MobileCardList';

export type PaymentMobileItem = {
  id: number;
  dealer: { name?: string } | null;
  amount: number;
  currency: string;
  amount_usd: number;
  amount_uzs: number;
  method: string;
  card?: { name?: string; masked_number?: string } | null;
  pay_date: string;
  note: string;
  status: 'pending' | 'approved' | 'rejected' | 'confirmed';
  created_by_fullname?: string;
  approved_by_fullname?: string;
  approved_at?: string;
  receipt_image_url?: string;
};

export type PaymentsMobileHandlers = {
  onView: (paymentId: number) => void;
  onEdit: (paymentId: number) => void;
  onDelete: (paymentId: number) => void;
  onApprove?: (paymentId: number) => void;
  onReject?: (paymentId: number) => void;
};

export type PaymentMobilePermissions = {
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
};

type PaymentsMobileCardProps = {
  payment: PaymentMobileItem;
  handlers: PaymentsMobileHandlers;
  permissions: PaymentMobilePermissions;
};

export const PaymentsMobileCard = ({ payment, handlers, permissions }: PaymentsMobileCardProps) => {
  const statusVariant = 
    payment.status === 'approved' || payment.status === 'confirmed' ? 'status' :
    payment.status === 'rejected' ? 'warning' : 'info';

  const fields = [
    { label: 'Amount', value: `${formatCurrency(payment.amount)} ${payment.currency}` },
    { label: 'USD Equivalent', value: formatCurrency(payment.amount_usd) },
    { label: 'UZS Equivalent', value: formatCurrency(payment.amount_uzs, 'UZS') },
    { label: 'Method', value: payment.method },
    ...(payment.card ? [{ label: 'Card', value: `${payment.card.name} (${payment.card.masked_number})` }] : []),
    { label: 'Payment Date', value: formatDate(payment.pay_date) },
    ...(payment.created_by_fullname ? [{ label: 'Created by', value: payment.created_by_fullname }] : []),
    ...(payment.approved_by_fullname ? [{ label: 'Approved by', value: payment.approved_by_fullname }] : []),
    ...(payment.note ? [{ label: 'Note', value: payment.note }] : []),
  ];

  const badges: NonNullable<MobileCardProps['badges']> = [
    {
      label: payment.status,
      variant: statusVariant,
    },
  ];

  type Action = { icon: React.ReactElement; label: string; onClick: () => void };

  const actions: Action[] = [
    { icon: <EyeOutlined />, label: 'View', onClick: () => handlers.onView(payment.id) },
    permissions.canApprove && payment.status === 'pending' && handlers.onApprove
      ? { icon: <CheckCircleOutlined />, label: 'Approve', onClick: () => handlers.onApprove?.(payment.id) }
      : null,
    permissions.canApprove && payment.status === 'pending' && handlers.onReject
      ? { icon: <DeleteOutlined />, label: 'Reject', onClick: () => handlers.onReject?.(payment.id) }
      : null,
    permissions.canEdit && payment.status === 'pending'
      ? { icon: <EditOutlined />, label: 'Edit', onClick: () => handlers.onEdit(payment.id) }
      : null,
    permissions.canDelete && payment.status === 'pending'
      ? { icon: <DeleteOutlined />, label: 'Delete', onClick: () => handlers.onDelete(payment.id) }
      : null,
  ].filter((item): item is Action => item !== null);

  return (
    <MobileCard
      title={payment.dealer?.name ?? 'Unknown Dealer'}
      subtitle={formatDate(payment.pay_date)}
      badges={badges}
      fields={fields}
      actions={actions}
    />
  );
};

type PaymentsMobileCardsProps = {
  data: PaymentMobileItem[];
  handlers: PaymentsMobileHandlers;
  permissions: PaymentMobilePermissions;
};

const PaymentsMobileCards = ({ data, handlers, permissions }: PaymentsMobileCardsProps) => (
  <MobileCardList
    data={data}
    keyExtractor={(payment) => payment.id}
    renderCard={(payment) => (
      <PaymentsMobileCard key={payment.id} payment={payment} handlers={handlers} permissions={permissions} />
    )}
  />
);

export default PaymentsMobileCards;
