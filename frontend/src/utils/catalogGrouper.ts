/**
 * Catalog Product Grouping Utility
 * 
 * This utility provides functions to group door panel products by their base name,
 * removing width suffixes (400mm, 600mm, 700mm, 800mm, 900mm) and aggregating
 * stock information across all width variants.
 * 
 * Used by:
 * - Catalog page
 * - Marketing document generator
 * - Any other module that needs grouped product views
 */

export interface CatalogProduct {
  id: number;
  name: string;
  brand_name: string;
  price_usd: string;
  image: string | null;
  stock: {
    '400': number;
    '600': number;
    '700': number;
    '800': number;
    '900': number;
  };
}

export interface GroupedProduct {
  id: string;
  baseName: string;
  brand_name: string;
  price_usd: string;
  image: string | null;
  stock: {
    '400': number;
    '600': number;
    '700': number;
    '800': number;
    '900': number;
  };
  originalProducts: CatalogProduct[];
}

export const widthLabels = ['400', '600', '700', '800', '900'] as const;

/**
 * Extract base name from product name by removing ONLY the trailing width suffix
 * 
 * Examples:
 *   "Классика - 50001, Лакобель белый ПГ, 800мм" -> "Классика - 50001, Лакобель белый ПГ"
 *   "Венеция Ясень белый ПГ, 600мм" -> "Венеция Ясень белый ПГ"
 *   "Porta Prima, 800mm" -> "Porta Prima"
 */
export const extractBaseName = (productName: string): string => {
  const widthPattern = /,\s*(\d{2,4})\s*(мм|mm)?$/i;
  const baseName = productName.replace(widthPattern, '').trim();
  return baseName || productName;
};

/**
 * Extract width from product name
 * Returns one of: '400', '600', '700', '800', '900', or null
 */
export const extractWidth = (productName: string): string | null => {
  const match = productName.match(/,\s*(\d{3,4})\s*(мм|mm)?$/i);
  if (match) {
    const width = match[1];
    if (['400', '600', '700', '800', '900'].includes(width)) {
      return width;
    }
  }
  return null;
};

/**
 * Group products by base name and aggregate stock by width
 * 
 * @param products - Array of catalog products from backend
 * @param applyMarkup - Optional dealer markup percentage (e.g., 15 for 15%)
 * @returns Array of grouped products sorted by base name
 */
export const groupProducts = (
  products: CatalogProduct[],
  applyMarkup?: number
): GroupedProduct[] => {
  const groups: Record<string, GroupedProduct> = {};

  products.forEach((product) => {
    const baseName = extractBaseName(product.name);
    const width = extractWidth(product.name);

    if (!groups[baseName]) {
      // Calculate price with markup if applicable
      let finalPrice = parseFloat(product.price_usd);
      if (applyMarkup && applyMarkup > 0) {
        finalPrice = finalPrice * (1 + applyMarkup / 100);
      }

      groups[baseName] = {
        id: `group-${baseName.replace(/\s+/g, '-').toLowerCase()}`,
        baseName,
        brand_name: product.brand_name,
        price_usd: finalPrice.toFixed(2),
        image: product.image,
        stock: {
          '400': 0,
          '600': 0,
          '700': 0,
          '800': 0,
          '900': 0,
        },
        originalProducts: [],
      };
    }

    groups[baseName].originalProducts.push(product);

    // Aggregate stock from all variants
    widthLabels.forEach((w) => {
      if (product.stock && typeof product.stock[w] === 'number') {
        groups[baseName].stock[w] += product.stock[w];
      }
    });

    // Image priority: prefer 400mm, then smallest width, then any available
    if (width === '400' && product.image) {
      groups[baseName].image = product.image;
    } else if (!groups[baseName].image && product.image) {
      groups[baseName].image = product.image;
    }

    // Price priority: use 400mm price if available
    if (width === '400') {
      let finalPrice = parseFloat(product.price_usd);
      if (applyMarkup && applyMarkup > 0) {
        finalPrice = finalPrice * (1 + applyMarkup / 100);
      }
      groups[baseName].price_usd = finalPrice.toFixed(2);
    }
  });

  return Object.values(groups).sort((a, b) => a.baseName.localeCompare(b.baseName));
};

/**
 * Calculate total stock for a grouped product
 */
export const getTotalStock = (group: GroupedProduct): number => {
  return widthLabels.reduce((sum, width) => sum + group.stock[width], 0);
};

/**
 * Format stock display text
 */
export const formatStockText = (group: GroupedProduct, notAvailableText: string = 'N/A'): string => {
  const stockParts = widthLabels
    .filter((w) => group.stock[w] > 0)
    .map((w) => `${w}: ${group.stock[w]}`);
  
  return stockParts.length > 0 ? stockParts.join(', ') : notAvailableText;
};
