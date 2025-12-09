import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/formatters';

interface AccountDetail {
  account_id: number;
  account_name: string;
  account_type: string;
  account_type_display?: string;
  currency: string;
  balance?: number;
  income_total?: number;
  expense_total?: number;
  is_active: boolean;
}

interface BalanceCardProps {
  icon: 'money' | 'credit-card' | 'bank' | 'arrow-up' | 'arrow-down';
  title: string;
  value: number;
  currency: 'USD' | 'UZS';
  details?: AccountDetail[];
  type?: 'balance' | 'income' | 'expense';
  trend?: {
    direction: 'up' | 'down';
    percentage: number;
  };
}

const iconMap = {
  'money': '💵',
  'credit-card': '💳',
  'bank': '🏦',
  'arrow-up': '↑',
  'arrow-down': '↓',
};

/**
 * BalanceCard - Display cashbox balance with detailed breakdown on hover
 * 
 * Features:
 * - Icon indicator for type
 * - Formatted currency display
 * - Detailed breakdown on hover (shows each account's contribution)
 * - Progress bars for visual representation
 * - Trend indicators
 * - Dark mode support
 * - Responsive design
 */
const BalanceCard = ({ icon, title, value, currency, details = [], type = 'balance', trend }: BalanceCardProps) => {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [openDirection, setOpenDirection] = useState<'up' | 'down'>('up');
  const cardRef = useRef<HTMLDivElement>(null);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Calculate dropdown position when showing
  useEffect(() => {
    if (showDetails && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceAbove = rect.top;
      const spaceBelow = viewportHeight - rect.bottom;
      
      // Determine if dropdown should open up or down
      // Open down if there's more space below or not enough space above
      const shouldOpenDown = spaceBelow > spaceAbove || spaceAbove < 300;
      
      setOpenDirection(shouldOpenDown ? 'down' : 'up');
      setDropdownPosition({
        top: shouldOpenDown ? rect.bottom + window.scrollY + 8 : rect.top + window.scrollY - 8,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [showDetails]);

  const getAmount = (detail: AccountDetail) => {
    if (type === 'balance') return detail.balance || 0;
    if (type === 'income') return detail.income_total || 0;
    if (type === 'expense') return detail.expense_total || 0;
    return 0;
  };

  // Ensure details is always an array
  const safeDetails = Array.isArray(details) ? details : [];
  const filteredDetails = Array.isArray(safeDetails) 
    ? safeDetails.filter(d => d && d.currency === currency && getAmount(d) !== 0)
    : [];
  const hasDetails = filteredDetails.length > 0;

  return (
    <div
      ref={cardRef}
      className="group relative rounded-xl bg-white p-4 shadow-sm transition-all duration-200 hover:scale-[1.01] hover:shadow-lg dark:bg-slate-900 cursor-pointer"
      onMouseEnter={() => setShowDetails(true)}
      onMouseLeave={() => setShowDetails(false)}
    >
      <div className="mb-2 flex items-center gap-3">
        <span className="text-2xl" role="img" aria-label={icon}>
          {iconMap[icon]}
        </span>
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {title}
        </span>
      </div>
      
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold text-slate-900 dark:text-white">
          {formatCurrency(value, currency)} {currency}
        </div>
        {trend && (
          <span
            className={`text-sm font-semibold ${
              trend.direction === 'up'
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {trend.direction === 'up' ? '↑' : '↓'} {trend.percentage.toFixed(1)}%
          </span>
        )}
      </div>

      {/* Details Popover - Rendered via Portal */}
      {showDetails && hasDetails && createPortal(
        <div
          className={`fixed bg-slate-900 dark:bg-slate-950 border border-slate-700 rounded-lg shadow-2xl max-h-96 overflow-y-auto ${
            openDirection === 'up' ? 'animate-slideUp origin-bottom' : 'animate-slideDown origin-top'
          }`}
          style={{
            top: openDirection === 'down' ? dropdownPosition.top : 'auto',
            bottom: openDirection === 'up' ? `calc(100vh - ${dropdownPosition.top}px)` : 'auto',
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 9999,
          }}
          onMouseEnter={() => setShowDetails(true)}
          onMouseLeave={() => setShowDetails(false)}
        >
          <div className="p-4">
            <div className="border-b border-slate-700 pb-2 mb-3">
              <h4 className="text-sm font-semibold text-white">
                {t('finance.details.title', 'Tafsilotlar')}
              </h4>
            </div>

            <div className="space-y-2">
              {filteredDetails.map((detail) => {
                const amount = getAmount(detail);
                const percentage = value > 0 ? (amount / value) * 100 : 0;

                return (
                  <div
                    key={detail.account_id}
                    className="border-b border-slate-800 pb-2 last:border-0 hover:bg-slate-800/50 rounded px-2 py-1 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="inline-block px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-xs font-medium flex-shrink-0">
                          {detail.account_type_display || detail.account_type}
                        </span>
                        <span className="text-sm text-slate-300 truncate">
                          {detail.account_name}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-semibold flex-shrink-0 ml-2 ${
                          type === 'expense'
                            ? 'text-red-400'
                            : type === 'income'
                            ? 'text-green-400'
                            : 'text-blue-400'
                        }`}
                      >
                        {formatNumber(amount)} {currency}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            type === 'expense'
                              ? 'bg-red-500'
                              : type === 'income'
                              ? 'bg-green-500'
                              : 'bg-blue-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 w-12 text-right flex-shrink-0">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Summary */}
            <div className="border-t border-slate-700 pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-400">
                  {t('finance.details.total', 'Jami')}
                </span>
                <span className="text-base font-bold text-white">
                  {formatNumber(value)} {currency}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {filteredDetails.length} {t('finance.details.accounts', 'ta hisob')}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Hover Indicator */}
      {hasDetails && (
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg
            className="w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      )}

      {/* Animation styles */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.2s ease-out;
        }
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default BalanceCard;
