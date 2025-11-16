import { DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import { formatCurrency } from '../../utils/formatters';
import MobileCard, { type MobileCardProps } from '../../components/responsive/cards/MobileCard';
import MobileCardList from '../../components/responsive/cards/MobileCardList';

export type ProductMobileItem = {
  id: number;
  name: string;
  sku: string;
  brand?: { name?: string } | null;
  category?: { name?: string } | null;
  sell_price_usd: number;
  stock_ok: number;
  stock_defect: number;
  availability_status: string;
};

export type ProductsMobileHandlers = {
  onView: (productId: number) => void;
  onEdit: (productId: number) => void;
  onDelete: (productId: number) => void;
};

type ProductsMobileCardProps = {
  product: ProductMobileItem;
  handlers: ProductsMobileHandlers;
};

export const ProductsMobileCard = ({ product, handlers }: ProductsMobileCardProps) => {
  const fields = [
    { label: 'SKU', value: product.sku },
    { label: 'Brand / Category', value: `${product.brand?.name ?? '—'} / ${product.category?.name ?? '—'}` },
    { label: 'Price USD', value: formatCurrency(product.sell_price_usd) },
    { label: 'Price UZS', value: formatCurrency(product.sell_price_usd, 'UZS') },
    { label: 'Stock OK', value: product.stock_ok },
    { label: 'Stock Defect', value: product.stock_defect },
  ];

  const badges: NonNullable<MobileCardProps['badges']> = [
    {
      label: product.availability_status,
      variant: product.stock_ok > 0 ? 'info' : 'warning',
    },
  ];

  const actions = [
    { icon: <EyeOutlined />, label: 'View', onClick: () => handlers.onView(product.id) },
    { icon: <EditOutlined />, label: 'Edit', onClick: () => handlers.onEdit(product.id) },
    { icon: <DeleteOutlined />, label: 'Delete', onClick: () => handlers.onDelete(product.id) },
  ];

  return (
    <MobileCard
      title={product.name}
      subtitle={product.category?.name ?? '—'}
      badges={badges}
      fields={fields.map((field) => ({
        label: field.label,
        value: field.value,
      }))}
      actions={actions}
    />
  );
};

type ProductsMobileCardsProps = {
  data: ProductMobileItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  handlers: ProductsMobileHandlers;
};

const ProductsMobileCards = ({ data, handlers }: ProductsMobileCardsProps) => (
  <MobileCardList
    data={data}
    keyExtractor={(product) => product.id}
    renderCard={(product) => <ProductsMobileCard key={product.id} product={product} handlers={handlers} />}
  />
);

export default ProductsMobileCards;
