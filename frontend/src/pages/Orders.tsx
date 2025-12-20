import type { FormEvent } from 'react';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { MinusOutlined, PlusOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { Collapse, Select, Drawer } from 'antd';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import styles from './Orders.module.css';

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
import MobileOrderForm from './_mobile/MobileOrderForm';
import OrderStatusCards from '../components/orders/OrderStatusCards';

interface DealerOption {
  id: number;
  name: string;
}

interface UserOption {
  id: number;
  full_name: string;
  username: string;
}

interface ProductOption {
  id: number;
  name: string;
  sell_price_usd: number;
  stock_ok?: number;
  total_stock?: number;
  brand?: { id: number; name: string } | null;
  category?: { id: number; name: string } | null;
  size?: string;
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
  price_at_time?: number | null;
  currency?: string;
  effective_price?: number;
}

interface Order {
  id: number;
  display_no: string;
  dealer: DealerOption;
  status: string;
  total_usd: number;
  total_uzs?: number;
  exchange_rate?: number;
  exchange_rate_date?: string;
  value_date: string;
  is_reserve: boolean;
  discount_type?: 'none' | 'percentage' | 'amount';
  discount_value?: number;
  discount_amount_usd?: number;
  discount_amount_uzs?: number;
  can_edit?: boolean;
  can_change_status?: boolean;
  allowed_next_statuses?: string[];
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
  const [users, setUsers] = useState<UserOption[]>([]);
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
  const [statusFilter, setStatusFilter] = useState('');
  const [managerFilter, setManagerFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'amount'>('none');
  const [discountValue, setDiscountValue] = useState('0');
  const [showDiscountFields, setShowDiscountFields] = useState(false);
  const { t } = useTranslation();
  const { isMobile } = useIsMobile();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [mobileOrderDetailsOpen, setMobileOrderDetailsOpen] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showDailyReportModal, setShowDailyReportModal] = useState(false);
  const [dailyReportDate, setDailyReportDate] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [managerDealers, setManagerDealers] = useState<DealerOption[]>([]);
  const [accounts, setAccounts] = useState<Array<{ id: number; name: string }>>([]);
  const [paymentFormData, setPaymentFormData] = useState({
    dealer: '',
    account: '',
    date: new Date().toISOString().split('T')[0],
    currency: 'UZS',
    amount: '',
    comment: '',
  });
  const role = useAuthStore((state) => state.role);
  const userId = useAuthStore((state) => state.userId);
  const isWarehouse = role === 'warehouse';
  const isSalesManager = role === 'sales';

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
      let url = nextUrl;
      if (url.startsWith('http://') || url.startsWith('https://')) {
        try {
          const urlObj = new URL(url);
          url = urlObj.pathname + urlObj.search;
          if (url.startsWith('/api/')) {
            url = url.substring(4);
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
      const params: Record<string, string | number> = { page, page_size: pageSize };
      if (statusFilter) params.status = statusFilter;
      if (managerFilter) params.created_by = managerFilter;
      // Sales manager faqat o'zi yaratgan orderlarni ko'radi
      if (isSalesManager && userId && !managerFilter) {
        params.created_by = userId;
      }
      if (dateFrom) params.value_date_from = dateFrom;
      if (dateTo) params.value_date_to = dateTo;

      const response = await http.get('/orders/', { params });
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
  }, [dateFrom, dateTo, managerFilter, page, pageSize, statusFilter, isSalesManager, userId]);

  const loadRefs = useCallback(async () => {
    try {
      console.log('Loading dealers, users, brands, categories...');
      
      const dealersResponse = await http.get('/dealers/list-all/', { 
        params: { is_active: true } 
      });
      const dealersData = Array.isArray(dealersResponse.data) 
        ? dealersResponse.data 
        : [];
      
      const [usersData, brandsData, categoriesData] = await Promise.all([
        fetchAllPages<UserOption>('/users/'),
        fetchAllPages<BrandOption>('/brands/'),
        fetchAllPages<CategoryOption>('/categories/'),
      ]);
      
      // Load manager dealers if sales manager
      if (isSalesManager) {
        try {
          const managerDealersResponse = await http.get('/finance/manager-dealers/');
          setManagerDealers(managerDealersResponse.data);
          
          // Load accounts for payment creation
          const accountsResponse = await http.get('/finance/accounts/');
          const accountsData = Array.isArray(accountsResponse.data.results) 
            ? accountsResponse.data.results 
            : Array.isArray(accountsResponse.data) 
            ? accountsResponse.data 
            : [];
          setAccounts(accountsData);
        } catch (error) {
          console.error('Failed to load manager dealers:', error);
        }
      }
      
      console.log('Loaded data:', { 
        dealers: dealersData.length, 
        users: usersData.length, 
        brands: brandsData.length, 
        categories: categoriesData.length 
      });
      
      setDealers(dealersData);
      setUsers(usersData);
      setBrands(brandsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading references:', error);
      throw error;
    }
  }, [fetchAllPages, isSalesManager]);

  useEffect(() => {
    loadRefs().catch((error) => {
      console.error(error);
      toast.error('Failed to load references');
    });
  }, [loadRefs]);

  useEffect(() => {
    loadOrders().catch(() => {
      const cached = loadCache<Order[]>('orders-data');
      if (cached) setOrders(cached);
    });
  }, [loadOrders, statusFilter, managerFilter, dateFrom, dateTo]);

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
  }, [fetchProducts, t]);

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
    
    const stockOk = selectedProduct.stock_ok ?? 0;
    if (stockOk <= 0) {
      toast.error(t('orders.errors.productOutOfStock'));
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

  const handleViewOrder = (orderId: number) => {
    if (isMobile) {
      const order = orders.find((o) => o.id === orderId);
      if (order) {
        setSelectedOrderForDetails(order);
        setMobileOrderDetailsOpen(true);
      }
    } else {
      toggleOrderDetails(orderId);
    }
  };
  const handleEditOrder = async (orderId: number) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    // Load full order details
    try {
      const response = await http.get(`/orders/${orderId}/`);
      const fullOrder = response.data;

      setEditingOrder(fullOrder);
      setDealerId(String(fullOrder.dealer?.id || ''));
      setOrderType(fullOrder.is_reserve ? 'reserve' : 'regular');
      setNote(fullOrder.note || '');
      setDiscountType(fullOrder.discount_type || 'none');
      setDiscountValue(String(fullOrder.discount_value || '0'));

      // Load order items into selected items
      if (fullOrder.items && fullOrder.items.length > 0) {
        setSelectedItems(fullOrder.items.map((item: OrderItem) => ({
          ...item,
          product_detail: item.product_detail || null,
        })));
      }

      setShowCreateForm(true);

      if (!isMobile) {
        toggleOrderDetails(orderId);
      }
    } catch (error) {
      console.error('Error loading order for edit:', error);
      toast.error(t('orders.edit.loadError', 'Failed to load order'));
    }
  };
  const handleStatusUpdatedFromCards = (orderId: number, newStatus: string) => {
    handleStatusUpdated(orderId, newStatus);
  };

  const filtersContent = (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-label">Holat</label>
          <Select
            value={statusFilter}
            onChange={(val) => setStatusFilter(String(val))}
            className="mt-1 w-full"
            options={[
              { label: 'Barcha holatlar', value: '' },
              { label: 'Yaratilgan', value: 'created' },
              { label: 'Tasdiqlangan', value: 'confirmed' },
              { label: 'Qadoqlangan', value: 'packed' },
              { label: 'Yuborilgan', value: 'shipped' },
              { label: 'Yetkazilgan', value: 'delivered' },
              { label: 'Bekor qilingan', value: 'cancelled' },
            ]}
            placeholder="Barcha holatlar"
            allowClear
          />
        </div>
        <div>
          <label className="text-label">Menejer</label>
          <Select
            value={managerFilter ?? ''}
            onChange={(val) => setManagerFilter(String(val))}
            className="mt-1 w-full"
            options={[{ label: 'Barcha menejerlar', value: '' }, ...users.map(u => ({ label: u.full_name || u.username, value: String(u.id) }))]}
            allowClear
            showSearch
            placeholder="Barcha menejerlar"
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-label">Sana (dan)</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="input-field mt-1 w-full"
          />
        </div>
        <div>
          <label className="text-label">Sana (gacha)</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="input-field mt-1 w-full"
          />
        </div>
      </div>
      <div>
        <label className="text-label">{t('orders.filters.brand')}</label>
        <Select
          value={brandId ?? ''}
          onChange={(val) => handleFilterChange('brandId', String(val))}
          className="mt-1 w-full"
          options={[{ label: t('orders.filters.allBrands'), value: '' }, ...brands.map(b => ({ label: b.name, value: String(b.id) }))]}
          allowClear
          showSearch
          placeholder={t('orders.filters.allBrands')}
        />
      </div>
      <div>
        <label className="text-label">{t('orders.filters.category')}</label>
        <Select
          value={categoryId ?? ''}
          onChange={(val) => handleFilterChange('categoryId', String(val))}
          className="mt-1 w-full"
          options={[{ label: t('orders.filters.allCategories'), value: '' }, ...categories.map(c => ({ label: c.name, value: String(c.id) }))]}
          allowClear
          showSearch
          placeholder={t('orders.filters.allCategories')}
        />
      </div>
      <div>
        <button
          type="button"
          onClick={() => {
            setStatusFilter('');
            setManagerFilter('');
            setDateFrom('');
            setDateTo('');
            setFilters({ brandId: undefined, categoryId: undefined });
          }}
          className="btn btn-secondary w-full"
        >
          Filtrlarni tozalash
        </button>
      </div>
    </div>
  );

  const calculateOrderTotals = () => {
    const subtotal = selectedItems.reduce((sum, item) => sum + item.qty * (item.effective_price || item.price_usd), 0);
    
    let discountAmount = 0;
    if (discountType === 'percentage') {
      const percentage = Math.min(Math.max(parseFloat(discountValue) || 0, 0), 100);
      discountAmount = (subtotal * percentage) / 100;
    } else if (discountType === 'amount') {
      discountAmount = Math.min(parseFloat(discountValue) || 0, subtotal);
    }
    
    const total = subtotal - discountAmount;
    
    return {
      subtotal: subtotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      total: total.toFixed(2)
    };
  };

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!dealerId) {
      toast.error(t('orders.toast.dealerRequired'));
      return;
    }
    if (!selectedItems.length) {
      toast.error(t('orders.toast.itemsRequired'));
      return;
    }

    if (discountType !== 'none') {
      const discValue = parseFloat(discountValue) || 0;
      if (discountType === 'percentage' && (discValue < 0 || discValue > 100)) {
        toast.error(t('orders.toast.invalidDiscountPercentage'));
        return;
      }
      if (discountType === 'amount' && discValue < 0) {
        toast.error(t('orders.toast.invalidDiscountAmount'));
        return;
      }
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
        discount_type: discountType,
        discount_value: discountType !== 'none' ? parseFloat(discountValue) : 0,
        items: payloadItems,
      });
      setDealerId('');
      setOrderType('regular');
      setNote('');
      setDiscountType('none');
      setDiscountValue('0');
      setShowDiscountFields(false);
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
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
  };

  const handlePdf = async (orderId?: number, displayNo?: string, dealerName?: string) => {
    try {
      if (orderId) {
        let filename = displayNo ? `${displayNo}.pdf` : `order-${orderId}.pdf`;
        if (dealerName) {
          const sanitizedDealerName = dealerName.replace(/\s+/g, '_');
          filename = displayNo ? `invoice_${displayNo}_${sanitizedDealerName}.pdf` : `invoice_${orderId}_${sanitizedDealerName}.pdf`;
        }
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

  const handleOpenDailyReportModal = () => {
    // Bugungi sanani default qilib qo'yish
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setDailyReportDate(todayStr);
    setShowDailyReportModal(true);
  };

  const handleDailyReportPDF = async () => {
    try {
      if (!dailyReportDate) {
        toast.error(t('orders.dailyReport.selectDate'));
        return;
      }

      const filename = `daily_report_${dailyReportDate}.pdf`;
      await downloadFile(`/orders/daily-report/pdf/?report_date=${dailyReportDate}`, filename);
      toast.success(t('orders.toast.dailyReportSuccess'));
      setShowDailyReportModal(false);
    } catch (error) {
      console.error(error);
      toast.error(t('orders.toast.dailyReportError'));
    }
  };

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

      loadOrders().catch(() => null);
    } catch (error) {
      console.error(error);
      toast.dismiss(loadingToast);
      toast.error(t('orders.import.errorMessage'));
    }

    event.target.value = '';
  };

  const handleCreatePayment = async () => {
    try {
      if (!paymentFormData.dealer || !paymentFormData.account || !paymentFormData.amount) {
        toast.error(t('finance:form.fillRequired'));
        return;
      }

      const payload = {
        type: 'income',
        status: 'pending',
        dealer: Number(paymentFormData.dealer),
        account: Number(paymentFormData.account),
        date: paymentFormData.date,
        currency: paymentFormData.currency,
        amount: Number(paymentFormData.amount),
        comment: paymentFormData.comment || '',
      };

      await http.post('/finance/transactions/', payload);
      toast.success(t('finance:messages.createdSuccess'));
      
      setShowPaymentModal(false);
      setPaymentFormData({
        dealer: '',
        account: '',
        date: new Date().toISOString().split('T')[0],
        currency: 'UZS',
        amount: '',
        comment: '',
      });
    } catch (error: any) {
      console.error('Payment creation error:', error);
      const errorMsg = error?.response?.data?.error || error?.response?.data?.message || t('finance:messages.createError');
      toast.error(errorMsg);
    }
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
      <div className="space-y-4 px-4 pb-24">
        <header className="flex items-center justify-between py-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t('nav.orders')}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('orders.header.subtitle')}</p>
          </div>
        </header>

        {!isWarehouse && (
          <MobileOrderForm
            open={showCreateForm}
            onClose={() => {
              setShowCreateForm(false);
              setEditingOrder(null);
            }}
            dealerId={dealerId}
            orderType={orderType}
            note={note}
            dealers={dealers}
            brands={brands}
            categories={categories}
            products={availableProducts}
            selectedItems={selectedItems}
            brandId={brandId ? Number(brandId) : undefined}
            categoryId={categoryId ? Number(categoryId) : undefined}
            productSearch={productSearch}
            selectedProduct={selectedProduct ?? null}
            quantityInput={quantityInput}
            priceInput={priceInput}
            productsLoading={productsLoading}
            editingOrder={editingOrder}
            onDealerChange={setDealerId}
            onOrderTypeChange={setOrderType}
            onNoteChange={setNote}
            onBrandChange={(value) => handleFilterChange('brandId', value)}
            onCategoryChange={(value) => handleFilterChange('categoryId', value)}
            onProductSearchChange={setProductSearch}
            onProductSelect={handleSelectProduct}
            onQuantityChange={setQuantityInput}
            onPriceChange={setPriceInput}
            onAddProduct={handleAddSelectedProduct}
            onRemoveItem={removeItem}
            onItemQtyChange={handleItemQtyChange}
            onItemPriceChange={handleItemPriceChange}
            onSubmit={handleSubmit}
            onClearDraft={handleClearDraft}
          />
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

        {/* Mobile Order Details Drawer */}
        <Drawer
          open={mobileOrderDetailsOpen}
          onClose={() => {
            setMobileOrderDetailsOpen(false);
            setSelectedOrderForDetails(null);
          }}
          placement="bottom"
          height="85vh"
          title={selectedOrderForDetails ? `${t('orders.details.title')} #${selectedOrderForDetails.display_no}` : ''}
          className="rounded-t-3xl"
        >
          {selectedOrderForDetails && (
            <div className="space-y-4 pb-6">
              {/* Order Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">{t('orders.list.columns.dealer')}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedOrderForDetails.dealer?.name ?? '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">{t('orders.list.columns.type')}</span>
                  <span className={selectedOrderForDetails.is_reserve ? "badge badge-warning" : "badge badge-success"}>
                    {selectedOrderForDetails.is_reserve ? t('orders.types.reserve') : t('orders.types.regular')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">{t('orders.list.columns.status')}</span>
                  <StatusBadge status={selectedOrderForDetails.status} />
                </div>
                {!isWarehouse && (
                  <>
                    {selectedOrderForDetails.discount_type && selectedOrderForDetails.discount_type !== 'none' && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 dark:text-slate-400">{t('orders.discount.label', 'Chegirma')}</span>
                        <span className="text-sm text-red-600 dark:text-red-400 font-semibold">
                          {selectedOrderForDetails.discount_type === 'percentage' 
                            ? `${selectedOrderForDetails.discount_value}%`
                            : `$${selectedOrderForDetails.discount_amount_usd?.toFixed(2)}`
                          }
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400">{t('orders.list.columns.amount')}</span>
                      <Money value={selectedOrderForDetails.total_usd} currency="USD" />
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">{t('orders.list.columns.date')}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatDate(selectedOrderForDetails.value_date)}
                  </span>
                </div>
              </div>

              {/* Exchange Rate Info */}
              {selectedOrderForDetails.exchange_rate && !isWarehouse && (
                <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-900/20">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">{t('orders.details.exchangeRate', 'Valyuta kursi')}:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        1 USD = {formatCurrency(selectedOrderForDetails.exchange_rate)} UZS
                      </span>
                    </div>
                    {selectedOrderForDetails.exchange_rate_date && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(selectedOrderForDetails.exchange_rate_date)}
                      </div>
                    )}
                    {selectedOrderForDetails.total_uzs && (
                      <div className="flex items-center justify-between pt-2 border-t border-blue-100 dark:border-blue-800">
                        <span className="text-slate-600 dark:text-slate-400">{t('orders.list.columns.totalUzs', 'Jami UZS')}:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(selectedOrderForDetails.total_uzs)} UZS
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-900 dark:text-white">{t('orders.details.items')}</h3>
                {selectedOrderForDetails.items?.length ? (
                  <div className="space-y-2">
                    {selectedOrderForDetails.items.map((item) => {
                      const price = Number(item.effective_price || item.price_usd);
                      const lineTotal = item.qty * price;
                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                        >
                          <div className="font-medium text-slate-900 dark:text-white mb-2">
                            {item.product_detail?.name ?? `${t('orders.details.product')} #${item.product ?? '—'}`}
                          </div>
                          {!isWarehouse && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-500 dark:text-slate-400">
                                {formatQuantity(item.qty)} × {formatCurrency(price)}
                              </span>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                = {formatCurrency(lineTotal)}
                              </span>
                            </div>
                          )}
                          {isWarehouse && (
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                              {formatQuantity(item.qty)} {t('common.units.pcs')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500">{t('orders.details.noItems')}</div>
                )}
              </div>

              {/* Status Change */}
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-900 dark:text-white">{t('orders.status.change', "Holatni o'zgartirish")}</h3>
                <OrderStatus
                  value={selectedOrderForDetails.status}
                  orderId={selectedOrderForDetails.id}
                  onStatusUpdated={(orderId, newStatus) => {
                    handleStatusUpdated(orderId, newStatus);
                    setMobileOrderDetailsOpen(false);
                  }}
                  canEdit={selectedOrderForDetails.can_change_status}
                  allowedStatuses={selectedOrderForDetails.allowed_next_statuses || []}
                />
              </div>

              {/* Order History */}
              <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-white">{t('orders.history.title', 'Buyurtma tarixi')}</h3>
                <OrderHistory orderId={selectedOrderForDetails.id} />
              </div>

              {/* PDF Download */}
              <button
                className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700 active:scale-95 transition-all dark:bg-emerald-500"
                onClick={() => {
                  handlePdf(selectedOrderForDetails.id, selectedOrderForDetails.display_no, selectedOrderForDetails.dealer?.name);
                }}
              >
                {t('orders.actions.downloadPdf', 'PDF yuklash')}
              </button>
            </div>
          )}
        </Drawer>

        {!isWarehouse && (
          <button
            onClick={handleToggleCreateForm}
            className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 active:scale-95 transition-all dark:bg-emerald-500"
            aria-label={t('orders.header.showForm')}
          >
            <PlusOutlined className="text-2xl" />
          </button>
        )}

        <div className="sticky bottom-0 rounded-2xl border border-slate-200 px-4 py-3 shadow-sm dark:border-[#2A2D30]" style={{ background: 'var(--bg-elevated)' }}>
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
      {/* Header with gradient and modern styling */}
      <header className="card animate-fadeInUp">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('nav.orders')}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('orders.header.subtitle')}</p>
          </div>
          {!isWarehouse && (
            <div className="flex flex-wrap gap-3">
              {isSalesManager && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="btn btn-primary btn-sm"
                  title={t('orders.createPayment')}
                >
                  💳 {t('orders.createPayment')}
                </button>
              )}
              <button
                onClick={handleDownloadTemplate}
                title={t('orders.import.templateTooltip')}
                className="btn btn-ghost btn-sm"
              >
                📥 {t('orders.import.downloadTemplate')}
              </button>
              <label
                title={t('orders.import.importTooltip')}
                className="btn btn-secondary btn-sm cursor-pointer"
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
                className="btn btn-ghost btn-sm"
              >
                {t('actions.exportPdf')}
              </button>
              <button
                onClick={handleOpenDailyReportModal}
                className="btn btn-secondary btn-sm"
                title={t('orders.dailyReport.tooltip')}
              >
                📊 {t('orders.dailyReport.button')}
              </button>
              <button
                onClick={handleExcel}
                className="btn btn-primary btn-sm"
              >
                {t('actions.exportExcel')}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Order Status Statistics Cards */}
      <div className="animate-fadeInUp">
        <OrderStatusCards
          onStatusClick={(status) => {
            setStatusFilter(status === statusFilter ? '' : status);
            setPage(1);
          }}
          currentFilter={statusFilter}
        />
      </div>

      {/* Create Order Button */}
      {!isWarehouse && (
        <div className="flex justify-end animate-scaleIn">
          <button
            onClick={handleToggleCreateForm}
            className={showCreateForm ? "btn btn-secondary" : "btn btn-primary"}
          >
            {showCreateForm ? <MinusOutlined /> : <PlusOutlined />}
            <span className="ml-2">
              {t(showCreateForm ? 'orders.header.hideForm' : 'orders.header.showForm')}
            </span>
          </button>
        </div>
      )}

      {/* Filters Section */}
      <div className="card animate-fadeInUp">
        <button
          type="button"
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-[#1A1F29] rounded-lg"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-slate-900 dark:text-white">{t('orders.filters.title')}</span>
            {(statusFilter || managerFilter || dateFrom || dateTo || brandId || categoryId) && (
              <span className="badge badge-success">
                {t('orders.filters.activeLabel')}
              </span>
            )}
          </div>
          {filtersExpanded ? (
            <UpOutlined className="text-slate-500 dark:text-slate-400" />
          ) : (
            <DownOutlined className="text-slate-500 dark:text-slate-400" />
          )}
        </button>

        <div
          className="overflow-hidden transition-all duration-300"
          style={{
            maxHeight: filtersExpanded ? '1000px' : '0',
            opacity: filtersExpanded ? 1 : 0,
          }}
        >
          <div className="border-t border-slate-200 p-6 dark:border-slate-800">
            {filtersContent}
          </div>
        </div>
      </div>

      {/* Create Order Form */}
      {!isWarehouse && (
        <div className={`${styles.orderCollapsePanel} animate-scaleIn`}>
          <Collapse
            activeKey={showCreateForm ? [CREATE_FORM_PANEL_KEY] : []}
            onChange={(key) => handleCollapseChange(key as string[] | string)}
            items={[
              {
                key: CREATE_FORM_PANEL_KEY,
                label: t('orders.header.panelTitle'),
                children: showCreateForm ? (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Dealer and Order Type */}
                    <div className="grid gap-4 md:grid-cols-4">
                      <div>
                        <label className="text-label">{t('orders.form.dealer')}</label>
                        <Select
                          value={dealerId}
                          onChange={(val) => setDealerId(String(val))}
                          className="mt-1 w-full"
                          options={[{ label: t('orders.form.dealerPlaceholder'), value: '' }, ...(dealers || []).map(d => ({ label: d.name, value: String(d.id) }))]}
                          placeholder={t('orders.form.dealerPlaceholder')}
                          showSearch
                          allowClear
                        />
                      </div>
                      <div>
                        <label className="text-label">{t('orders.form.orderType')}</label>
                        <Select
                          value={orderType}
                          onChange={(val) => setOrderType(String(val) as 'regular' | 'reserve')}
                          className="mt-1 w-full"
                          options={[{ label: t('orders.types.regular'), value: 'regular' }, { label: t('orders.types.reserve'), value: 'reserve' }]}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-label">{t('orders.form.note')}</label>
                        <input
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                          placeholder={t('orders.form.notePlaceholder')}
                          className="input-field mt-1 w-full"
                        />
                      </div>
                    </div>

                    {/* Discount Section */}
                    <div className="card">
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={showDiscountFields}
                          onChange={(e) => {
                            setShowDiscountFields(e.target.checked);
                            if (!e.target.checked) {
                              setDiscountType('none');
                              setDiscountValue('0');
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />
                        <span>{t('orders.discount.apply', 'Chegirma qo\'llash')}</span>
                      </label>

                      {showDiscountFields && (
                        <div className="mt-4 space-y-4">
                          <div>
                            <label className="text-label">{t('orders.discount.type', 'Chegirma turi')}</label>
                            <Select
                              value={discountType}
                              onChange={(val) => {
                                setDiscountType(String(val) as 'none' | 'percentage' | 'amount');
                                setDiscountValue('0');
                              }}
                              className="mt-1 w-full"
                              options={[
                                { label: t('orders.discount.none', 'Yo\'q'), value: 'none' },
                                { label: t('orders.discount.percentage', 'Foiz (%)'), value: 'percentage' },
                                { label: t('orders.discount.fixedAmount', "Qat'iy summa (USD)"), value: 'amount' },
                              ]}
                            />
                          </div>

                          {discountType !== 'none' && (
                            <div>
                              <label className="text-label">
                                {discountType === 'percentage' 
                                  ? t('orders.discount.percentageValue', 'Chegirma foizi (%)')
                                  : t('orders.discount.amountValue', 'Chegirma summasi (USD)')
                                }
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max={discountType === 'percentage' ? '100' : undefined}
                                value={discountValue}
                                onChange={(e) => setDiscountValue(e.target.value)}
                                placeholder={discountType === 'percentage' ? '0-100' : '0.00'}
                                className="input-field mt-1 w-full"
                              />
                            </div>
                          )}

                          {/* Discount Preview */}
                          {discountType !== 'none' && selectedItems.length > 0 && (
                            <div className="card bg-slate-50 dark:bg-[#0F1419]">
                              <div className="mb-2 flex justify-between text-sm text-slate-600 dark:text-slate-400">
                                <span>{t('orders.discount.subtotal', 'Oraliq jami')}:</span>
                                <span className="text-number">${calculateOrderTotals().subtotal}</span>
                              </div>
                              <div className="mb-2 flex justify-between text-sm text-red-600 dark:text-red-400">
                                <span>{t('orders.discount.label', 'Chegirma')}:</span>
                                <span className="text-number">-${calculateOrderTotals().discountAmount}</span>
                              </div>
                              <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-bold dark:border-slate-700">
                                <span>{t('orders.discount.finalTotal', 'Yakuniy jami')}:</span>
                                <span className="text-number gradient-text">${calculateOrderTotals().total}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Brand and Category Filters */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-label">{t('orders.filters.brand')}</label>
                        <Select
                          value={brandId ?? ''}
                          onChange={(val) => handleFilterChange('brandId', String(val))}
                          className="mt-1 w-full"
                          options={[{ label: t('orders.filters.allBrands'), value: '' }, ...brands.map(b => ({ label: b.name, value: String(b.id) }))]}
                          showSearch
                          allowClear
                          placeholder={t('orders.filters.allBrands')}
                        />
                      </div>
                      <div>
                        <label className="text-label">{t('orders.filters.category')}</label>
                        <Select
                          value={categoryId ?? ''}
                          onChange={(val) => handleFilterChange('categoryId', String(val))}
                          className="mt-1 w-full"
                          options={[{ label: t('orders.filters.allCategories'), value: '' }, ...categories.map(c => ({ label: c.name, value: String(c.id) }))]}
                          showSearch
                          allowClear
                          placeholder={t('orders.filters.allCategories')}
                        />
                      </div>
                    </div>

                    {/* Product Selection */}
                    <div className="card bg-slate-50/50 dark:bg-[#1A1F29]/50">
                      <div>
                        <label className="text-label">{t('orders.form.productSearch')}</label>
                        <input
                          value={productSearch}
                          onChange={(event) => setProductSearch(event.target.value)}
                          placeholder={t('orders.form.productSearchPlaceholder')}
                          className="input-field mt-1 w-full"
                        />
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-[2fr,1fr,1fr,auto]">
                        <div>
                          <label className="text-label">{t('orders.form.productSelect')}</label>
                          <Select
                            value={selectedProduct?.id ? String(selectedProduct.id) : ''}
                            onChange={(val) => handleSelectProduct(String(val))}
                            className="mt-1 w-full"
                            showSearch
                            options={filteredProducts.map((product) => {
                              const stock = product.stock_ok ?? 0;
                              const isOutOfStock = stock <= 0;
                              const isNegativeStock = stock < 0;
                              const brandLabel = product.brand?.name ?? '-';
                              const categoryLabel = product.category?.name ?? '-';
                              const stockLabel = isOutOfStock
                                ? `(⚠️ ${t('orders.product.outOfStock')})`
                                : `(${t('orders.product.inStock')}: ${stock})`;
                              const categoryName = product.category?.name?.toLowerCase() || '';
                              const doorPanelKeyword = t('orders.product.doorPanelKeyword', 'дверное полотно').toLowerCase();
                              const showSize = !categoryName.includes(doorPanelKeyword) && product.size && product.size.trim().length > 0;
                              const displayName = showSize ? `${cleanName(product.name)} — ${product.size}` : cleanName(product.name);
                              return {
                                label: `${displayName} - ${brandLabel} - ${categoryLabel} ${stockLabel}`,
                                value: String(product.id),
                                disabled: isOutOfStock,
                                isOutOfStock,
                                isNegativeStock,
                                className: isNegativeStock ? styles.lowStockOption : '',
                              };
                            })}
                            optionRender={(option) => {
                              const isDarkMode = document.documentElement.classList.contains('dark');
                              const bgColor = option.data.isOutOfStock 
                                ? (isDarkMode ? 'rgba(220, 38, 38, 0.2)' : 'rgba(239, 68, 68, 0.15)')
                                : 'transparent';
                              return (
                                <span
                                  className={option.data.isNegativeStock ? `${styles.lowStockOption} low-stock-product` : ''}
                                  style={{
                                    ...(option.data.isNegativeStock ? {
                                      color: isDarkMode ? '#FFA5A5' : '#FF6B6B',
                                      fontStyle: 'italic',
                                      fontWeight: 400
                                    } : {}),
                                    backgroundColor: bgColor,
                                    display: 'block',
                                    padding: '4px 8px',
                                    margin: '-4px -8px',
                                    borderRadius: '4px',
                                    fontStyle: option.data.isOutOfStock ? 'italic' : 'normal'
                                  }}
                                >
                                  {option.label}
                                </span>
                              );
                            }}
                            labelRender={(props) => {
                              const product = filteredProducts.find(p => String(p.id) === props.value);
                              const isNegativeStock = product && (product.stock_ok ?? 0) < 0;
                              const isDarkMode = document.documentElement.classList.contains('dark');
                              return (
                                <span
                                  className={isNegativeStock ? `${styles.lowStockOption} low-stock-product` : ''}
                                  style={isNegativeStock ? {
                                    color: isDarkMode ? '#FFA5A5' : '#FF6B6B',
                                    fontStyle: 'italic',
                                    fontWeight: 400
                                  } : undefined}
                                >
                                  {props.label}
                                </span>
                              );
                            }}
                            placeholder={t('orders.form.productSelectPlaceholder')}
                            allowClear
                          />
                          {!filteredProducts.length && !productsLoading && (
                            <p className="mt-2 text-xs text-slate-500">{t('orders.product.noMatches')}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-label">{t('orders.form.quantity')}</label>
                          <input
                            type="number"
                            min={0.01}
                            step="0.01"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={quantityInput}
                            onChange={(event) => setQuantityInput(event.target.value)}
                            onBlur={() => setQuantityInput(formatQuantityInputValue(quantityInput || DEFAULT_QTY))}
                            className="input-field mt-1 w-full"
                          />
                        </div>
                        <div>
                          <label className="text-label">{t('orders.form.price')}</label>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={priceInput}
                            onChange={(event) => setPriceInput(event.target.value)}
                            className="input-field mt-1 w-full"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={handleAddSelectedProduct}
                            className="btn btn-success w-full"
                          >
                            ➕ {t('common:actions.add')}
                          </button>
                        </div>
                      </div>
                      {productsLoading && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="spinner" />
                          <span className="text-sm text-slate-500">{t('orders.form.productsLoading')}</span>
                        </div>
                      )}
                    </div>

                    {/* Order Items Table */}
                    <OrderItemTable
                      items={selectedItems}
                      products={availableProducts}
                      onQtyChange={handleItemQtyChange}
                      onPriceChange={handleItemPriceChange}
                      onRemove={removeItem}
                    />

                    {/* Form Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={handleClearDraft}
                        className="btn btn-danger"
                      >
                        {t('orders.form.clearDraft')}
                      </button>
                      <button
                        className="btn btn-primary"
                        type="submit"
                      >
                        {t('actions.create')}
                      </button>
                    </div>
                  </form>
                ) : null,
              },
            ]}
          />
        </div>
      )}

      {/* Orders Table */}
      <div className="card overflow-x-auto animate-fadeInUp">
        <table className="modern-table">
          <thead>
            <tr>
              <th>{t('orders.list.columns.id')}</th>
              <th>{t('orders.list.columns.dealer')}</th>
              <th>{t('orders.list.columns.type')}</th>
              <th>{t('orders.list.columns.status')}</th>
              {!isWarehouse && <th>{t('orders.list.columns.amount')}</th>}
              <th>{t('orders.list.columns.date')}</th>
              <th className="text-right">{t('orders.list.columns.pdf')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="text-center py-8">
                  <div className="flex items-center justify-center gap-3">
                    <div className="spinner" />
                    <span>{t('common:messages.loading')}</span>
                  </div>
                </td>
              </tr>
            )}
            {orderRows.map((order) => {
              const isExpanded = expandedOrderId === order.id;
              return (
                <Fragment key={order.id}>
                  <tr
                    className={`cursor-pointer ${isExpanded ? 'bg-slate-50 dark:bg-[#1A1F29]' : ''}`}
                    onClick={() => toggleOrderDetails(order.id)}
                  >
                    <td className="font-semibold text-number">{order.display_no}</td>
                    <td>{order.dealer?.name ?? '—'}</td>
                    <td>
                      <span className={order.is_reserve ? "badge badge-warning" : "badge badge-success"}>
                        {order.is_reserve ? t('orders.types.reserve') : t('orders.types.regular')}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={order.status} />
                      <div className="mt-2">
                        <OrderStatus
                          value={order.status}
                          orderId={order.id}
                          onStatusUpdated={handleStatusUpdated}
                          canEdit={order.can_change_status}
                          allowedStatuses={order.allowed_next_statuses || []}
                        />
                      </div>
                    </td>
                    {!isWarehouse && (
                      <td className="font-semibold">
                        {order.discount_type && order.discount_type !== 'none' && (
                          <div className="mb-1 text-xs text-red-600 dark:text-red-400">
                            {order.discount_type === 'percentage' 
                              ? `${order.discount_value}% ${t('orders.discount.off', 'chegirma')}`
                              : `$${order.discount_amount_usd?.toFixed(2)} ${t('orders.discount.off', 'chegirma')}`
                            }
                          </div>
                        )}
                        <Money value={order.total_usd} currency="USD" />
                      </td>
                    )}
                    <td>{formatDate(order.value_date)}</td>
                    <td className="text-right">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          handlePdf(order.id, order.display_no, order.dealer?.name);
                        }}
                      >
                        PDF
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={7} className="bg-slate-50 dark:bg-[#1A1F29]/80">
                        <div className="p-4">
                          {order.items?.length ? (
                            <div className="space-y-2">
                              <div className="font-semibold">{t('orders.details.items')}</div>
                              <ul className="space-y-1">
                                {order.items.map((item) => {
                                  const price = Number(item.effective_price || item.price_usd);
                                  const lineTotal = item.qty * price;
                                  return (
                                    <li
                                      key={item.id}
                                      className="card flex flex-wrap justify-between"
                                    >
                                      <span className="font-medium">
                                        {item.product_detail?.name ?? `${t('orders.details.product')} #${item.product ?? '—'}`}
                                      </span>
                                      {!isWarehouse && (
                                        <span className="text-number">
                                          {formatQuantity(item.qty)} × {formatCurrency(price)} = {formatCurrency(lineTotal)}
                                        </span>
                                      )}
                                      {isWarehouse && (
                                        <span className="text-number">
                                          {formatQuantity(item.qty)} {t('common.units.pcs')}
                                        </span>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          ) : (
                            <div className="text-center text-slate-500">{t('orders.details.noItems')}</div>
                          )}
                          
                          {order.exchange_rate && !isWarehouse && (
                            <div className="mt-3 card bg-blue-50 dark:bg-[#1A1F29]">
                              <div className="flex items-center gap-4 text-sm flex-wrap">
                                <span>{t('orders.details.exchangeRate', 'Valyuta kursi')}:</span>
                                <span className="font-semibold text-number">
                                  1 USD = {formatCurrency(order.exchange_rate)} UZS
                                </span>
                                {order.exchange_rate_date && (
                                  <span className="text-slate-600 dark:text-slate-400">
                                    ({formatDate(order.exchange_rate_date)})
                                  </span>
                                )}
                                {order.total_uzs && (
                                  <span className="ml-auto font-medium text-number">
                                    ≈ {formatCurrency(order.total_uzs)} UZS
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                            <OrderHistory orderId={order.id} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {!loading && orderRows.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-500">
                  {t('orders.list.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="sticky bottom-0 card backdrop-blur" style={{ background: 'var(--bg-elevated)' }}>
        <PaginationControls
          page={page}
          pageSize={pageSize}
          total={totalOrders}
          setPage={setPage}
          setPageSize={setPageSize}
        />
      </div>

      {/* Payment Creation Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
              {t('orders.createPayment')}
            </h3>
            <div className="space-y-4">
              {/* Dealer Select */}
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  {t('finance:form.dealer')} *
                </label>
                <select
                  value={paymentFormData.dealer}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, dealer: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg 
                           bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">{t('finance:form.selectDealer')}</option>
                  {managerDealers.map((dealer) => (
                    <option key={dealer.id} value={dealer.id}>
                      {dealer.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Select */}
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  {t('finance:form.account')} *
                </label>
                <select
                  value={paymentFormData.account}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, account: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg 
                           bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">{t('finance:form.selectAccount')}</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  {t('finance:form.date')} *
                </label>
                <input
                  type="date"
                  value={paymentFormData.date}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, date: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg 
                           bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Currency */}
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  {t('finance:form.currency')} *
                </label>
                <select
                  value={paymentFormData.currency}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, currency: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg 
                           bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="UZS">UZS</option>
                  <option value="USD">USD</option>
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  {t('finance:form.amount')} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentFormData.amount}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg 
                           bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  {t('finance:form.comment')}
                </label>
                <textarea
                  value={paymentFormData.comment}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, comment: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg 
                           bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder={t('finance:form.commentPlaceholder')}
                />
              </div>

              {/* Info Alert */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  ℹ️ {t('finance:form.pendingNote')}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentFormData({
                    dealer: '',
                    account: '',
                    date: new Date().toISOString().split('T')[0],
                    currency: 'UZS',
                    amount: '',
                    comment: '',
                  });
                }}
                className="btn btn-ghost btn-sm"
              >
                {t('actions.cancel')}
              </button>
              <button
                onClick={handleCreatePayment}
                className="btn btn-primary btn-sm"
              >
                💾 {t('actions.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Report Date Picker Modal */}
      {showDailyReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
              {t('orders.dailyReport.modalTitle')}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                {t('orders.dailyReport.selectDateLabel')}
              </label>
              <input
                type="date"
                value={dailyReportDate}
                onChange={(e) => setDailyReportDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg 
                         bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDailyReportModal(false)}
                className="btn btn-ghost btn-sm"
              >
                {t('actions.cancel')}
              </button>
              <button
                onClick={handleDailyReportPDF}
                disabled={!dailyReportDate}
                className="btn btn-primary btn-sm"
              >
                📥 {t('orders.dailyReport.download')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default OrdersPage;