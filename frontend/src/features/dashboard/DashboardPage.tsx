import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from 'antd';
import { DollarOutlined, WalletOutlined, ShoppingOutlined } from '@ant-design/icons';
import { Responsive as ResponsiveGridLayout, WidthProvider } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGrid = WidthProvider(ResponsiveGridLayout);

import { formatCurrency, formatQuantity } from '../../utils/formatters';
import { loadCache, saveCache } from '../../utils/storage';
import DashboardFilterBar from '../../components/DashboardFilterBar';
import DashboardTable from '../../components/DashboardTable';
import KpiCard from '../../components/KpiCard';
import DebtByDealerChart from '@/components/DebtByDealerChart';
import DebtByRegionPie from '@/components/DebtByRegionPie';
import DebtTrendChart from '@/components/DebtTrendChart';
import {
  TopProductsCard,
  TopCategoriesCard,
  TopDealersCard,
  ProductTrendLineChart,
  RegionProductHeatmap,
} from '../../components/analytics';
import ExpenseMetrics from '../../components/analytics/ExpenseMetrics';
import { WidgetWrapper } from '../../components/WidgetWrapper';
import { useDashboardStore } from '../../store/useDashboardStore';
import type { DashboardFilters } from '../../store/useDashboardStore';
import { useAuthStore } from '../../auth/useAuthStore';
import type { DashboardSummary } from '../../services/dashboardService';
import type { DebtAnalytics } from '@/types/dashboard';
import {
  fetchDashboardSummary,
  fetchInventoryStats,
  type InventoryStats,
  fetchTopProducts,
  fetchRegionProducts,
  fetchProductTrend,
  fetchTopCategories,
  fetchTopDealers,
  type TopProductItem,
  type RegionProductItem,
  type ProductTrendPeriod,
  type CategoryItem,
  type TopDealerItem,
  fetchDashboardLayout,
  saveDashboardLayout,
  type DashboardLayoutItem,
} from '../../services/dashboardService';
import { fetchDebtAnalytics } from '@/services/dashboard';
import { fetchExpenseSummary, type ExpenseSummary } from '../../api/expensesApi';

interface DashboardData {
  summary: DashboardSummary;
  analytics: DebtAnalytics | null;
  inventoryStats: InventoryStats | null;
  topProducts: TopProductItem[];
  regionProducts: RegionProductItem[];
  productTrend: ProductTrendPeriod[];
  topCategories: CategoryItem[];
  topDealers: TopDealerItem[];
  expenses: ExpenseSummary | null;
}

// Default layout for dashboard widgets - perfectly aligned with component heights
const DEFAULT_LAYOUT: Layout[] = [
  // Row 1: KPI Cards - 4 statistics cards (h=3 for ~135px with rowHeight=45)
  { i: 'kpi_sales', x: 0, y: 0, w: 3, h: 3, minW: 2, minH: 3 },
  { i: 'kpi_payments', x: 3, y: 0, w: 3, h: 3, minW: 2, minH: 3 },
  { i: 'kpi_debt', x: 6, y: 0, w: 3, h: 3, minW: 2, minH: 3 },
  { i: 'kpi_dealers', x: 9, y: 0, w: 3, h: 3, minW: 2, minH: 3 },
  
  // Row 2: Inventory Stats card
  { i: 'inventory_stats', x: 0, y: 3, w: 4, h: 4, minW: 3, minH: 3 },
  
  // Row 3: Top Products (left) + Expense Analytics mini-cards (right)
  { i: 'top_products', x: 0, y: 7, w: 6, h: 10, minW: 5, minH: 9 },
  { i: 'expense_metrics', x: 6, y: 7, w: 6, h: 3, minW: 5, minH: 3 },
  
  // Row 4: Categories Pie Chart (left) + Region Map (right)
  { i: 'top_categories', x: 6, y: 10, w: 6, h: 10, minW: 4, minH: 9 },
  { i: 'region_products', x: 0, y: 17, w: 6, h: 8, minW: 5, minH: 7 },
  
  // Row 5: Product Trend Line Chart (full width under categories)
  { i: 'product_trend', x: 6, y: 20, w: 6, h: 10, minW: 5, minH: 9 },
  
  // Row 6: Debt Analytics Charts - side by side
  { i: 'debt_by_dealer', x: 0, y: 30, w: 6, h: 8, minW: 5, minH: 7 },
  { i: 'debt_by_region', x: 6, y: 30, w: 6, h: 8, minW: 5, minH: 7 },
  
  // Row 7: Debt Trend - full width
  { i: 'debt_trend', x: 0, y: 38, w: 12, h: 10, minW: 10, minH: 9 },
  
  // Row 8: Top Dealers - full width
  { i: 'top_dealers', x: 0, y: 48, w: 12, h: 8, minW: 10, minH: 7 },
  
  // Row 9: Overdue Receivables - full width table
  { i: 'overdue_receivables', x: 0, y: 56, w: 12, h: 10, minW: 10, minH: 9 },
];

const DashboardPage = () => {
  const { t } = useTranslation();
  const { filters } = useDashboardStore();
  const { role } = useAuthStore();

  const [data, setData] = useState<DashboardData>({
    summary: {
      total_sales: 0,
      total_payments: 0,
      net_profit: 0,
      cash_balance: 0,
      open_orders_count: 0,
      satisfaction_score: 0,
      total_debt: 0,
      total_dealers: 0,
      total_stock_good: 0,
      total_stock_cost: 0,
      dealers: 0,
      overdue_receivables: [],
      revenue_by_month: [],
      revenue_by_product: [],
      inventory_trend: [],
    },
    analytics: null,
    inventoryStats: null,
    topProducts: [],
    regionProducts: [],
    productTrend: [],
    topCategories: [],
    topDealers: [],
    expenses: null,
  });
  const [loading, setLoading] = useState(false);
  const [layout, setLayout] = useState<Layout[]>(DEFAULT_LAYOUT);
  const [collapsedWidgets, setCollapsedWidgets] = useState<Set<string>>(new Set());

  const canViewDebtAnalytics = useMemo(() => role !== 'warehouse', [role]);
  const canViewExpenses = useMemo(() => ['admin', 'accountant', 'owner'].includes(role || ''), [role]);

  // Fetch all dashboard data
  const fetchAll = useCallback(async (overrideFilters?: DashboardFilters) => {
    const effectiveFilters = overrideFilters ?? filters;
    setLoading(true);
    try {
      // Build analytics filters from dashboard filters
      const analyticsFilters = {
        start_date: effectiveFilters.dateRange?.[0],
        end_date: effectiveFilters.dateRange?.[1],
        region_id: effectiveFilters.region,
        dealer_id: effectiveFilters.dealers.length === 1 ? effectiveFilters.dealers[0] : undefined,
        categories: effectiveFilters.categories?.length ? effectiveFilters.categories.join(',') : undefined,
      };

      const [summary, analytics, inventory, topProducts, regionProducts, productTrend, topCategories, topDealers, expenses] = await Promise.all([
        fetchDashboardSummary(effectiveFilters).catch(() => ({
          total_sales: 0,
          total_payments: 0,
          net_profit: 0,
          cash_balance: 0,
          open_orders_count: 0,
          satisfaction_score: 0,
          total_debt: 0,
          total_dealers: 0,
          total_stock_good: 0,
          total_stock_cost: 0,
          dealers: 0,
          overdue_receivables: [],
          revenue_by_month: [],
          revenue_by_product: [],
          inventory_trend: [],
        })),
        canViewDebtAnalytics
          ? fetchDebtAnalytics().catch(() => ({ data: null }))
          : Promise.resolve({ data: null }),
        fetchInventoryStats().catch(() => ({ data: { total_quantity: 0, total_value_usd: 0 } })),
        fetchTopProducts(analyticsFilters).catch(() => ({ data: [] })),
        fetchRegionProducts(analyticsFilters).catch(() => ({ data: [] })),
        fetchProductTrend(analyticsFilters).catch(() => ({ data: [] })),
        fetchTopCategories(analyticsFilters).catch(() => ({ data: [] })),
        fetchTopDealers(analyticsFilters).catch(() => ({ data: [] })),
        canViewExpenses
          ? fetchExpenseSummary(analyticsFilters.start_date, analyticsFilters.end_date).catch(() => null)
          : Promise.resolve(null),
      ]);

      const newData = {
        summary,
        analytics: (analytics?.data as DebtAnalytics | null) ?? null,
        inventoryStats: inventory?.data ?? null,
        topProducts: Array.isArray(topProducts?.data) ? topProducts.data : [],
        regionProducts: Array.isArray(regionProducts?.data) ? regionProducts.data : [],
        productTrend: Array.isArray(productTrend?.data) ? productTrend.data : [],
        topCategories: Array.isArray(topCategories?.data) ? topCategories.data : [],
        topDealers: Array.isArray(topDealers?.data) ? topDealers.data : [],
        expenses: expenses ?? null,
      };

      setData(newData);
      saveCache('dashboard-data', newData);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      // Load from cache on error
      const cached = loadCache<DashboardData>('dashboard-data');
      if (cached) setData(cached);
    } finally {
      setLoading(false);
    }
  }, [filters, canViewDebtAnalytics, canViewExpenses]);

  // Load dashboard layout - priority: backend > localStorage > default
  useEffect(() => {
    const loadLayout = async () => {
      // 1. Try backend first (authoritative source)
      try {
        const response = await fetchDashboardLayout();
        if (response.data.layout && Array.isArray(response.data.layout) && response.data.layout.length > 0) {
          setLayout(response.data.layout);
          // Extract collapsed state
          const collapsed = new Set(
            response.data.layout
              .filter((item) => (item as DashboardLayoutItem).collapsed)
              .map((item) => item.i)
          );
          setCollapsedWidgets(collapsed);
          // Sync to localStorage
          localStorage.setItem('dashboardLayout_lg', JSON.stringify(response.data.layout));
          return;
        }
      } catch (error) {
        console.warn('Failed to load layout from backend, trying localStorage');
      }
      
      // 2. Fallback to localStorage
      try {
        const localLayout = localStorage.getItem('dashboardLayout_lg');
        if (localLayout) {
          const parsed = JSON.parse(localLayout);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLayout(parsed);
            // Extract collapsed state
            const collapsed = new Set(
              parsed
                .filter((item: DashboardLayoutItem) => item.collapsed)
                .map((item: DashboardLayoutItem) => item.i)
            );
            setCollapsedWidgets(collapsed);
            return;
          }
        }
      } catch (error) {
        console.warn('Failed to load layout from localStorage');
      }
      
      // 3. Use default layout if all fails (already set in state)
    };
    loadLayout();
  }, []);

  // Toggle widget collapse/expand
  const toggleWidgetCollapse = useCallback((widgetId: string) => {
    setCollapsedWidgets(prev => {
      const next = new Set(prev);
      if (next.has(widgetId)) {
        next.delete(widgetId);
      } else {
        next.add(widgetId);
      }
      return next;
    });
    
    // Update layout with collapsed state
    setLayout(prev => {
      const updated = prev.map(item => {
        if (item.i === widgetId) {
          const isCollapsing = !collapsedWidgets.has(widgetId);
          return {
            ...item,
            collapsed: isCollapsing,
            h: isCollapsing ? 1 : (item.minH || 2), // Collapse to 1 row height
          } as DashboardLayoutItem;
        }
        return item;
      });
      
      // Save to localStorage and backend
      try {
        localStorage.setItem('dashboardLayout_lg', JSON.stringify(updated));
      } catch (error) {
        console.warn('Failed to save collapsed state to localStorage');
      }
      
      // Debounce backend save
      setTimeout(() => {
        saveDashboardLayout(updated as DashboardLayoutItem[]).catch(() => {
          console.warn('Failed to save collapsed state to backend');
        });
      }, 300);
      
      return updated;
    });
  }, [collapsedWidgets]);

  // Save layout when it changes with validation and localStorage backup
  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    // Validate and fix layout to prevent negative positions and min sizes
    const fixedLayout = newLayout.map(item => {
      const existingItem = layout.find(l => l.i === item.i) as DashboardLayoutItem | undefined;
      return {
        ...item,
        y: Math.max(item.y, 0),
        h: Math.max(item.h, 2),
        w: Math.max(item.w, 2),
        collapsed: existingItem?.collapsed || collapsedWidgets.has(item.i),
        minW: existingItem?.minW,
        minH: existingItem?.minH,
      };
    });
    
    setLayout(fixedLayout);
    
    // Save to localStorage immediately for offline support and faster load
    try {
      localStorage.setItem('dashboardLayout_lg', JSON.stringify(fixedLayout));
      localStorage.setItem('dashboardLayout_md', JSON.stringify(fixedLayout));
      localStorage.setItem('dashboardLayout_sm', JSON.stringify(fixedLayout));
      localStorage.setItem('dashboardLayout_xs', JSON.stringify(fixedLayout));
    } catch (error) {
      console.warn('Failed to save layout to localStorage:', error);
    }
    
    // Debounce save to backend API to avoid too many API calls
    const timeoutId = setTimeout(() => {
      saveDashboardLayout(fixedLayout as DashboardLayoutItem[]).catch(() => {
        // Silently fail - layout will be reset on next load
      });
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [collapsedWidgets, layout]);

  // Initial data load
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Event listeners for real-time updates
  useEffect(() => {
    const events = ['orders:refresh', 'payments:refresh', 'currency:refresh'];
    const handler = () => void fetchAll();
    events.forEach((event) => window.addEventListener(event, handler));
    return () => events.forEach((event) => window.removeEventListener(event, handler));
  }, [fetchAll]);

  return (
    <section className="page-wrapper space-y-8">
      {/* Header */}
      <header>
        <p className="text-sm uppercase tracking-widest text-slate-500 dark:text-slate-400">
          {t('dashboard.ownerKpi')}
        </p>
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
          {t('nav.dashboard')}
        </h1>
        <p className="text-slate-500 dark:text-slate-400">{t('app.operations')}</p>
      </header>

      {/* Filter Bar */}
      <DashboardFilterBar onApply={fetchAll} />

      {/* Draggable & Resizable Dashboard Grid */}
      <ResponsiveGrid
        className="layout"
        layouts={{ lg: layout, md: layout, sm: layout, xs: layout }}
        breakpoints={{ lg: 1400, md: 996, sm: 768, xs: 480 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 2 }}
        rowHeight={45}
        margin={[15, 15]}
        containerPadding={[10, 10]}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
        isDraggable={true}
        isResizable={true}
        resizeHandles={['se', 'e', 's']}
        compactType={null}
        preventCollision={false}
      >
        {/* Primary KPI Cards */}
        <div key="kpi_sales">
          <WidgetWrapper
            widgetId="kpi_sales"
            isCollapsed={collapsedWidgets.has('kpi_sales')}
            onToggle={toggleWidgetCollapse}
          >
            <KpiCard
              title="Jami savdolar"
              value={data.summary?.total_sales || 0}
              prefix="$"
              precision={2}
              icon={<DollarOutlined />}
              tooltip="Barcha sotuvlar yig'indisi"
              loading={loading}
            />
          </WidgetWrapper>
        </div>

        <div key="kpi_payments">
          <WidgetWrapper
            widgetId="kpi_payments"
            isCollapsed={collapsedWidgets.has('kpi_payments')}
            onToggle={toggleWidgetCollapse}
          >
            <KpiCard
              title="Jami to'lovlar"
              value={data.summary?.total_payments || 0}
              prefix="$"
              precision={2}
              icon={<WalletOutlined />}
              tooltip="Tasdiqlangan to'lovlar"
              loading={loading}
            />
          </WidgetWrapper>
        </div>

        {canViewDebtAnalytics && (
          <div key="kpi_debt">
            <WidgetWrapper
              widgetId="kpi_debt"
              isCollapsed={collapsedWidgets.has('kpi_debt')}
              onToggle={toggleWidgetCollapse}
            >
              <KpiCard
                title="Umumiy qarzdorlik"
                value={data.analytics?.total_debt ?? data.summary?.total_debt ?? 0}
                prefix="$"
                precision={2}
                icon={<DollarOutlined />}
                tooltip="Opening + Orders - Payments - Returns"
                loading={loading}
                valueStyle={{ color: '#dc2626' }}
              />
            </WidgetWrapper>
          </div>
        )}

        <div key="kpi_dealers">
          <WidgetWrapper
            widgetId="kpi_dealers"
            isCollapsed={collapsedWidgets.has('kpi_dealers')}
            onToggle={toggleWidgetCollapse}
          >
            <KpiCard
              title="Dilerlar soni"
              value={data.summary?.total_dealers ?? data.summary?.dealers ?? 0}
              precision={0}
              icon={<ShoppingOutlined />}
              tooltip="Faol dilerlar"
              loading={loading}
            />
          </WidgetWrapper>
        </div>

        {/* Inventory Stats */}
        <div key="inventory_stats">
          <WidgetWrapper
            widgetId="inventory_stats"
            isCollapsed={collapsedWidgets.has('inventory_stats')}
            onToggle={toggleWidgetCollapse}
          >
            <Card className="shadow-sm hover:shadow-md transition-shadow" style={{ height: '100%' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.inventory.title')}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                    {loading ? '...' : formatQuantity(data.summary?.total_stock_good ?? data.inventoryStats?.total_quantity ?? 0)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('dashboard.inventory.unit')}</p>
                </div>
                <div className="rounded-full bg-blue-100 p-4 dark:bg-blue-900">
                  <ShoppingOutlined style={{ fontSize: '24px', color: '#3b82f6' }} />
                </div>
              </div>
              <div className="mt-4 border-t pt-4 dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.inventory.totalValue')}</p>
                <p className="mt-1 text-xl font-semibold text-green-600 dark:text-green-400">
                  ${loading ? '...' : formatCurrency(data.summary?.total_stock_cost ?? data.inventoryStats?.total_value_usd ?? 0)}
                </p>
              </div>
            </Card>
          </WidgetWrapper>
        </div>

        {/* Debt Analytics */}
        {canViewDebtAnalytics && data.analytics && (
          <>
            <div key="debt_by_dealer">
              <WidgetWrapper
                widgetId="debt_by_dealer"
                isCollapsed={collapsedWidgets.has('debt_by_dealer')}
                onToggle={toggleWidgetCollapse}
              >
                <DebtByDealerChart data={data.analytics.by_dealers} loading={loading} />
              </WidgetWrapper>
            </div>
            <div key="debt_by_region">
              <WidgetWrapper
                widgetId="debt_by_region"
                isCollapsed={collapsedWidgets.has('debt_by_region')}
                onToggle={toggleWidgetCollapse}
              >
                <DebtByRegionPie data={data.analytics.by_regions} loading={loading} />
              </WidgetWrapper>
            </div>
            <div key="debt_trend">
              <WidgetWrapper
                widgetId="debt_trend"
                isCollapsed={collapsedWidgets.has('debt_trend')}
                onToggle={toggleWidgetCollapse}
              >
                <DebtTrendChart data={data.analytics.monthly} loading={loading} />
              </WidgetWrapper>
            </div>
          </>
        )}

        {/* Expense Analytics */}
        {canViewExpenses && (
          <div key="expense_metrics">
            <WidgetWrapper
              widgetId="expense_metrics"
              isCollapsed={collapsedWidgets.has('expense_metrics')}
              onToggle={toggleWidgetCollapse}
            >
              <ExpenseMetrics data={data.expenses} loading={loading} />
            </WidgetWrapper>
          </div>
        )}

        {/* Top Products */}
        <div key="top_products">
          <WidgetWrapper
            widgetId="top_products"
            isCollapsed={collapsedWidgets.has('top_products')}
            onToggle={toggleWidgetCollapse}
          >
            <TopProductsCard data={data.topProducts} loading={loading} />
          </WidgetWrapper>
        </div>

        {/* Top Categories */}
        <div key="top_categories">
          <WidgetWrapper
            widgetId="top_categories"
            isCollapsed={collapsedWidgets.has('top_categories')}
            onToggle={toggleWidgetCollapse}
          >
            <TopCategoriesCard data={data.topCategories} loading={loading} />
          </WidgetWrapper>
        </div>

        {/* Region Products */}
        <div key="region_products">
          <WidgetWrapper
            widgetId="region_products"
            isCollapsed={collapsedWidgets.has('region_products')}
            onToggle={toggleWidgetCollapse}
          >
            <RegionProductHeatmap data={data.regionProducts} loading={loading} />
          </WidgetWrapper>
        </div>

        {/* Product Trend */}
        <div key="product_trend">
          <WidgetWrapper
            widgetId="product_trend"
            isCollapsed={collapsedWidgets.has('product_trend')}
            onToggle={toggleWidgetCollapse}
          >
            <ProductTrendLineChart data={data.productTrend} loading={loading} />
          </WidgetWrapper>
        </div>

        {/* Top Dealers */}
        <div key="top_dealers">
          <WidgetWrapper
            widgetId="top_dealers"
            isCollapsed={collapsedWidgets.has('top_dealers')}
            onToggle={toggleWidgetCollapse}
          >
            <TopDealersCard data={data.topDealers} loading={loading} />
          </WidgetWrapper>
        </div>

        {/* Overdue Receivables Table */}
        <div key="overdue_receivables">
          <WidgetWrapper
            widgetId="overdue_receivables"
            isCollapsed={collapsedWidgets.has('overdue_receivables')}
            onToggle={toggleWidgetCollapse}
          >
            <Card
              title={t('dashboard.overdueReceivables')}
              className="shadow-sm hover:shadow-md transition-shadow"
            >
              <DashboardTable
                data={Array.isArray(data.summary?.overdue_receivables) ? data.summary.overdue_receivables : []}
                loading={loading}
              />
            </Card>
          </WidgetWrapper>
        </div>
      </ResponsiveGrid>
    </section>
  );
};

export default DashboardPage;
