import { useTranslation } from 'react-i18next';
import type { OrderItem } from '../../store/useOrderStore';
import { formatCurrency } from '../../utils/formatters';

interface OrderItemTableProps {
  items: OrderItem[];
  onQtyChange: (productId: number, qty: number) => void;
  onPriceChange: (productId: number, price: number) => void;
  onRemove: (productId: number) => void;
  readOnly?: boolean;
}

const OrderItemTable = ({ items, onQtyChange, onPriceChange, onRemove, readOnly = false }: OrderItemTableProps) => {
  const { t } = useTranslation();

  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        {t('orders.items.empty')}
      </div>
    );
  }

  return (
    <div className="table-wrapper overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-800">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">#</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">
              {t('orders.table.product')}
            </th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">
              {t('orders.table.quantity')}
            </th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">
              {t('orders.table.priceUsd')}
            </th>
            <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-200">
              {t('orders.table.total')}
            </th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item, index) => (
            <tr key={item.product}>
              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{index + 1}</td>
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{item.productName}</td>
              <td className="px-4 py-3">
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
                  className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:disabled:bg-slate-800/50"
                />
              </td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.price_usd}
                  onChange={(event) => onPriceChange(item.product, Number(event.target.value) || 0)}
                  disabled={readOnly}
                  className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:disabled:bg-slate-800/50"
                />
              </td>
              <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                {formatCurrency(Number(item.qty) * Number(item.price_usd), 'USD')}
              </td>
              <td className="px-4 py-3 text-right">
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => onRemove(item.product)}
                    className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-900/30"
                  >
                    {t('actions.remove')}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrderItemTable;
