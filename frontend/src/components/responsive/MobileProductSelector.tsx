import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchOutlined, CloseOutlined } from '@ant-design/icons';
import { cleanName, formatCurrency } from '../../utils/formatters';

type ProductOption = {
  id: number;
  name: string;
  sell_price_usd: number;
  stock_ok?: number;
  brand?: { id: number; name: string } | null;
  category?: { id: number; name: string } | null;
  size?: string;
};

type MobileProductSelectorProps = {
  open: boolean;
  onClose: () => void;
  products: ProductOption[];
  brands: Array<{ id: number; name: string }>;
  categories: Array<{ id: number; name: string }>;
  brandId?: number;
  categoryId?: number;
  productSearch: string;
  productsLoading: boolean;
  onBrandChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onProductSearchChange: (value: string) => void;
  onProductSelect: (productId: number) => void;
};

/**
 * MobileProductSelector - Full-screen product search and selection
 * 
 * Features:
 * - Full-screen overlay with search on top
 * - Scrollable product list with brand/category filters
 * - Touch-friendly product cards
 * - Stock status indicators
 * - Dark mode support
 */
const MobileProductSelector = ({
  open,
  onClose,
  products,
  brands,
  categories,
  brandId,
  categoryId,
  productSearch,
  productsLoading,
  onBrandChange,
  onCategoryChange,
  onProductSearchChange,
  onProductSelect,
}: MobileProductSelectorProps) => {
  const { t } = useTranslation();
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  if (!open) return null;

  const handleProductClick = (productId: number) => {
    onProductSelect(productId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-white dark:bg-slate-900">
      {/* Header with search */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t('orders.form.productSelect')}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <CloseOutlined className="text-xl" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={productSearch}
            onChange={(e) => onProductSearchChange(e.target.value)}
            placeholder={t('orders.form.productSearchPlaceholder')}
            className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-4 text-base dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            style={{ fontSize: '16px' }}
            autoFocus
          />
        </div>

        {/* Filters Toggle */}
        <button
          type="button"
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          {filtersExpanded ? '▲ Filtrlarni yashirish' : '▼ Filtrlar'}
        </button>

        {/* Collapsible Filters */}
        {filtersExpanded && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                {t('orders.filters.brand')}
              </label>
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
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                {t('orders.filters.category')}
              </label>
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
            </div>
          </div>
        )}
      </div>

      {/* Product List */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {productsLoading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            {t('orders.form.productsLoading')}
          </div>
        ) : products.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-slate-500">Mos mahsulot topilmadi.</p>
            <p className="mt-2 text-xs text-slate-400">
              Qidiruv yoki filtrlarni o'zgartiring
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((product) => {
              const stock = product.stock_ok ?? 0;
              const isOutOfStock = stock <= 0;
              const isNegativeStock = stock < 0;
              const brandLabel = product.brand?.name ?? '-';
              const categoryLabel = product.category?.name ?? '-';
              
              // Show size if category is NOT "Дверное полотно" and size exists
              const categoryName = product.category?.name?.toLowerCase() || '';
              const showSize = 
                !categoryName.includes('дверное полотно') &&
                product.size &&
                product.size.trim().length > 0;
              
              const displayName = showSize
                ? `${cleanName(product.name)} — ${product.size}`
                : cleanName(product.name);

              return (
                <button
                  key={product.id}
                  onClick={() => !isOutOfStock && handleProductClick(product.id)}
                  disabled={isOutOfStock}
                  className={`w-full rounded-lg border p-4 text-left transition-all ${
                    isOutOfStock
                      ? 'border-slate-200 bg-slate-50 opacity-60 dark:border-slate-800 dark:bg-slate-800/50'
                      : 'border-slate-300 bg-white hover:border-emerald-500 hover:bg-emerald-50 active:scale-98 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/20'
                  }`}
                  style={{ minHeight: '80px' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 
                        className={isNegativeStock ? '' : 'font-semibold text-slate-900 dark:text-white'}
                        style={isNegativeStock ? { 
                          color: '#FF6B6B',
                          fontStyle: 'italic',
                          fontWeight: 400
                        } : { fontWeight: 600 }}
                      >
                        {displayName}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {brandLabel} • {categoryLabel}
                      </p>
                    </div>
                    <div className="ml-3 text-right">
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(product.sell_price_usd)}
                      </p>
                      <p className="text-xs text-slate-500">USD</p>
                    </div>
                  </div>

                  {/* Stock Status */}
                  <div className="mt-3 flex items-center gap-2">
                    {isOutOfStock ? (
                      <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                        ⚠️ Omborda mavjud emas
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        ✓ Omborda: {stock}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileProductSelector;
