import { useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';

/**
 * Universal autoscale hook - widget o'lchamini kuzatadi va autoscale parametrlarini qaytaradi
 * 
 * @param ref - Widget container ref
 * @returns Object with dimensions and calculated scale parameters
 * 
 * Usage:
 * ```tsx
 * const ref = useRef<HTMLDivElement>(null);
 * const { width, height, fontSize, chartPadding, rowCount } = useAutoscale(ref);
 * ```
 */
export interface AutoscaleParams {
  // Raw dimensions
  width: number;
  height: number;
  
  // Calculated scale parameters
  fontSize: number;        // Base font size (12-28px)
  titleFontSize: number;   // Title font size (+4px larger)
  chartPadding: number;    // Chart padding (20-60px)
  rowCount: number;        // Table visible rows (min 3)
  barSize: number;         // Bar chart bar width
  iconSize: number;        // Icon size (24-48px)
  cardPadding: number;     // Card internal padding
}

export function useAutoscale(ref: RefObject<HTMLElement | null>): AutoscaleParams {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!ref.current) return;

    // ResizeObserver - real-time o'lcham o'zgarishini kuzatish
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;

      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    resizeObserver.observe(ref.current);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
    };
  }, [ref]);

  // Calculate autoscale parameters based on dimensions
  const { width, height } = dimensions;

  // Base font size: 12px (min) - 28px (max)
  // Formula: height * 0.08, clamped to range
  const fontSize = Math.max(12, Math.min(height * 0.08, 28));

  // Title font size: +4px larger than base
  const titleFontSize = fontSize + 4;

  // Chart padding: 20px (min) - 60px (max)
  // Formula: height * 0.1
  const chartPadding = Math.max(20, Math.min(height * 0.1, 60));

  // Table row count: minimum 3 rows
  // Formula: height / 48 (approximate row height with padding)
  const rowCount = Math.max(3, Math.floor(height / 48));

  // Bar size for bar charts: 15px (min) - 80px (max)
  // Formula: width * 0.08
  const barSize = Math.max(15, Math.min(width * 0.08, 80));

  // Icon size: 24px (min) - 48px (max)
  // Formula: height * 0.15
  const iconSize = Math.max(24, Math.min(height * 0.15, 48));

  // Card padding: 12px (min) - 24px (max)
  // Formula: height * 0.05
  const cardPadding = Math.max(12, Math.min(height * 0.05, 24));

  return {
    width,
    height,
    fontSize,
    titleFontSize,
    chartPadding,
    rowCount,
    barSize,
    iconSize,
    cardPadding,
  };
}
