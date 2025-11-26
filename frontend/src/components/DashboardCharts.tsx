import { theme } from 'antd';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Revenue Trend by Month - Bar Chart
interface RevenueTrendProps {
  data: Array<{ month: string; total: number }>;
  loading?: boolean;
}

export const RevenueTrendChart = ({ data }: RevenueTrendProps) => {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  const safeData = Array.isArray(data) ? data : [];

  const chartData = {
    labels: safeData.map((d) => d.month),
    datasets: [
      {
        label: t('dashboard.charts.revenue'),
        data: safeData.map((d) => d.total),
        backgroundColor: '#d4af37',
        borderRadius: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: isDark ? '#1b1f27' : '#ffffff',
        titleColor: token.colorText,
        bodyColor: token.colorTextSecondary,
        borderColor: token.colorBorder,
        borderWidth: 1,
        padding: 12,
        displayColors: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: token.colorBorderSecondary,
        },
        ticks: {
          color: token.colorTextSecondary,
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: token.colorTextSecondary,
        },
      },
    },
  };

  return (
    <div style={{ height: '300px' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

// Revenue Share by Product - Doughnut Chart
interface RevenueShareProps {
  data: Array<{ category: string; revenue: number }>;
  loading?: boolean;
}

const COLORS = ['#d4af37', '#0d1117', '#64748b', '#f97316', '#22c55e', '#3b82f6'];

export const RevenueSharePie = ({ data }: RevenueShareProps) => {
  const { token } = theme.useToken();
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  const safeData = Array.isArray(data) ? data : [];

  const chartData = {
    labels: safeData.map((d) => d.category),
    datasets: [
      {
        data: safeData.map((d) => d.revenue),
        backgroundColor: COLORS,
        borderWidth: 2,
        borderColor: token.colorBgContainer,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 15,
          font: {
            size: 12,
          },
          color: token.colorText,
        },
      },
      tooltip: {
        backgroundColor: isDark ? '#1b1f27' : '#ffffff',
        titleColor: token.colorText,
        bodyColor: token.colorTextSecondary,
        borderColor: token.colorBorder,
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context: { parsed: number; label?: string }) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            return `${label}: $${value.toLocaleString()}`;
          },
        },
      },
    },
  };

  return (
    <div style={{ height: '300px' }}>
      <Doughnut data={chartData} options={options} />
    </div>
  );
};

// Inventory Trend - Line Chart
interface InventoryTrendProps {
  data: Array<{ date: string; stock_value: number }>;
  loading?: boolean;
}

export const InventoryTrendLine = ({ data }: InventoryTrendProps) => {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  const safeData = Array.isArray(data) ? data : [];

  const chartData = {
    labels: safeData.map((d) => d.date),
    datasets: [
      {
        label: t('dashboard.charts.stockValue'),
        data: safeData.map((d) => d.stock_value),
        borderColor: '#d4af37',
        backgroundColor: isDark ? 'rgba(212, 175, 55, 0.1)' : 'rgba(212, 175, 55, 0.05)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#d4af37',
        pointBorderColor: token.colorBgContainer,
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: isDark ? '#1b1f27' : '#ffffff',
        titleColor: token.colorText,
        bodyColor: token.colorTextSecondary,
        borderColor: token.colorBorder,
        borderWidth: 1,
        padding: 12,
        displayColors: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: token.colorBorderSecondary,
        },
        ticks: {
          color: token.colorTextSecondary,
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: token.colorTextSecondary,
        },
      },
    },
  };

  return (
    <div style={{ height: '300px' }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

// Expenses vs Budget - Gauge/Progress
interface ExpensesGaugeProps {
  expenses: number;
  budget: number;
  loading?: boolean;
}

export const ExpensesGauge = ({ expenses, budget }: ExpensesGaugeProps) => {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  
  const percentage = budget > 0 ? Math.round((expenses / budget) * 100) : 0;
  const isOverBudget = percentage > 100;

  return (
    <div className="flex h-[300px] flex-col items-center justify-center">
      <div className="relative h-40 w-40">
        <svg viewBox="0 0 100 100" className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={isDark ? '#2a2a2a' : '#f1f5f9'}
            strokeWidth="10"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={isOverBudget ? '#ff4d4f' : percentage > 80 ? '#faad14' : '#52c41a'}
            strokeWidth="10"
            strokeDasharray={`${(percentage / 100) * 283} 283`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color: token.colorText }}>
            {percentage}%
          </span>
          <span className="text-xs" style={{ color: token.colorTextSecondary }}>
            {t('dashboard.charts.used')}
          </span>
        </div>
      </div>
      <div className="mt-6 grid w-full grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-xs" style={{ color: token.colorTextSecondary }}>
            {t('dashboard.charts.expenses')}
          </p>
          <p className="text-lg font-semibold" style={{ color: token.colorText }}>
            ${expenses.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: token.colorTextSecondary }}>
            {t('dashboard.charts.budget')}
          </p>
          <p className="text-lg font-semibold" style={{ color: token.colorText }}>
            ${budget.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};
