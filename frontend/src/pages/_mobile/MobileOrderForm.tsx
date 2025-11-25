import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import MobileDrawerForm from '../../components/responsive/MobileDrawerForm';
import MobileFormField from '../../components/responsive/MobileFormField';
import { cleanName, formatCurrency, formatQuantity } from '../../utils/formatters';

type OrderItem = {
  product: number;
  productName: string;
  qty: number;
  price_usd: number;
};

type ProductOption = {
  id: number;
  name: string;
  sell_price_usd: number;
  stock_ok?: number;
  stock_defect?: number;
  total_stock?: number;
  brand?: { id: number; name: string } | null;
  category?: { id: number; name: string } | null;
};

type MobileOrderFormProps = {
  open: boolean;
  onClose: () => void;
  dealerId: string;
  orderType: 'regular' | 'reserve';
  note: string;
  dealers: Array<{ id: number; name: string }>;
  brands: Array<{ id: number; name: string }>;
  categories: Array<{ id: number; name: string }>;
  products: ProductOption[];
  selectedItems: OrderItem[];
  brandId?: number;
  categoryId?: number;
  productSearch: string;
  selectedProduct: ProductOption | null;
  quantityInput: string;
  priceInput: string;
  productsLoading: boolean;
  onDealerChange: (value: string) => void;
  onOrderTypeChange: (value: 'regular' | 'reserve') => void;
  onNoteChange: (value: string) => void;
  onBrandChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onProductSearchChange: (value: string) => void;
  onProductSelect: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onAddProduct: () => void;
  onRemoveItem: (productId: number) => void;
  onItemQtyChange: (productId: number, qty: number) => void;
  onItemPriceChange: (productId: number, price: number) => void;
  onSubmit: () => void;
  onClearDraft: () => void;
};

/**
 * MobileOrderForm - Full-screen order creation form for mobile devices
 * 
 * Features:
 * - Product search with filters
 * - Order items list with swipe-to-delete
 * - Real-time total calculation
 * - Fixed bottom action bar
 * - Dark mode support
 */
const MobileOrderForm = ({
  open,
  onClose,
  dealerId,
  orderType,
  note,
  dealers,
  brands,
  categories,
  products,
  selectedItems,
  brandId,
  categoryId,
  productSearch,
  selectedProduct,
  quantityInput,
  priceInput,
  productsLoading,
  onDealerChange,
  onOrderTypeChange,
  onNoteChange,
  onBrandChange,
  onCategoryChange,
  onProductSearchChange,
  onProductSelect,
  onQuantityChange,
  onPriceChange,
  onAddProduct,
  onRemoveItem,
  onItemQtyChange,
  onItemPriceChange,
  onSubmit,
  onClearDraft,
}: MobileOrderFormProps) => {
  const { t } = useTranslation();
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);

  const totalAmount = selectedItems.reduce(
    (sum, item) => sum + item.qty * item.price_usd,
    0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const footer = (
    <div className="space-y-2">
      {/* Total Amount Display */}
      <div className="flex items-center justify-between rounded-lg bg-slate-100 px-4 py-3 dark:bg-slate-800">
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          {t('orders.form.total')}:
        </span>
        <span className="text-lg font-bold text-slate-900 dark:text-white">
          {formatCurrency(totalAmount)} USD
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClearDraft}
          className="mobile-btn flex-1 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
        >
          {t('orders.form.clearDraft')}
        </button>
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={selectedItems.length === 0}
          className="mobile-btn flex-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500"
        >
          {t('common:actions.create')}
        </button>
      </div>
    </div>
  );

  return (
    <MobileDrawerForm
      open={open}
      onClose={onClose}
      title={t('orders.header.panelTitle')}
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Info Section */}
        <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm dark:bg-slate-900">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t('orders.form.orderInfo')}
          </h3>

          <MobileFormField label={t('orders.form.dealer')} required>
            <select
              required
              value={dealerId}
              onChange={(e) => onDealerChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              style={{ minHeight: '44px', fontSize: '16px' }}
            >
              <option value="">{t('orders.form.dealerPlaceholder')}</option>
              {dealers.map((dealer) => (
                <option key={dealer.id} value={dealer.id}>
                  {dealer.name}
                </option>
              ))}
            </select>
          </MobileFormField>

          <MobileFormField label={t('orders.form.orderType')}>
            <select
              value={orderType}
              onChange={(e) => onOrderTypeChange(e.target.value as 'regular' | 'reserve')}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              style={{ minHeight: '44px', fontSize: '16px' }}
            >
              <option value="regular">{t('orders.types.regular')}</option>
              <option value="reserve">{t('orders.types.reserve')}</option>
            </select>
          </MobileFormField>

          <MobileFormField label={t('orders.form.note')}>
            <textarea
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder={t('orders.form.notePlaceholder')}
              rows={2}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              style={{ fontSize: '16px' }}
            />
          </MobileFormField>
        </div>

        {/* Product Selection Section */}
        <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm dark:bg-slate-900">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t('orders.form.addProducts')}
          </h3>

          {/* Product Filters */}
          <div className="grid grid-cols-2 gap-3">
            <MobileFormField label={t('orders.filters.brand')}>
              <select
                value={brandId ?? ''}
                onChange={(e) => onBrandChange(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                style={{ minHeight: '44px', fontSize: '16px' }}
              >
                <option value="">{t('orders.filters.allBrands')}</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </MobileFormField>

            <MobileFormField label={t('orders.filters.category')}>
              <select
                value={categoryId ?? ''}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                style={{ minHeight: '44px', fontSize: '16px' }}
              >
                <option value="">{t('orders.filters.allCategories')}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </MobileFormField>
          </div>

          {/* Product Search */}
          <MobileFormField label={t('orders.form.productSearch')}>
            <input
              type="text"
              value={productSearch}
              onChange={(e) => onProductSearchChange(e.target.value)}
              placeholder={t('orders.form.productSearchPlaceholder')}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              style={{ minHeight: '44px', fontSize: '16px' }}
            />
          </MobileFormField>

          {/* Product Select */}
          <MobileFormField label={t('orders.form.productSelect')}>
            <select
              value={selectedProduct?.id ?? ''}
              onChange={(e) => onProductSelect(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              style={{ minHeight: '44px', fontSize: '16px' }}
            >
              <option value="">{t('orders.form.productSelectPlaceholder')}</option>
              {products.map((product) => {
                const stock = product.total_stock ?? product.stock_ok ?? 0;
                const isLow = stock <= 0;
                const brandLabel = product.brand?.name ?? '-';
                const categoryLabel = product.category?.name ?? '-';
                const stockLabel = isLow ? '(Zaxira tugagan)' : `(Zaxira: ${stock})`;
                return (
                  <option key={product.id} value={product.id}>
                    {cleanName(product.name)} - {brandLabel} - {categoryLabel} {stockLabel}
                  </option>
                );
              })}
            </select>
            {productsLoading && (
              <p className="mt-1 text-xs text-slate-500">{t('orders.form.productsLoading')}</p>
            )}
            {!products.length && !productsLoading && (
              <p className="mt-1 text-xs text-slate-500">Mos mahsulot topilmadi.</p>
            )}
          </MobileFormField>

          {/* Quantity and Price */}
          <div className="grid grid-cols-2 gap-3">
            <MobileFormField label="Miqdor">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={quantityInput}
                onChange={(e) => onQuantityChange(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                style={{ minHeight: '44px', fontSize: '16px' }}
              />
            </MobileFormField>

            <MobileFormField label={t('orders.form.price')}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={priceInput}
                onChange={(e) => onPriceChange(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                style={{ minHeight: '44px', fontSize: '16px' }}
              />
            </MobileFormField>
          </div>

          {/* Add Product Button */}
          <button
            type="button"
            onClick={onAddProduct}
            disabled={!selectedProduct}
            className="mobile-btn w-full rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500"
          >
            <PlusOutlined className="mr-2" />
            {t('common:actions.add')}
          </button>
        </div>

        {/* Selected Items List */}
        {selectedItems.length > 0 && (
          <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t('orders.form.selectedProducts')}
              </h3>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                {selectedItems.length} {t('common.items')}
              </span>
            </div>

            <div className="space-y-3">
              {selectedItems.map((item) => (
                <div
                  key={item.product}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800"
                >
                  {/* Product Name */}
                  <div className="mb-2 flex items-start justify-between">
                    <p className="flex-1 text-sm font-semibold text-slate-900 dark:text-white">
                      {item.productName}
                    </p>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.product)}
                      className="ml-2 rounded-full p-1 text-rose-600 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-900/30"
                    >
                      <DeleteOutlined />
                    </button>
                  </div>

                  {/* Quantity and Price Inputs */}
                  {expandedProduct === item.product ? (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-slate-500 dark:text-slate-400">Miqdor</label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.qty}
                          onChange={(e) => onItemQtyChange(item.product, Number(e.target.value))}
                          className="w-full rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 dark:text-slate-400">Narx (USD)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.price_usd}
                          onChange={(e) => onItemPriceChange(item.product, Number(e.target.value))}
                          className="w-full rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedProduct(null)}
                        className="w-full rounded-lg bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                      >
                        {t('common:actions.collapse')}
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Summary Display */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-300">
                          {formatQuantity(item.qty)} × {formatCurrency(item.price_usd)}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(item.qty * item.price_usd)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedProduct(item.product)}
                        className="mt-2 w-full rounded-lg bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                      >
                        {t('common:actions.edit')}
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom spacing for fixed footer */}
        <div style={{ height: '120px' }} />
      </form>
    </MobileDrawerForm>
  );
};

export default MobileOrderForm;
