import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import http from '../../app/http';
import BalanceCard from './BalanceCard';

interface CardBalance {
  name: string;
  currency: 'USD' | 'UZS';
  balance: number;
}

interface FinanceBalances {
  cash_uzs: number;
  cash_usd: number;
  bank_usd: number;
  cards: CardBalance[];
}

/**
 * BalancesPanel - Display all finance balances (cash, cards, bank)
 * 
 * Features:
 * - Real-time balance display
 * - Responsive grid (4 columns desktop, 2 columns mobile)
 * - Auto-refresh on mount
 * - Loading state
 * - Error handling
 */
const BalancesPanel = () => {
  const { t } = useTranslation();
  const [balances, setBalances] = useState<FinanceBalances | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const response = await http.get('/finance/balances/');
        setBalances(response.data);
      } catch (error) {
        console.error('Failed to load finance balances:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();
  }, []);

  if (loading) {
    return (
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800"
          />
        ))}
      </div>
    );
  }

  if (!balances) {
    return null;
  }

  // Calculate total number of widgets for responsive grid
  const totalWidgets = 2 + balances.cards.length + (balances.bank_usd > 0 ? 1 : 0);
  const gridCols = totalWidgets <= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-5';

  return (
    <div className={`mb-6 grid grid-cols-2 gap-4 ${gridCols}`}>
      {/* Cash UZS */}
      <BalanceCard
        icon="money"
        title={t('finance.balances.cashUzs')}
        value={balances.cash_uzs}
        currency="UZS"
      />

      {/* Cash USD */}
      <BalanceCard
        icon="money"
        title={t('finance.balances.cashUsd')}
        value={balances.cash_usd}
        currency="USD"
      />

      {/* Card Balances */}
      {balances.cards.map((card, index) => (
        <BalanceCard
          key={`card-${index}`}
          icon="credit-card"
          title={card.name}
          value={card.balance}
          currency={card.currency}
        />
      ))}

      {/* Bank Balance USD - only show if balance exists */}
      {balances.bank_usd > 0 && (
        <BalanceCard
          icon="bank"
          title={t('finance.balances.bank')}
          value={balances.bank_usd}
          currency="USD"
        />
      )}
    </div>
  );
};

export default BalancesPanel;
