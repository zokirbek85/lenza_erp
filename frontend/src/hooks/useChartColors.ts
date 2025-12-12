import { useTheme } from '../context/ThemeContext';

/**
 * Theme-adaptive color palettes for charts
 * Returns colors optimized for current theme (dark/light)
 */

export interface ChartColorPalette {
  primary: string[];
  secondary: string[];
  background: string;
  text: string;
  grid: string;
  tooltip: {
    background: string;
    border: string;
    text: string;
  };
}

export function useChartColors(): ChartColorPalette {
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  if (isDark) {
    // Dark mode: pastel colors with high contrast
    return {
      primary: [
        '#d4af37', // Gold
        '#60a5fa', // Light blue
        '#34d399', // Emerald
        '#fbbf24', // Amber
        '#a78bfa', // Violet
        '#fb923c', // Orange
        '#f472b6', // Pink
        '#4ade80', // Green
      ],
      secondary: [
        '#94a3b8', // Slate
        '#64748b',
        '#475569',
        '#334155',
      ],
      background: '#0A0E14',
      text: '#e2e8f0',
      grid: '#374151',
      tooltip: {
        background: '#1A1F29',
        border: '#475569',
        text: '#f1f5f9',
      },
    };
  }

  // Light mode: softer colors with dark labels
  return {
    primary: [
      '#d4af37', // Gold
      '#3b82f6', // Blue
      '#10b981', // Green
      '#f59e0b', // Amber
      '#8b5cf6', // Purple
      '#ef4444', // Red
      '#ec4899', // Pink
      '#06b6d4', // Cyan
    ],
    secondary: [
      '#cbd5e1', // Slate light
      '#94a3b8',
      '#64748b',
      '#475569',
    ],
    background: '#ffffff',
    text: '#1e293b',
    grid: '#e2e8f0',
    tooltip: {
      background: '#ffffff',
      border: '#e2e8f0',
      text: '#1e293b',
    },
  };
}

/**
 * Get color intensity based on value
 * Returns color from gradient based on normalized value (0-1)
 */
export function getIntensityColor(value: number, maxValue: number, isDark: boolean): string {
  const intensity = maxValue > 0 ? value / maxValue : 0;
  
  if (isDark) {
    // Dark mode gradient
    if (intensity > 0.8) return '#d4af37'; // Gold
    if (intensity > 0.6) return '#60a5fa'; // Light blue
    if (intensity > 0.4) return '#34d399'; // Emerald
    if (intensity > 0.2) return '#94a3b8'; // Slate
    return '#64748b';
  }
  
  // Light mode gradient
  if (intensity > 0.8) return '#d4af37'; // Gold
  if (intensity > 0.6) return '#3b82f6'; // Blue
  if (intensity > 0.4) return '#10b981'; // Green
  if (intensity > 0.2) return '#64748b'; // Slate
  return '#cbd5e1';
}

/**
 * Smart label configuration based on available space
 */
export function getSmartLabelConfig(width: number, height: number, itemCount: number) {
  const minSize = Math.min(width, height);
  
  // Label font size (10-18px range)
  const fontSize = Math.max(10, Math.min(minSize * 0.04, 18));
  
  // Legend mode
  let legendPosition: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
  let legendAlign: 'start' | 'center' | 'end' = 'center';
  
  if (width > height * 1.5) {
    // Wide layout - legend on right
    legendPosition = 'right';
    legendAlign = 'start';
  } else if (height > width * 1.5) {
    // Tall layout - legend on bottom
    legendPosition = 'bottom';
  }
  
  // Truncate labels if too many items
  const maxLabelLength = width < 400 ? 15 : width < 600 ? 20 : 30;
  
  // Legend visibility
  const showLegend = itemCount <= 8 || minSize > 300;
  
  return {
    fontSize,
    legendPosition,
    legendAlign,
    maxLabelLength,
    showLegend,
    truncateAt: maxLabelLength,
  };
}
