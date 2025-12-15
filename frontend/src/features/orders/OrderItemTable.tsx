import { useTranslation } from 'react-i18next';
import type { OrderItem, OrderProduct } from '../../store/useOrderStore';
import { formatCurrency } from '../../utils/formatters';

interface OrderItemTableProps {
  items: OrderItem[];
  products?: OrderProduct[];
  onQtyChange: (productId: number, qty: number) => void;
  onPriceChange: (productId: number, price: number) => void;
  onRemove: (productId: number) => void;
  readOnly?: boolean;
}

const OrderItemTable = ({ items, products = [], onQtyChange, onPriceChange, onRemove, readOnly = false }: OrderItemTableProps) => {
  const { t } = useTranslation();

  if (!items.length) {
    return (
      <div className="card border-dashed text-center">
        <p className="text-slate-500 dark:text-slate-400">
          {t('orders.items.empty')}
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto animate-fadeInUp">
      <table className="modern-table">
        <thead>
          <tr>
            <th className="w-12">#</th>
            <th>{t('orders.table.product')}</th>
            <th className="w-32">{t('orders.table.quantity')}</th>
            <th className="w-32">{t('orders.table.priceUsd')}</th>
            <th className="w-32 text-right">{t('orders.table.total')}</th>
            <th className="w-24" />
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const lineTotal = Number(item.qty) * Number(item.price_usd);
            const product = products.find(p => p.id === item.product);
            const stock = product?.stock_ok ?? 0;
            const isNegativeStock = stock < 0;
            
            return (
              <tr key={item.product}>
                <td className="text-slate-500 dark:text-slate-400">
                  {index + 1}
                </td>
                <td className="font-medium">
                  <span
                    style={isNegativeStock ? {
                      color: '#FF8A8A',
                      fontStyle: 'italic',
                      fontWeight: 400
                    } : undefined}
                  >
                    {item.productName}
                  </span>
                </td>
                <td>
                  <input
                    type="number"
                    min={0.01}
                    step="0.01"
                    inputMode="decimal"
                    value={Number(item.qty ?? 0).toFixed(2)}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value);
                      onQtyChange(item.product, Number.isFinite(nextValue) ? nextValue : 0);
                    }}
                    disabled={readOnly}
                    className="input-field w-24"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.price_usd}
                    onChange={(event) => onPriceChange(item.product, Number(event.target.value) || 0)}
                    disabled={readOnly}
                    className="input-field w-28"
                  />
                </td>
                <td className="text-right font-semibold">
                  <span className="text-number">
                    {formatCurrency(lineTotal, 'USD')}
                  </span>
                </td>
                <td className="text-right">
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => onRemove(item.product)}
                      className="btn btn-danger btn-sm"
                      title={t('actions.remove')}
                    >
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50 dark:bg-slate-800/60 font-semibold">
            <td colSpan={4} className="text-right">
              {t('orders.table.grandTotal', 'Jami:')}
            </td>
            <td className="text-right">
              <span className="text-number gradient-text text-lg">
                {formatCurrency(
                  items.reduce((sum, item) => sum + Number(item.qty) * Number(item.price_usd), 0),
                  'USD'
                )}
              </span>
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default OrderItemTable;