import { EditOutlined, EyeOutlined } from '@ant-design/icons';
import OrderStatus from '../../components/OrderStatus';
import { formatCurrency, formatDate } from '../../utils/formatters';
import CardField from '../../components/responsive/cards/CardField';
import MobileCard from '../../components/responsive/cards/MobileCard';
import MobileCardList from '../../components/responsive/cards/MobileCardList';

export type OrderMobileSummary = {
  id: number;
  display_no: string;
  dealer?: { name?: string };
  total_usd: number;
  total_uzs?: number;
  value_date: string;
  created_by?: { full_name?: string };
  status: string;
  items?: { id: number }[];
};

export type OrdersMobileHandlers = {
  onView: (orderId: number) => void;
  onEdit: (orderId: number) => void;
  onStatusUpdated: (orderId: number, nextStatus: string) => void;
};

type OrdersMobileCardProps = {
  order: OrderMobileSummary;
  handlers: OrdersMobileHandlers;
};

export const OrdersMobileCard = ({ order, handlers }: OrdersMobileCardProps) => {
  const itemCount = order.items?.length ?? 0;
  const totalUzs = order.total_uzs
    ? formatCurrency(order.total_uzs, 'UZS')
    : '—';

  const fields = [
    { label: 'Total (USD)', value: formatCurrency(order.total_usd) },
    { label: 'Total (UZS)', value: totalUzs },
    { label: 'Items', value: `${itemCount}` },
    { label: 'Value date', value: formatDate(order.value_date) },
    { label: 'Created by', value: order.created_by?.full_name ?? '—' },
  ];

  const actions = [
    { icon: <EyeOutlined />, label: 'View', onClick: () => handlers.onView(order.id) },
    { icon: <EditOutlined />, label: 'Edit', onClick: () => handlers.onEdit(order.id) },
  ];

  return (
    <MobileCard
      title={`#${order.display_no}`}
      subtitle={order.dealer?.name ?? '—'}
      badges={[{ label: order.status, variant: 'status' }]}
      fields={fields}
      actions={actions}
      extra={
        <OrderStatus
          value={order.status}
          orderId={order.id}
          onStatusUpdated={handlers.onStatusUpdated}
        />
      }
    />
  );
};

type OrdersMobileCardsProps = {
  data: OrderMobileSummary[];
  handlers: OrdersMobileHandlers;
};

const OrdersMobileCards = ({ data, handlers }: OrdersMobileCardsProps) => (
  <MobileCardList
    data={data}
    keyExtractor={(order) => order.id}
    renderCard={(order) => <OrdersMobileCard order={order} handlers={handlers} />}
  />
);

export default OrdersMobileCards;
