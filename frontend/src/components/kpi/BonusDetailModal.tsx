import { formatCurrency } from '../../utils/formatters';
import { useTranslation } from 'react-i18next';

interface DealerBonus {
  dealer_name: string;
  sales_usd: number;
  payment_cash_usd: number;
  payment_card_usd: number;
  payment_bank_usd: number;
  total_payment_usd: number;
  kpi_usd: number;
}

interface BonusDetail {
  manager_name: string;
  regions: string;
  from_date: string;
  to_date: string;
  dealers: DealerBonus[];
  totals: {
    sales_usd: number;
    payment_cash_usd: number;
    payment_card_usd: number;
    payment_bank_usd: number;
    total_payment_usd: number;
    kpi_usd: number;
  };
}

interface BonusDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: BonusDetail | null;
  loading: boolean;
}

const BonusDetailModal = ({ isOpen, onClose, data, loading }: BonusDetailModalProps) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="relative max-h-[90vh] w-full max-w-6xl overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t('kpi.manager.bonusDetail', 'Bonus Detailed Report')}
            </h2>
            {data && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {data.manager_name} - {data.regions} ({data.from_date} - {data.to_date})
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500 dark:border-slate-700 dark:border-t-blue-400" />
            </div>
          ) : data ? (
            <>
              {/* Formula Info */}
              <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {t('kpi.manager.bonusFormula', 'Bonus Formula')}: 1% {t('kpi.manager.ofPayments', 'of Payments')}
                </p>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 dark:border-slate-800">
                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                        {t('kpi.manager.dealer', 'Dealer')}
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                        {t('kpi.manager.sales', 'Sales')}
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                        {t('kpi.manager.cashPayments', 'Cash')}
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                        {t('kpi.manager.cardPayments', 'Card')}
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                        {t('kpi.manager.bankPayments', 'Bank')}
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                        {t('kpi.manager.totalPayments', 'Total Payments')}
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-amber-600 dark:text-amber-400">
                        {t('kpi.manager.bonus', 'Bonus')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.dealers.map((dealer, index) => (
                      <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{dealer.dealer_name}</td>
                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                          {formatCurrency(dealer.sales_usd)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                          {formatCurrency(dealer.payment_cash_usd)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                          {formatCurrency(dealer.payment_card_usd)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                          {formatCurrency(dealer.payment_bank_usd)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">
                          {formatCurrency(dealer.total_payment_usd)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-amber-600 dark:text-amber-400">
                          {formatCurrency(dealer.kpi_usd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-300 dark:border-slate-700">
                    <tr className="bg-slate-100 font-semibold dark:bg-slate-800">
                      <td className="px-4 py-3 text-slate-900 dark:text-white">{t('kpi.manager.total', 'Total')}</td>
                      <td className="px-4 py-3 text-right text-slate-900 dark:text-white">
                        {formatCurrency(data.totals.sales_usd)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-900 dark:text-white">
                        {formatCurrency(data.totals.payment_cash_usd)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-900 dark:text-white">
                        {formatCurrency(data.totals.payment_card_usd)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-900 dark:text-white">
                        {formatCurrency(data.totals.payment_bank_usd)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-900 dark:text-white">
                        {formatCurrency(data.totals.total_payment_usd)}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400">
                        {formatCurrency(data.totals.kpi_usd)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          ) : (
            <p className="py-8 text-center text-slate-500 dark:text-slate-400">
              {t('kpi.manager.noData', "Ma'lumot topilmadi")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BonusDetailModal;
