import { DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import { formatCurrency } from '../../utils/formatters';
import MobileCard, { type MobileCardProps } from '../../components/responsive/cards/MobileCard';
import MobileCardList from '../../components/responsive/cards/MobileCardList';

export type DealerMobileItem = {
  id: number;
  name: string;
  code: string;
  contact: string;
  region?: { name?: string } | null;
  manager_user?: string | null;
  balance?: number;
  opening_balance_usd?: number;
};

export type DealersMobileHandlers = {
  onView: (dealerId: number) => void;
  onEdit: (dealerId: number) => void;
  onDelete: (dealerId: number) => void;
};

export type DealerMobilePermissions = {
  canEdit: boolean;
  canDelete: boolean;
};

type DealersMobileCardProps = {
  dealer: DealerMobileItem;
  handlers: DealersMobileHandlers;
  permissions: DealerMobilePermissions;
};

export const DealersMobileCard = ({ dealer, handlers, permissions }: DealersMobileCardProps) => {
  const balance = dealer.balance ?? 0;
  const balanceVariant = balance >= 0 ? 'info' : 'warning';

  const getManagerLabel = (manager?: string | null): string => {
    return manager || '—';
  };

  const fields = [
    { label: 'Code', value: dealer.code },
    { label: 'Contact', value: dealer.contact || '—' },
    { label: 'Region', value: dealer.region?.name ?? '—' },
    { label: 'Manager', value: getManagerLabel(dealer.manager_user) },
    { label: 'Balance', value: formatCurrency(balance) },
    { label: 'Opening Balance', value: formatCurrency(dealer.opening_balance_usd) },
  ];

  const badges: NonNullable<MobileCardProps['badges']> = [
    {
      label: balance >= 0 ? 'Active' : 'In Debt',
      variant: balanceVariant,
    },
  ];

  type Action = { icon: React.ReactElement; label: string; onClick: () => void };

  const actions: Action[] = [
    { icon: <EyeOutlined />, label: 'View', onClick: () => handlers.onView(dealer.id) },
    permissions.canEdit ? { icon: <EditOutlined />, label: 'Edit', onClick: () => handlers.onEdit(dealer.id) } : null,
    permissions.canDelete
      ? { icon: <DeleteOutlined />, label: 'Delete', onClick: () => handlers.onDelete(dealer.id) }
      : null,
  ].filter((item): item is Action => item !== null);

  return (
    <MobileCard
      title={dealer.name}
      subtitle={dealer.region?.name ?? 'No region'}
      badges={badges}
      fields={fields}
      actions={actions}
    />
  );
};

type DealersMobileCardsProps = {
  data: DealerMobileItem[];
  handlers: DealersMobileHandlers;
  permissions: DealerMobilePermissions;
};

const DealersMobileCards = ({ data, handlers, permissions }: DealersMobileCardsProps) => (
  <MobileCardList
    data={data}
    keyExtractor={(dealer) => dealer.id}
    renderCard={(dealer) => (
      <DealersMobileCard key={dealer.id} dealer={dealer} handlers={handlers} permissions={permissions} />
    )}
  />
);

export default DealersMobileCards;
