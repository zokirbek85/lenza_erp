import { EyeOutlined } from '@ant-design/icons';
import { formatCurrency, formatDate } from '../../utils/formatters';
import MobileCard, { type MobileCardProps } from '../../components/responsive/cards/MobileCard';
import MobileCardList from '../../components/responsive/cards/MobileCardList';

export type LedgerMobileItem = {
  id: number;
  transaction_date: string;
  dealer?: { name?: string } | null;
  description: string;
  debit_usd: number;
  credit_usd: number;
  balance_usd: number;
  debit_uzs?: number;
  credit_uzs?: number;
  balance_uzs?: number;
  transaction_type: string;
};

export type LedgerMobileHandlers = {
  onView: (ledgerId: number) => void;
};

type LedgerMobileCardProps = {
  entry: LedgerMobileItem;
  handlers: LedgerMobileHandlers;
};

export const LedgerMobileCard = ({ entry, handlers }: LedgerMobileCardProps) => {
  const isDebit = entry.debit_usd > 0;
  const transactionAmount = isDebit ? entry.debit_usd : entry.credit_usd;
  const transactionType = isDebit ? 'Debit' : 'Credit';
  const badgeVariant = isDebit ? 'warning' : 'info';

  const fields = [
    { label: 'Type', value: entry.transaction_type },
    { label: 'Dealer', value: entry.dealer?.name ?? '—' },
    { label: 'Amount (USD)', value: formatCurrency(transactionAmount) },
    { label: 'Balance (USD)', value: formatCurrency(entry.balance_usd) },
    ...(entry.debit_uzs || entry.credit_uzs
      ? [
          {
            label: 'Amount (UZS)',
            value: formatCurrency(isDebit ? entry.debit_uzs || 0 : entry.credit_uzs || 0, 'UZS'),
          },
        ]
      : []),
    ...(entry.balance_uzs ? [{ label: 'Balance (UZS)', value: formatCurrency(entry.balance_uzs, 'UZS') }] : []),
    { label: 'Date', value: formatDate(entry.transaction_date) },
  ];

  const badges: NonNullable<MobileCardProps['badges']> = [
    {
      label: transactionType,
      variant: badgeVariant,
    },
  ];

  const actions = [{ icon: <EyeOutlined />, label: 'View', onClick: () => handlers.onView(entry.id) }];

  return (
    <MobileCard
      title={entry.description}
      subtitle={entry.dealer?.name ?? 'No dealer'}
      badges={badges}
      fields={fields}
      actions={actions}
    />
  );
};

type LedgerMobileCardsProps = {
  data: LedgerMobileItem[];
  handlers: LedgerMobileHandlers;
};

const LedgerMobileCards = ({ data, handlers }: LedgerMobileCardsProps) => (
  <MobileCardList
    data={data}
    keyExtractor={(entry) => entry.id}
    renderCard={(entry) => <LedgerMobileCard key={entry.id} entry={entry} handlers={handlers} />}
  />
);

export default LedgerMobileCards;
