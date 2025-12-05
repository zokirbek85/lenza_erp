import { DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import MobileCard, { type MobileCardProps } from '../../components/responsive/cards/MobileCard';
import MobileCardList from '../../components/responsive/cards/MobileCardList';

export type DealerMobileItem = {
  id: number;
  name: string;
  code: string;
  contact: string;
  region: string; // Region name from backend SerializerMethodField
  manager: string; // Manager name with role from backend SerializerMethodField
  current_balance_usd: number;
  current_balance_uzs: number;
  converted_balance_uzs: number; // USD balance × current exchange rate
  opening_balance_usd: number;
  opening_balance_uzs: number;
  phone: string;
  address: string;
  is_active: boolean;
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
  const balanceUsd = dealer.current_balance_usd ?? 0;
  
  // Use real UZS balance if exists, otherwise use converted balance
  const balanceUzs = (dealer.current_balance_uzs && dealer.current_balance_uzs !== 0) 
    ? dealer.current_balance_uzs 
    : dealer.converted_balance_uzs;

  const fields = [
    { label: 'Code', value: dealer.code },
    { label: 'Phone', value: dealer.phone || '—' },
    { label: 'Address', value: dealer.address || '—' },
    { label: 'Region', value: dealer.region },
    { label: 'Manager', value: dealer.manager },
    { label: 'Balance USD', value: `$${balanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
    { label: 'Balance UZS', value: `${balanceUzs.toLocaleString('uz-UZ')} so'm` },
  ];

  const badges: NonNullable<MobileCardProps['badges']> = [
    {
      label: dealer.is_active ? 'Active' : 'Inactive',
      variant: dealer.is_active ? 'info' : 'warning',
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
      subtitle={dealer.region}
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
