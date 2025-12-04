import { Card, Empty, Badge } from 'antd';
import { ShoppingOutlined } from '@ant-design/icons';
import type { GroupedProduct } from '../../utils/catalogGrouper';

type ViewMode = 'cards' | 'gallery-comfort' | 'gallery-compact' | 'gallery-ultra';

type MobileCatalogCardsProps = {
  products: GroupedProduct[];
  viewMode: ViewMode;
  onProductClick?: (product: GroupedProduct) => void;
};

/**
 * MobileCatalogCards - Mobile-optimized catalog display
 * 
 * Features:
 * - Multiple view modes (cards, gallery)
 * - Touch-optimized images
 * - Stock breakdown by width
 * - Responsive grid layout
 */
const MobileCatalogCards = ({
  products,
  viewMode,
  onProductClick,
}: MobileCatalogCardsProps) => {
  if (products.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Empty description="Ҳеч қандай маҳсулот топилмади" />
      </div>
    );
  }

  const widths = ['400', '600', '700', '800', '900'] as const;

  const getTotalStock = (product: GroupedProduct) => {
    return widths.reduce((sum, width) => sum + product.stock[width], 0);
  };

  const renderStockBadges = (product: GroupedProduct) => {
    const stockEntries = widths
      .map((width) => ({ width, stock: product.stock[width] }))
      .filter(({ stock }) => stock > 0);

    if (stockEntries.length === 0) {
      return (
        <div className="flex flex-wrap gap-1">
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
            Tugagan
          </span>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-1">
        {stockEntries.map(({ width, stock }) => (
          <Badge
            key={width}
            count={stock}
            showZero
            overflowCount={999}
            style={{ backgroundColor: 'var(--success)' }}
          >
            <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {width}мм
            </span>
          </Badge>
        ))}
      </div>
    );
  };

  // Cards View - Full card display
  if (viewMode === 'cards') {
    return (
      <div className="space-y-4">
        {products.map((product) => (
          <Card
            key={product.baseName}
            className="overflow-hidden rounded-xl border border-slate-200 shadow-sm hover:shadow-md dark:border-slate-800"
            onClick={() => onProductClick?.(product)}
            bodyStyle={{ padding: '1rem' }}
          >
            <div className="flex gap-3">
              {/* Product Image */}
              <div className="flex-shrink-0">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.baseName}
                    className="h-24 w-24 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                    <ShoppingOutlined className="text-2xl text-slate-400" />
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="flex-1">
                <h3 className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">
                  {product.baseName}
                </h3>
                <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                  {product.brand_name}
                </p>

                {/* Stock Badges */}
                {renderStockBadges(product)}

                {/* Total Stock */}
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="text-slate-600 dark:text-slate-300">Жами:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {getTotalStock(product)} дона
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // Gallery Views - Compact layouts
  const isCompact = viewMode === 'gallery-compact' || viewMode === 'gallery-ultra';
  const isUltra = viewMode === 'gallery-ultra';

  return (
    <div
      className={`grid gap-3 ${
        isUltra ? 'grid-cols-3' : isCompact ? 'grid-cols-2' : 'grid-cols-1'
      }`}
    >
      {products.map((product) => (
        <Card
          key={product.baseName}
          className="overflow-hidden rounded-xl border border-slate-200 shadow-sm hover:shadow-md dark:border-slate-800"
          onClick={() => onProductClick?.(product)}
          bodyStyle={{ padding: isUltra ? '0.5rem' : '0.75rem' }}
        >
          {/* Product Image */}
          <div className="relative mb-2 overflow-hidden rounded-lg">
            {product.image ? (
              <img
                src={product.image}
                alt={product.baseName}
                className={`w-full object-cover ${
                  isUltra ? 'h-20' : 'h-32'
                }`}
              />
            ) : (
              <div
                className={`flex w-full items-center justify-center bg-slate-100 dark:bg-slate-800 ${
                  isUltra ? 'h-20' : 'h-32'
                }`}
              >
                <ShoppingOutlined
                  className={`text-slate-400 ${
                    isUltra ? 'text-lg' : 'text-2xl'
                  }`}
                />
              </div>
            )}

            {/* Total Stock Badge */}
            <div className="absolute bottom-1 right-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-bold text-white">
              {getTotalStock(product)}
            </div>
          </div>

          {/* Product Name */}
          <h3
            className={`mb-1 font-semibold text-slate-900 dark:text-white ${
              isUltra ? 'text-xs' : 'text-sm'
            }`}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: isUltra ? 2 : 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {product.baseName}
          </h3>

          {/* Brand */}
          {!isUltra && (
            <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
              {product.brand_name}
            </p>
          )}

          {/* Stock Badges - Compact */}
          {!isUltra && (
            <div className="flex flex-wrap gap-1">
              {widths
                .filter((width) => product.stock[width] > 0)
                .map((width) => (
                  <span
                    key={width}
                    className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  >
                    {width}мм: {product.stock[width]}
                  </span>
                ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

export default MobileCatalogCards;
