import type { FormEvent } from 'react';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import http from '../app/http';
import StatusBadge from '../components/StatusBadge';
import OrderItemTable from '../features/orders/OrderItemTable';
import { loadDraftOrder, saveDraftOrder, useOrderStore } from '../store/useOrderStore';
import { downloadFile } from '../utils/download';
import { formatCurrency, formatDate } from '../utils/formatters';
import { toArray } from '../utils/api';
import { loadCache, saveCache } from '../utils/storage';

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

const ORDER_STATUSES = ['created', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'returned'];

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
  const [draftInitialized, setDraftInitialized] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [quantityInput, setQuantityInput] = useState('1');
  const [priceInput, setPriceInput] = useState('');
  const [productsLoading, setProductsLoading] = useState(false);
  const { t } = useTranslation();

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

  const fetchAllPages = useCallback(async <T,>(endpoint: string) => {
    const collected: T[] = [];
    let nextUrl: string | null = endpoint;
    while (nextUrl) {
      const response = await http.get(nextUrl);
      const payload = response.data;
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
      const response = await http.get('/api/orders/');
      const normalized = toArray<Order>(response.data);
      setOrders(normalized);
      saveCache('orders-data', normalized);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load orders');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRefs = useCallback(async () => {
    const [dealersData, brandsData, categoriesData] = await Promise.all([
      fetchAllPages<DealerOption>('/api/dealers/'),
      fetchAllPages<BrandOption>('/api/brands/'),
      fetchAllPages<CategoryOption>('/api/categories/'),
    ]);
    setDealers(dealersData);
    setBrands(brandsData);
    setCategories(categoriesData);
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

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      await fetchProducts();
    } catch (error) {
      console.error(error);
      toast.error('Mahsulotlarni yuklab bo\'lmadi');
    } finally {
      setProductsLoading(false);
    }
  }, [fetchProducts]);

  useEffect(() => {
    loadProducts().catch(() => null);
  }, [loadProducts, brandId, categoryId]);

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

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) {
      return availableProducts;
    }
    return availableProducts.filter((product) => {
      const haystack = [product.name, product.brand?.name, product.category?.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [availableProducts, productSearch]);

  const resetProductInputs = useCallback(() => {
    setSelectedProduct(null);
    setProductSearch('');
    setQuantityInput('1');
    setPriceInput('');
  }, [setSelectedProduct]);

  const handleFilterChange = (field: 'brandId' | 'categoryId', value: string) => {
    setFilters({ [field]: value || undefined });
  };

  const handleSelectProduct = (value: string) => {
    if (!value) {
      setSelectedProduct(null);
      return;
    }
    const product = availableProducts.find((prod) => prod.id === Number(value));
    if (product) {
      setSelectedProduct(product);
      setQuantityInput('1');
      setPriceInput(String(product.sell_price_usd ?? 0));
    }
  };

  const handleAddSelectedProduct = () => {
    if (!selectedProduct) {
      toast.error('Mahsulot tanlang');
      return;
    }
    const qtyValue = Number(quantityInput || 1);
    if (!Number.isFinite(qtyValue) || qtyValue <= 0) {
      toast.error('Miqdor 1 dan katta bo\'lishi kerak');
      return;
    }
    const priceValue = Number(priceInput || selectedProduct.sell_price_usd || 0);
    if (!Number.isFinite(priceValue) || priceValue < 0) {
      toast.error('Narx musbat bo\'lishi kerak');
      return;
    }
    addItem({
      product: selectedProduct.id,
      productName: selectedProduct.name,
      qty: qtyValue,
      price_usd: priceValue,
    });
    toast.success('Mahsulot qo\'shildi');
    setQuantityInput('1');
    setPriceInput(String(selectedProduct.sell_price_usd ?? 0));
  };

  const handleItemQtyChange = (productId: number, qty: number) => {
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error('Miqdor 1 dan katta bo\'lishi kerak');
      return;
    }
    updateItem(productId, { qty });
  };

  const handleItemPriceChange = (productId: number, price: number) => {
    if (!Number.isFinite(price) || price < 0) {
      toast.error('Narx musbat bo\'lishi kerak');
      return;
    }
    updateItem(productId, { price_usd: price });
  };

  const handleClearDraft = () => {
    clearOrder();
    setNote('');
    resetProductInputs();
    toast.success('Draft tozalandi');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!dealerId) {
      toast.error('Dealer is required');
      return;
    }
    if (!selectedItems.length) {
      toast.error('Kamida bitta mahsulot qo\'shing');
      return;
    }

    const payloadItems = selectedItems.map((item) => ({
      product: item.product,
      qty: item.qty,
      price_usd: item.price_usd,
    }));

    await http.post('/api/orders/', {
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
    toast.success('Order created');
    loadOrders().catch(() => null);
  };

  const handleStatusChange = async (orderId: number, status: string) => {
    try {
      await http.patch(`/api/orders/${orderId}/status/`, { status });
      toast.success('Status updated');
      loadOrders().catch(() => null);
    } catch (error) {
      console.error(error);
      toast.error('Status change failed');
    }
  };

  const handlePdf = async (orderId?: number, displayNo?: string) => {
    try {
      if (orderId) {
        const filename = displayNo ? `${displayNo}.pdf` : `order-${orderId}.pdf`;
        await downloadFile(`/api/orders/${orderId}/pdf/`, filename);
      } else {
        await downloadFile('/api/orders/report/pdf/', 'orders.pdf');
      }
    } catch (error) {
      console.error(error);
      toast.error('PDF yuklab olinmadi');
    }
  };

  const handleExcel = () => downloadFile('/api/orders/export/excel/', 'orders.xlsx');

  const toggleOrderDetails = (orderId: number) =>
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));

  const orderRows = useMemo(
    () =>
      orders.map((order) => ({
        ...order,
        total: formatCurrency(order.total_usd),
      })),
    [orders]
  );

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('nav.orders')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Statusni kuzatish va eksport.</p>
        </div>
        <div className="flex flex-wrap gap-3">
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
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('nav.dealers')}</label>
            <select
              required
              value={dealerId}
              onChange={(event) => setDealerId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">Tanlang</option>
              {dealers.map((dealer) => (
                <option key={dealer.id} value={dealer.id}>
                  {dealer.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Order type</label>
            <select
              value={orderType}
              onChange={(event) => setOrderType(event.target.value as 'regular' | 'reserve')}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="regular">Oddiy</option>
              <option value="reserve">Bron</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Izoh</label>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Eslatma..."
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Brand</label>
            <select
              value={brandId ?? ''}
              onChange={(event) => handleFilterChange('brandId', event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">Barcha brandlar</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Category</label>
            <select
              value={categoryId ?? ''}
              onChange={(event) => handleFilterChange('categoryId', event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">Barcha kategoriyalar</option>
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
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Mahsulot qidirish</label>
            <input
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              placeholder="Mahsulot nomi, brand yoki kategoriya..."
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-[2fr,1fr,1fr,auto]">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Mahsulot tanlash</label>
              <select
                value={selectedProduct?.id ?? ''}
                onChange={(event) => handleSelectProduct(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Mahsulot tanlang</option>
                {filteredProducts.map((product) => {
                  const stock = product.total_stock ?? product.stock_ok ?? 0;
                  const isLow = (product.total_stock ?? product.stock_ok ?? 0) <= 0;
                  return (
                    <option key={product.id} value={product.id}>
                      {product.name} · {product.brand?.name ?? '—'} · {product.category?.name ?? '—'}{' '}
                      {isLow ? '(Zaxira tugagan)' : `(${stock ?? 0} dona)`}
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
                min={1}
                value={quantityInput}
                onChange={(event) => setQuantityInput(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Narx (USD)</label>
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
                ➕ Qo&apos;shish
              </button>
            </div>
          </div>
          {productsLoading && (
            <p className="text-sm text-slate-500 dark:text-slate-400">Mahsulotlar yuklanmoqda...</p>
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
            Draftni tozalash
          </button>
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-700 dark:bg-emerald-500 dark:text-slate-900"
            type="submit"
          >
            {t('actions.create')}
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">ID</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">{t('nav.dealers')}</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">Type</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">Qiymat</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">{t('app.operations')}</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-200">PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
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
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{order.dealer?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          order.is_reserve
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-200'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-200'
                        }`}
                      >
                        {order.is_reserve ? 'Bron' : 'Oddiy'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                      <select
                        className="mt-2 w-full rounded-md border border-slate-200 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        value={order.status}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => handleStatusChange(order.id, event.target.value)}
                      >
                        {ORDER_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{order.total}</td>
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
                            <div className="font-semibold text-slate-700 dark:text-white">Tarkibi</div>
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
                                      {item.product_detail?.name ?? `Mahsulot #${item.product ?? '—'}`}
                                    </span>
                                    <span className="text-slate-600 dark:text-slate-300">
                                      {item.qty} × {formatCurrency(price)} = {formatCurrency(lineTotal)}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ) : (
                          <div className="text-center text-slate-500 dark:text-slate-300">Tarkib mavjud emas</div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {!loading && orderRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-300">
                  Buyurtmalar topilmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default OrdersPage;
