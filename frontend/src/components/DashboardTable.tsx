import { Table, theme } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

interface OverdueReceivable {
  id: number;
  dealer_name: string;
  days_overdue: number;
  amount_usd: number;
}

interface DashboardTableProps {
  data: OverdueReceivable[];
  loading?: boolean;
}

const DashboardTable = ({ data, loading }: DashboardTableProps) => {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  
  const columns: ColumnsType<OverdueReceivable> = [
    {
      title: t('dashboard.dealerName'),
      dataIndex: 'dealer_name',
      key: 'dealer_name',
      render: (text: string) => (
        <span className="font-semibold" style={{ color: token.colorText }}>
          {text}
        </span>
      ),
    },
    {
      title: t('dashboard.daysOverdue'),
      dataIndex: 'days_overdue',
      key: 'days_overdue',
      align: 'center',
      render: (days: number) => (
        <span
          className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            backgroundColor: days > 30 
              ? (isDark ? '#7f1d1d' : '#fee2e2')
              : days > 15 
              ? (isDark ? '#78350f' : '#fef3c7')
              : (isDark ? '#1e3a8a' : '#dbeafe'),
            color: days > 30 
              ? (isDark ? '#fca5a5' : '#991b1b')
              : days > 15 
              ? (isDark ? '#fcd34d' : '#92400e')
              : (isDark ? '#93c5fd' : '#1e40af'),
          }}
        >
          {days} kun
        </span>
      ),
      sorter: (a, b) => a.days_overdue - b.days_overdue,
    },
    {
      title: t('dashboard.amountUsd'),
      dataIndex: 'amount_usd',
      key: 'amount_usd',
      align: 'right',
      render: (amount: number) => (
        <span className="text-base font-bold text-rose-600">
          ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
      sorter: (a, b) => a.amount_usd - b.amount_usd,
    },
  ];

  const total = data.reduce((sum, item) => sum + item.amount_usd, 0);

  return (
    <div>
      {data.length > 0 && (
        <div className="mb-4 flex items-center justify-end">
          <span className="text-sm font-normal" style={{ color: token.colorTextSecondary }}>
            {t('dashboard.totalDebt')}: <span className="font-bold text-rose-600">${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </span>
        </div>
      )}
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: false,
          showTotal: (total) => `${t('dashboard.totalDebt')}: ${total}`,
        }}
        locale={{
          emptyText: t('dashboard.overdueReceivables') + " yo'q",
        }}
        className="professional-table"
        style={{ 
          borderRadius: '8px', 
          overflow: 'hidden',
          backgroundColor: token.colorBgContainer,
        }}
      />
    </div>
  );
};

export default DashboardTable;
