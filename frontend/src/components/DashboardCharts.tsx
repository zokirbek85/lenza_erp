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

  const safeData = Array.isArray(data) ? data : [];

  const goldColor = getComputedStyle(document.documentElement).getPropertyValue('--lenza-gold').trim();

  const chartData = {
    labels: safeData.map((d) => d.month),
    datasets: [
      {
        label: t('dashboard.charts.revenue'),
        data: safeData.map((d) => d.total),
        backgroundColor: goldColor,
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
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-body').trim(),
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

const COLORS = [
  '#C9A86C', // Lenza Gold
  '#16A34A', // Success Green
  '#3B82F6', // Primary Blue  
  '#F59E0B', // Warning Orange
  '#DC2626', // Error Red
  '#14B8A6', // Teal
];

export const RevenueSharePie = ({ data }: RevenueShareProps) => {
  const { token } = theme.useToken();

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
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-body').trim(),
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

  const safeData = Array.isArray(data) ? data : [];

  const goldColor = getComputedStyle(document.documentElement).getPropertyValue('--lenza-gold').trim();

  const chartData = {
    labels: safeData.map((d) => d.date),
    datasets: [
      {
        label: t('dashboard.charts.stockValue'),
        data: safeData.map((d) => d.stock_value),
        borderColor: goldColor,
        backgroundColor: 'rgba(201, 168, 108, 0.08)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: goldColor,
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
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-body').trim(),
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
            stroke={getComputedStyle(document.documentElement).getPropertyValue('--bg-secondary').trim()}
            strokeWidth="10"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={
              isOverBudget 
                ? getComputedStyle(document.documentElement).getPropertyValue('--error').trim()
                : percentage > 80 
                  ? getComputedStyle(document.documentElement).getPropertyValue('--warning').trim()
                  : getComputedStyle(document.documentElement).getPropertyValue('--success').trim()
            }
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
