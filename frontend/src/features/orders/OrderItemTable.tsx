import type { OrderItem } from '../../store/useOrderStore';

interface OrderItemTableProps {
  items: OrderItem[];
  onQtyChange: (productId: number, qty: number) => void;
  onPriceChange: (productId: number, price: number) => void;
  onRemove: (productId: number) => void;
}

const OrderItemTable = ({ items, onQtyChange, onPriceChange, onRemove }: OrderItemTableProps) => {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Tanlangan mahsulotlar ro&apos;yxati bo&apos;sh.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-800">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">#</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">Mahsulot</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">Miqdor</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">Narx (USD)</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-200">Summa</th>
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
                  min={1}
                  value={item.qty}
                  onChange={(event) => onQtyChange(item.product, Number(event.target.value) || 1)}
                  className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.price_usd}
                  onChange={(event) => onPriceChange(item.product, Number(event.target.value) || 0)}
                  className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </td>
              <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                ${(item.qty * item.price_usd).toFixed(2)}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => onRemove(item.product)}
                  className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-900/30"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrderItemTable;
