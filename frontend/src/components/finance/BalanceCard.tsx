import { formatCurrency } from '../../utils/formatters';

interface BalanceCardProps {
  icon: 'money' | 'credit-card' | 'bank';
  title: string;
  value: number;
  currency: 'USD' | 'UZS';
}

const iconMap = {
  'money': '💵',
  'credit-card': '💳',
  'bank': '🏦',
};

/**
 * BalanceCard - Display cashbox balance with icon, title, and formatted amount
 * 
 * Features:
 * - Icon indicator for type (cash, card, bank)
 * - Formatted currency display
 * - Hover scale effect
 * - Dark mode support
 * - Responsive design
 */
const BalanceCard = ({ icon, title, value, currency }: BalanceCardProps) => {
  return (
    <div className="group rounded-xl bg-white p-4 shadow-sm transition-all duration-200 hover:scale-[1.01] hover:shadow-lg dark:bg-slate-900">
      <div className="mb-2 flex items-center gap-3">
        <span className="text-2xl" role="img" aria-label={icon}>
          {iconMap[icon]}
        </span>
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {title}
        </span>
      </div>
      
      <div className="text-2xl font-bold text-slate-900 dark:text-white">
        {formatCurrency(value, currency)} {currency}
      </div>
    </div>
  );
};

export default BalanceCard;
