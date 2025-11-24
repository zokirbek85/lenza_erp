import { DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import MobileCard, { type MobileCardProps } from '../../components/responsive/cards/MobileCard';
import MobileCardList from '../../components/responsive/cards/MobileCardList';

export type UserMobileItem = {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
};

export type UsersMobileHandlers = {
  onView: (userId: number) => void;
  onEdit: (userId: number) => void;
  onDelete: (userId: number) => void;
};

export type UserMobilePermissions = {
  canEdit: boolean;
  canDelete: boolean;
};

type UsersMobileCardProps = {
  user: UserMobileItem;
  handlers: UsersMobileHandlers;
  permissions: UserMobilePermissions;
};

export const UsersMobileCard = ({ user, handlers, permissions }: UsersMobileCardProps) => {
  const statusVariant = user.is_active ? 'info' : 'warning';

  const fields = [
    { label: 'Username', value: user.username },
    { label: 'Email', value: user.email || '—' },
    { label: 'Full Name', value: user.full_name || '—' },
    { label: 'Role', value: user.role },
    { label: 'Status', value: user.is_active ? 'Active' : 'Inactive' },
  ];

  const badges: NonNullable<MobileCardProps['badges']> = [
    {
      label: user.is_active ? 'Active' : 'Inactive',
      variant: statusVariant,
    },
    {
      label: user.role,
      variant: 'info',
    },
  ];

  type Action = { icon: React.ReactElement; label: string; onClick: () => void };

  const actions: Action[] = [
    { icon: <EyeOutlined />, label: 'View', onClick: () => handlers.onView(user.id) },
    permissions.canEdit ? { icon: <EditOutlined />, label: 'Edit', onClick: () => handlers.onEdit(user.id) } : null,
    permissions.canDelete
      ? { icon: <DeleteOutlined />, label: 'Delete', onClick: () => handlers.onDelete(user.id) }
      : null,
  ].filter((item): item is Action => item !== null);

  return (
    <MobileCard
      title={user.full_name || user.username}
      subtitle={user.email}
      badges={badges}
      fields={fields}
      actions={actions}
    />
  );
};

type UsersMobileCardsProps = {
  data: UserMobileItem[];
  handlers: UsersMobileHandlers;
  permissions: UserMobilePermissions;
};

const UsersMobileCards = ({ data, handlers, permissions }: UsersMobileCardsProps) => (
  <MobileCardList
    data={data}
    keyExtractor={(user) => user.id}
    renderCard={(user) => <UsersMobileCard key={user.id} user={user} handlers={handlers} permissions={permissions} />}
  />
);

export default UsersMobileCards;
