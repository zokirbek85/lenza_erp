import { EyeOutlined } from '@ant-design/icons';
import { formatCurrency, formatDate } from '../../utils/formatters';
import MobileCard, { type MobileCardProps } from '../../components/responsive/cards/MobileCard';
import MobileCardList from '../../components/responsive/cards/MobileCardList';

export type ReturnItemMobile = {
  id?: number;
  product_id: number;
  product_name: string;
  brand_name?: string;
  category_name?: string;
  quantity: number;
  status: 'healthy' | 'defect';
  comment?: string;
};

export type ReturnMobileRecord = {
  id: number;
  dealer_name: string;
  items: ReturnItemMobile[];
  total_sum: number;
  status: string;
  status_display?: string;
  general_comment?: string | null;
  created_at: string;
};

export type ReturnsMobileHandlers = {
  onView: (returnId: number) => void;
};

type ReturnsMobileCardProps = {
  returnRecord: ReturnMobileRecord;
  handlers: ReturnsMobileHandlers;
  showPrice: boolean;
};

export const ReturnsMobileCard = ({ returnRecord, handlers, showPrice }: ReturnsMobileCardProps) => {
  const itemsCount = returnRecord.items.length;
  const healthyCount = returnRecord.items.filter((i) => i.status === 'healthy').length;
  const defectCount = returnRecord.items.filter((i) => i.status === 'defect').length;

  const fields = [
    { label: 'Items', value: `${itemsCount} (${healthyCount} healthy, ${defectCount} defect)` },
    ...(showPrice ? [{ label: 'Total', value: formatCurrency(returnRecord.total_sum) }] : []),
    { label: 'Status', value: returnRecord.status_display || returnRecord.status },
    { label: 'Date', value: formatDate(returnRecord.created_at) },
    ...(returnRecord.general_comment ? [{ label: 'Comment', value: returnRecord.general_comment }] : []),
  ];

  const badges: NonNullable<MobileCardProps['badges']> = [
    {
      label: returnRecord.status_display || returnRecord.status,
      variant: 'info',
    },
  ];

  const actions = [{ icon: <EyeOutlined />, label: 'View', onClick: () => handlers.onView(returnRecord.id) }];

  return (
    <MobileCard
      title={`Return #${returnRecord.id}`}
      subtitle={returnRecord.dealer_name}
      badges={badges}
      fields={fields}
      actions={actions}
    />
  );
};

type ReturnsMobileCardsProps = {
  data: ReturnMobileRecord[];
  handlers: ReturnsMobileHandlers;
  showPrice: boolean;
};

const ReturnsMobileCards = ({ data, handlers, showPrice }: ReturnsMobileCardsProps) => (
  <MobileCardList
    data={data}
    keyExtractor={(returnRecord) => returnRecord.id}
    renderCard={(returnRecord) => (
      <ReturnsMobileCard key={returnRecord.id} returnRecord={returnRecord} handlers={handlers} showPrice={showPrice} />
    )}
  />
);

export default ReturnsMobileCards;
