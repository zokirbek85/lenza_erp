import type { FormEvent } from 'react';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Collapse } from 'antd';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import http from '../app/http';
import { useAuthStore } from '../auth/useAuthStore';
import StatusBadge from '../components/StatusBadge';
import OrderStatus from '../components/OrderStatus';
import Money from '../components/Money';
import OrderHistory from '../components/OrderHistory';
import PaginationControls from '../components/PaginationControls';
import OrderItemTable from '../features/orders/OrderItemTable';
import { usePersistedPageSize } from '../hooks/usePageSize';
import { loadDraftOrder, saveDraftOrder, useOrderStore } from '../store/useOrderStore';
import { downloadFile } from '../utils/download';
import { cleanName, formatCurrency, formatDate, formatQuantity } from '../utils/formatters';
import { toArray } from '../utils/api';
import { loadCache, saveCache } from '../utils/storage';
import { useIsMobile } from '../hooks/useIsMobile';
import FilterDrawer from '../components/responsive/filters/FilterDrawer';
import FilterTrigger from '../components/responsive/filters/FilterTrigger';
import OrdersMobileCards from './_mobile/OrdersMobileCards';
import type { OrdersMobileHandlers } from './_mobile/OrdersMobileCards';

interface DealerOption {
  id: number;
  name: string;
}

interface ProductOption {
  id: number;
  name: string;
  sell_price_usd: number;
  stock_ok?: number;
  stock_defect?: number;
  total_stock?: number;
  brand?: { id: number; name: string } | null;
  category?: { id: number; name: string } | null;
}

interface BrandOption {
  id: number;
  name: string;
}

interface CategoryOption {
  id: number;
  name: string;
}

interface OrderItem {
  id: number;
  product: number;
  product_detail?: ProductOption | null;
  qty: number;
  price_usd: number;
}

interface Order {
  id: number;
  display_no: string;
  dealer: DealerOption;
  status: string;
  total_usd: number;
  value_date: string;
  is_reserve: boolean;
  items: OrderItem[];
}

const CREATE_FORM_PANEL_KEY = 'create-order';
const DEFAULT_QTY = '1.00';

const normalizeQuantityValue = (value: string | number): number => {
  if (value === null || value === undefined) {
    return NaN;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return NaN;
    }
    return Math.round(value * 100) / 100;
  }
  const normalized = value.replace(',', '.').trim();
  if (!normalized) {
    return NaN;
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return NaN;
  }
  return Math.round(parsed * 100) / 100;
};

const formatQuantityInputValue = (value: string | number, fallback = DEFAULT_QTY) => {
  const normalized = normalizeQuantityValue(value);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return fallback;
  }
  return normalized.toFixed(2);
};

const OrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [dealers, setDealers] = useState<DealerOption[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [dealerId, setDealerId] = useState('');
  const [orderType, setOrderType] = useState<'regular' | 'reserve'>('regular');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePersistedPageSize('orders_page_size');
  const [totalOrders, setTotalOrders] = useState(0);
  const [draftInitialized, setDraftInitialized] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [quantityInput, setQuantityInput] = useState(DEFAULT_QTY);
  const [priceInput, setPriceInput] = useState('');
  const [productsLoading, setProductsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { t } = useTranslation();
  const { isMobile } = useIsMobile();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const role = useAuthStore((state) => state.role);
  const isWarehouse = role === 'warehouse';

  const {
    filters,
    setFilters,
    products: availableProducts,
    fetchProducts,
    selectedProduct,
    setSelectedProduct,
    selectedItems,
    setSelectedItems,
    addItem,
    updateItem,
    removeItem,
    clearOrder,
  } = useOrderStore();

  const { brandId, categoryId } = filters;

  const handleToggleCreateForm = () => {
    setShowCreateForm((previous) => !previous);
  };

  const handleCollapseChange = (keys: string | string[]) => {
    if (Array.isArray(keys)) {
      setShowCreateForm(keys.includes(CREATE_FORM_PANEL_KEY));
    } else {
      setShowCreateForm(keys === CREATE_FORM_PANEL_KEY);
    }
  };

  const fetchAllPages = useCallback(async <T,>(endpoint: string) => {
    const collected: T[] = [];
    let nextUrl: string | null = endpoint;
    while (nextUrl) {
      // Normalize URL: if it's a full URL, extract just the path and query
      // This ensures we use the http client's baseURL (which has HTTPS)
      let url = nextUrl;
      if (url.startsWith('http://') || url.startsWith('https://')) {
        try {
          const urlObj = new URL(url);
          // Use pathname + search to get relative URL (e.g., /api/dealers/?page=2)
          url = urlObj.pathname + urlObj.search;
          // Remove /api prefix if present since http client baseURL already includes it
          if (url.startsWith('/api/')) {
            url = url.substring(4); // Remove '/api' prefix
          }
        } catch (e) {
          console.warn('Failed to parse pagination URL:', url);
        }
      }
      
      const response = await http.get<unknown>(url);
      const payload: unknown = response.data;
      collected.push(...toArray<T>(payload));
      nextUrl =
        payload && typeof payload === 'object' && payload !== null && 'next' in payload
          ? ((payload as { next?: string | null }).next ?? null)
          : null;
    }
    return collected;
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await http.get('/orders/', { params: { page, page_size: pageSize } });
      const data = response.data;
      let normalized: Order[];
      if (data && typeof data === 'object' && Array.isArray(data.results)) {
        normalized = data.results as Order[];
        setTotalOrders(Number(data.count) || 0);
      } else {
        normalized = toArray<Order>(data);
        setTotalOrders(normalized.length);
      }
      setOrders(normalized);
      saveCache('orders-data', normalized);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load orders');
      const cached = loadCache<Order[]>('orders-data');
      if (cached) {
        setOrders(cached);
        setTotalOrders(cached.length);
      } else {
        setOrders([]);
        setTotalOrders(0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  const loadRefs = useCallback(async () => {
    try {
      console.log('Loading dealers, brands, categories...');
      const [dealersData, brandsData, categoriesData] = await Promise.all([
        fetchAllPages<DealerOption>('/dealers/'),
        fetchAllPages<BrandOption>('/brands/'),
        fetchAllPages<CategoryOption>('/categories/'),
      ]);
      console.log('Loaded data:', { dealers: dealersData.length, brands: brandsData.length, categories: categoriesData.length });
      setDealers(dealersData);
      setBrands(brandsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading references:', error);
      throw error;
    }
  }, [fetchAllPages]);

  useEffect(() => {
    loadRefs().catch((error) => {
      console.error(error);
      toast.error('Failed to load references');
    });
    loadOrders().catch(() => {
      const cached = loadCache<Order[]>('orders-data');
      if (cached) setOrders(cached);
    });
  }, [loadOrders, loadRefs]);

  useEffect(() => {
    const handler = () => {
      loadOrders().catch(() => null);
    };
    window.addEventListener('orders:refresh', handler);
    return () => window.removeEventListener('orders:refresh', handler);
  }, [loadOrders]);

  useEffect(() => {
    if (totalOrders === 0) {
      if (page !== 1) setPage(1);
      return;
    }
    const maxPage = Math.max(1, Math.ceil(totalOrders / pageSize));
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [totalOrders, pageSize, page]);

  const loadProducts = useCallback(async (searchText = '') => {
    setProductsLoading(true);
    try {
      await fetchProducts(searchText);
    } catch (error) {
      console.error(error);
      toast.error(t('orders.toast.productsLoadError'));
    } finally {
      setProductsLoading(false);
    }
  }, [fetchProducts]);

  useEffect(() => {
    loadProducts(productSearch).catch(() => null);
  }, [loadProducts, brandId, categoryId, productSearch]);

  useEffect(() => {
    if (draftInitialized) return;
    const draft = loadDraftOrder();
    if (draft.length) {
      setSelectedItems(draft);
    }
    setDraftInitialized(true);
  }, [draftInitialized, setSelectedItems]);

  useEffect(() => {
    if (!draftInitialized) return;
    saveDraftOrder(selectedItems);
  }, [selectedItems, draftInitialized]);

  useEffect(() => {
    if (selectedProduct && !availableProducts.some((product) => product.id === selectedProduct.id)) {
      setSelectedProduct(null);
    }
  }, [availableProducts, selectedProduct, setSelectedProduct]);

  useEffect(() => {
    if (showCreateForm && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [showCreateForm]);

  const filteredProducts = useMemo(() => availableProducts, [availableProducts]);

  const resetProductInputs = useCallback(() => {
    setSelectedProduct(null);
    setProductSearch('');
    setQuantityInput(DEFAULT_QTY);
    setPriceInput('');
  }, [setSelectedProduct]);

  const handleFilterChange = (field: 'brandId' | 'categoryId', value: string) => {
    setFilters({ [field]: value || undefined });
    setPage(1);
  };

  const handleSelectProduct = (value: string) => {
    if (!value) {
      setSelectedProduct(null);
      return;
    }
    const product = availableProducts.find((prod) => prod.id === Number(value));
    if (product) {
      setSelectedProduct(product);
      setQuantityInput(DEFAULT_QTY);
      setPriceInput(String(product.sell_price_usd ?? 0));
    }
  };

  const handleAddSelectedProduct = () => {
    if (!selectedProduct) {
      toast.error(t('orders.toast.selectProduct'));
      return;
    }
    const normalizedQty = normalizeQuantityValue(quantityInput || DEFAULT_QTY);
    if (!Number.isFinite(normalizedQty) || normalizedQty <= 0) {
      toast.error(t('orders.toast.invalidQuantity'));
      return;
    }
    const qtyValue = Number(normalizedQty.toFixed(2));
    const priceValue = Number(priceInput || selectedProduct.sell_price_usd || 0);
    if (!Number.isFinite(priceValue) || priceValue < 0) {
      toast.error(t('orders.toast.invalidPrice'));
      return;
    }
    addItem({
      product: selectedProduct.id,
      productName: selectedProduct.name,
      qty: qtyValue,
      price_usd: priceValue,
    });
    toast.success(t('orders.toast.itemAdded'));
    setQuantityInput(DEFAULT_QTY);
    setPriceInput(String(selectedProduct.sell_price_usd ?? 0));
  };

  const handleItemQtyChange = (productId: number, qty: number) => {
    const normalizedQty = normalizeQuantityValue(qty);
    if (!Number.isFinite(normalizedQty) || normalizedQty <= 0) {
      toast.error(t('orders.toast.invalidQuantity'));
      return;
    }
    updateItem(productId, { qty: Number(normalizedQty.toFixed(2)) });
  };

  const handleItemPriceChange = (productId: number, price: number) => {
    if (!Number.isFinite(price) || price < 0) {
      toast.error(t('orders.toast.invalidPrice'));
      return;
    }
    updateItem(productId, { price_usd: price });
  };

  const handleClearDraft = () => {
    clearOrder();
    setNote('');
    resetProductInputs();
    toast.success(t('orders.toast.draftCleared'));
  };

  const handleViewOrder = (orderId: number) => toggleOrderDetails(orderId);
  const handleEditOrder = (orderId: number) => {
    setShowCreateForm(true);
    toggleOrderDetails(orderId);
  };
  const handleStatusUpdatedFromCards = (orderId: number, newStatus: string) => {
    handleStatusUpdated(orderId, newStatus);
  };

  const filtersContent = (
    <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {t('orders.filters.brand')}
        </label>
        <select
          value={brandId ?? ''}
          onChange={(event) => handleFilterChange('brandId', event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          <option value="">{t('orders.filters.allBrands')}</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {t('orders.filters.category')}
        </label>
        <select
          value={categoryId ?? ''}
          onChange={(event) => handleFilterChange('categoryId', event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          <option value="">{t('orders.filters.allCategories')}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!dealerId) {
      toast.error(t('orders.toast.dealerRequired'));
      return;
    }
    if (!selectedItems.length) {
      toast.error(t('orders.toast.itemsRequired'));
      return;
    }

    const payloadItems = selectedItems.map((item) => ({
      product: item.product,
      qty: item.qty,
      price_usd: item.price_usd,
    }));

    try {
      await http.post('/orders/', {
        dealer: Number(dealerId),
        status: 'created',
        is_reserve: orderType === 'reserve',
        note,
        items: payloadItems,
      });
      setDealerId('');
      setOrderType('regular');
      setNote('');
      clearOrder();
      resetProductInputs();
      toast.success(t('orders.toast.created'));
      setShowCreateForm(false);
      loadOrders().catch(() => null);
    } catch (error) {
      console.error(error);
      toast.error(t('orders.toast.createError'));
    }
  };

  const handleStatusUpdated = (orderId: number, newStatus: string) => {
    // OrderStatus komponenti muvaffaqiyatli yangilanganda chaqiriladi
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
  };

  const handlePdf = async (orderId?: number, displayNo?: string) => {
    try {
      if (orderId) {
        const filename = displayNo ? `${displayNo}.pdf` : `order-${orderId}.pdf`;
        await downloadFile(`/orders/${orderId}/pdf/`, filename);
      } else {
        await downloadFile('/orders/report/pdf/', 'orders.pdf');
      }
    } catch (error) {
      console.error(error);
      toast.error(t('orders.toast.pdfError'));
    }
  };

  const handleExcel = () => downloadFile('/orders/export/excel/', 'orders.xlsx');

  const handleDownloadTemplate = async () => {
    try {
      await downloadFile('/orders/import/template/', 'orders_import_template.xlsx');
      toast.success(t('orders.import.downloadTemplate'));
    } catch (error) {
      console.error(error);
      toast.error(t('orders.import.errorMessage'));
    }
  };

  const handleImportOrders = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast.error(t('orders.import.noFile'));
      return;
    }

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error(t('orders.import.invalidFormat'));
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const loadingToast = toast.loading(t('orders.import.importing'));

    try {
      const response = await http.post('/orders/import/excel/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data;
      toast.dismiss(loadingToast);

      if (data.errors && data.errors.length > 0) {
        toast.success(
          t('orders.import.partialSuccessMessage', {
            orders: data.orders_created,
          }),
          { duration: 5000 }
        );
        console.warn('Import errors:', data.errors);
      } else {
        toast.success(
          t('orders.import.successMessage', {
            orders: data.orders_created,
            items: data.items_created,
          })
        );
      }

      // Refresh orders list
      loadOrders().catch(() => null);
    } catch (error) {
      console.error(error);
      toast.dismiss(loadingToast);
      toast.error(t('orders.import.errorMessage'));
    }

    // Reset input
    event.target.value = '';
  };

  const toggleOrderDetails = (orderId: number) =>
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));

  const resetFilters = () => {
    setFilters({ brandId: undefined, categoryId: undefined });
    setFiltersOpen(false);
  };

  const handleApplyFilters = () => {
    setFiltersOpen(false);
  };

  const mobileHandlers: OrdersMobileHandlers = {
    onView: handleViewOrder,
    onEdit: handleEditOrder,
    onStatusUpdated: handleStatusUpdatedFromCards,
  };

  // Always run useMemo before conditional rendering to maintain hooks order
  const orderRows = useMemo(
    () =>
      orders.map((order) => ({
        ...order,
        total: formatCurrency(order.total_usd),
      })),
    [orders]
  );

  // Mobile view
  if (isMobile) {
    return (
      <div className="space-y-4 px-4 pb-6">
        <header className="flex items-center justify-between py-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t('nav.orders')}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('orders.header.subtitle')}</p>
          </div>
          {!isWarehouse && (
            <button
              onClick={handleToggleCreateForm}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-emerald-500 dark:text-slate-900"
              style={{ position: 'relative', zIndex: 2100 }}
            >
              {showCreateForm ? t('orders.header.hideForm') : t('orders.header.showForm')}
            </button>
          )}
        </header>

        {/* Mobile Create Form Overlay */}
        {!isWarehouse && showCreateForm && (
          <div
            className="fixed inset-0 z-[3000] bg-white dark:bg-slate-900"
            style={{ top: 0, left: 0, right: 0, bottom: 0, overflowY: 'auto' }}
          >
            <div className="space-y-4 p-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {t('orders.header.panelTitle')}
                </h2>
                <button
                  onClick={handleToggleCreateForm}
                  className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
                >
                  ✕ {t('common:actions.close')}
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {t('orders.form.dealer')}
                    </label>
                    <select
                      required
                      value={dealerId}
                      onChange={(event) => setDealerId(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">{t('orders.form.dealerPlaceholder')}</option>
                      {dealers.map((dealer) => (
                        <option key={dealer.id} value={dealer.id}>
                          {dealer.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {t('orders.form.orderType')}
                    </label>
                    <select
                      value={orderType}
                      onChange={(event) => setOrderType(event.target.value as 'regular' | 'reserve')}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="regular">{t('orders.types.regular')}</option>
                      <option value="reserve">{t('orders.types.reserve')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {t('orders.form.note')}
                    </label>
                    <input
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder={t('orders.form.notePlaceholder')}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {t('orders.filters.brand')}
                    </label>
                    <select
                      value={brandId ?? ''}
                      onChange={(event) => handleFilterChange('brandId', event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">{t('orders.filters.allBrands')}</option>
                      {brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {t('orders.filters.category')}
                    </label>
                    <select
                      value={categoryId ?? ''}
                      onChange={(event) => handleFilterChange('categoryId', event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">{t('orders.filters.allCategories')}</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {t('orders.form.productSearch')}
                    </label>
                    <input
                      value={productSearch}
                      onChange={(event) => setProductSearch(event.target.value)}
                      placeholder={t('orders.form.productSearchPlaceholder')}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {t('orders.form.productSelect')}
                      </label>
                      <select
                        value={selectedProduct?.id ?? ''}
                        onChange={(event) => handleSelectProduct(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="">{t('orders.form.productSelectPlaceholder')}</option>
                        {filteredProducts.map((product) => {
                          const stock = product.total_stock ?? product.stock_ok ?? 0;
                          const isLow = stock <= 0;
                          const brandLabel = product.brand?.name ?? '-';
                          const categoryLabel = product.category?.name ?? '-';
                          const stockLabel = isLow ? '(Zaxira tugagan)' : `(Zaxira: ${stock})`;
                          return (
                            <option key={product.id} value={product.id}>
                              {cleanName(product.name)} - {brandLabel} - {categoryLabel}{' '}
                              {stockLabel}
                            </option>
                          );
                        })}
                      </select>
                      {!filteredProducts.length && !productsLoading && (
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Mos mahsulot topilmadi.</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Miqdor</label>
                      <input
                        type="number"
                        min={0.01}
                        step="0.01"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={quantityInput}
                        onChange={(event) => setQuantityInput(event.target.value)}
                        onBlur={() => setQuantityInput(formatQuantityInputValue(quantityInput || DEFAULT_QTY))}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('orders.form.price')}</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={priceInput}
                        onChange={(event) => setPriceInput(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddSelectedProduct}
                      className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      ➕ {t('common:actions.add')}
                    </button>
                  </div>
                  {productsLoading && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('orders.form.productsLoading')}</p>
                  )}
                </div>

                <OrderItemTable
                  items={selectedItems}
                  onQtyChange={handleItemQtyChange}
                  onPriceChange={handleItemPriceChange}
                  onRemove={removeItem}
                />

                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleClearDraft}
                    className="w-full rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-200 dark:hover:bg-rose-900/30"
                  >
                    {t('orders.form.clearDraft')}
                  </button>
                  <button
                    className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-700 dark:bg-emerald-500 dark:text-slate-900"
                    type="submit"
                  >
                    {t('actions.create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <FilterTrigger onClick={() => setFiltersOpen(true)} />
        <FilterDrawer
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          onApply={handleApplyFilters}
          onReset={resetFilters}
          title={t('orders.filters.title')}
        >
          {filtersContent}
        </FilterDrawer>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            {t('common:messages.loading')}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            {t('orders.list.empty')}
          </div>
        ) : (
          <OrdersMobileCards data={orders} handlers={mobileHandlers} />
        )}

        <div className="sticky bottom-0 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          <PaginationControls
            page={page}
            pageSize={pageSize}
            total={totalOrders}
            setPage={setPage}
            setPageSize={setPageSize}
          />
        </div>
      </div>
    );
  }

  // Desktop view
  return (
    <section className="page-wrapper space-y-6">
      <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('nav.orders')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('orders.header.subtitle')}</p>
        </div>
        {!isWarehouse && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleDownloadTemplate}
              title={t('orders.import.templateTooltip')}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              📥 {t('orders.import.downloadTemplate')}
            </button>
            <label
              title={t('orders.import.importTooltip')}
              className="cursor-pointer rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
            >
              📤 {t('orders.import.uploadFile')}
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportOrders}
                className="hidden"
              />
            </label>
            <button
              onClick={() => handlePdf()}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              {t('actions.exportPdf')}
            </button>
            <button
              onClick={handleExcel}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-emerald-500 dark:text-slate-900"
            >
              {t('actions.exportExcel')}
            </button>
          </div>
        )}
      </header>

      {!isWarehouse && (
        <div className="mb-4 flex justify-end">
          <Button
            type={showCreateForm ? 'default' : 'primary'}
            icon={showCreateForm ? <MinusOutlined /> : <PlusOutlined />}
            onClick={handleToggleCreateForm}
          >
            {t(showCreateForm ? 'orders.header.hideForm' : 'orders.header.showForm')}
          </Button>
        </div>
      )}

      <div className="mt-4">{filtersContent}</div>

      {!isWarehouse && (
        <Collapse
          className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
          activeKey={showCreateForm ? [CREATE_FORM_PANEL_KEY] : []}
          onChange={(key) => handleCollapseChange(key as string[] | string)}
          items={[
            {
              key: CREATE_FORM_PANEL_KEY,
              label: t('orders.header.panelTitle'),
              children: showCreateForm ? (
                <Card
                title={t('orders.header.panelTitle')}
                className="mt-4 border border-slate-700 bg-slate-900"
                headStyle={{ color: '#fff', backgroundColor: 'transparent' }}
                bodyStyle={{ padding: 0, backgroundColor: 'transparent' }}
              >
                <form
                  onSubmit={handleSubmit}
                  className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {t('orders.form.dealer')}
                      </label>
                      <select
                        required
                        value={dealerId}
                        onChange={(event) => setDealerId(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="">{t('orders.form.dealerPlaceholder')}</option>
                        {dealers.map((dealer) => (
                          <option key={dealer.id} value={dealer.id}>
                            {dealer.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {t('orders.form.orderType')}
                      </label>
                      <select
                        value={orderType}
                        onChange={(event) => setOrderType(event.target.value as 'regular' | 'reserve')}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="regular">{t('orders.types.regular')}</option>
                        <option value="reserve">{t('orders.types.reserve')}</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {t('orders.form.note')}
                      </label>
                      <input
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder={t('orders.form.notePlaceholder')}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {t('orders.filters.brand')}
                      </label>
                      <select
                        value={brandId ?? ''}
                        onChange={(event) => handleFilterChange('brandId', event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="">{t('orders.filters.allBrands')}</option>
                        {brands.map((brand) => (
                          <option key={brand.id} value={brand.id}>
                            {brand.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {t('orders.filters.category')}
                      </label>
                      <select
                        value={categoryId ?? ''}
                        onChange={(event) => handleFilterChange('categoryId', event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="">{t('orders.filters.allCategories')}</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {t('orders.form.productSearch')}
                      </label>
                      <input
                        value={productSearch}
                        onChange={(event) => setProductSearch(event.target.value)}
                        placeholder={t('orders.form.productSearchPlaceholder')}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-[2fr,1fr,1fr,auto]">
                      <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          {t('orders.form.productSelect')}
                        </label>
                        <select
                          value={selectedProduct?.id ?? ''}
                          onChange={(event) => handleSelectProduct(event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        >
                          <option value="">{t('orders.form.productSelectPlaceholder')}</option>
                          {filteredProducts.map((product) => {
                            const stock = product.total_stock ?? product.stock_ok ?? 0;
                            const isLow = stock <= 0;
                            const brandLabel = product.brand?.name ?? '-';
                            const categoryLabel = product.category?.name ?? '-';
                            const stockLabel = isLow ? '(Zaxira tugagan)' : `(Zaxira: ${stock})`;
                            return (
                              <option key={product.id} value={product.id}>
                                {cleanName(product.name)} - {brandLabel} - {categoryLabel}{' '}
                                {stockLabel}
                              </option>
                            );
                          })}
                        </select>
                        {!filteredProducts.length && !productsLoading && (
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Mos mahsulot topilmadi.</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Miqdor</label>
                        <input
                          type="number"
                          min={0.01}
                          step="0.01"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={quantityInput}
                          onChange={(event) => setQuantityInput(event.target.value)}
                          onBlur={() => setQuantityInput(formatQuantityInputValue(quantityInput || DEFAULT_QTY))}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('orders.form.price')}</label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={priceInput}
                          onChange={(event) => setPriceInput(event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={handleAddSelectedProduct}
                          className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                        >
                          ➕ {t('common:actions.add')}
                        </button>
                      </div>
                    </div>
                    {productsLoading && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">{t('orders.form.productsLoading')}</p>
                    )}
                  </div>

                  <OrderItemTable
                    items={selectedItems}
                    onQtyChange={handleItemQtyChange}
                    onPriceChange={handleItemPriceChange}
                    onRemove={removeItem}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleClearDraft}
                      className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-200 dark:hover:bg-rose-900/30"
                    >
                      {t('orders.form.clearDraft')}
                    </button>
                    <button
                      className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-700 dark:bg-emerald-500 dark:text-slate-900"
                      type="submit"
                    >
                      {t('actions.create')}
                    </button>
                  </div>
                </form>
              </Card>
            ) : null,
          },
        ]}
        />
      )}

      <div className="table-wrapper overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">
                {t('orders.list.columns.id')}
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">
                {t('orders.list.columns.dealer')}
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">
                {t('orders.list.columns.type')}
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">
                {t('orders.list.columns.status')}
              </th>
              {!isWarehouse && (
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">
                  {t('orders.list.columns.amount')}
                </th>
              )}
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">
                {t('orders.list.columns.date')}
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-200">
                {t('orders.list.columns.pdf')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-300">
                  {t('common:messages.loading')}
                </td>
              </tr>
            )}
            {orderRows.map((order) => {
              const isExpanded = expandedOrderId === order.id;
              return (
                <Fragment key={order.id}>
                  <tr
                    className={`cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                      isExpanded ? 'bg-slate-50/70 dark:bg-slate-800/60' : ''
                    }`}
                    onClick={() => toggleOrderDetails(order.id)}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{order.display_no}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{order.dealer?.name ?? 'вЂ”'}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          order.is_reserve
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-200'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-200'
                        }`}
                      >
                        {order.is_reserve ? t('orders.type.reserve') : t('orders.type.regular')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                      <div className="mt-2">
                        <OrderStatus
                          value={order.status}
                          orderId={order.id}
                          onStatusUpdated={handleStatusUpdated}
                        />
                      </div>
                    </td>
                    {!isWarehouse && (
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        <Money value={order.total_usd} currency="USD" />
                      </td>
                    )}
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{formatDate(order.value_date)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                        onClick={(event) => {
                          event.stopPropagation();
                          handlePdf(order.id, order.display_no);
                        }}
                      >
                        PDF
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={7} className="bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800/60 dark:text-slate-100">
                        {order.items?.length ? (
                          <div className="space-y-2">
                            <div className="font-semibold text-slate-700 dark:text-white">{t('orders.details.items')}</div>
                            <ul className="space-y-1">
                              {order.items.map((item) => {
                                const price = Number(item.price_usd);
                                const lineTotal = item.qty * price;
                                return (
                                  <li
                                    key={item.id}
                                    className="flex flex-wrap justify-between rounded-lg bg-white px-3 py-2 shadow-sm dark:bg-slate-900"
                                  >
                                    <span className="font-medium text-slate-800 dark:text-slate-100">
                                      {item.product_detail?.name ?? `${t('orders.details.product')} #${item.product ?? '—'}`}
                                    </span>
                                    {!isWarehouse && (
                                      <span className="text-slate-600 dark:text-slate-300">
                                        {formatQuantity(item.qty)} × {formatCurrency(price)} = {formatCurrency(lineTotal)}
                                      </span>
                                    )}
                                    {isWarehouse && (
                                      <span className="text-slate-600 dark:text-slate-300">
                                        {formatQuantity(item.qty)} {t('common.units.pcs')}
                                      </span>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ) : (
                          <div className="text-center text-slate-500 dark:text-slate-300">{t('orders.details.noItems')}</div>
                        )}
                        
                        {/* Status o'zgarishlari tarixi */}
                        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                          <OrderHistory orderId={order.id} />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {!loading && orderRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-300">
                  {t('orders.list.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-0 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
        <PaginationControls
          page={page}
          pageSize={pageSize}
          total={totalOrders}
          setPage={setPage}
          setPageSize={setPageSize}
        />
      </div>
    </section>
  );
};

export default OrdersPage;

