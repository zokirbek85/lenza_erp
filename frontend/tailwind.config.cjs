/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      /* ===== LENZA CORPORATE COLORS ===== */
      colors: {
        lenza: {
          gold: '#C9A86C',
          'gold-hover': '#B89357',
          'gold-light': '#E4CDA0',
          graphite: '#1A1A1A',
          'graphite-light': '#2A2A2A',
        },
        // Dark Navy palette (overrides default slate in dark mode)
        slate: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1A1F29',  // Dark navy secondary
          900: '#0F1419',  // Dark navy base
          950: '#0A0E14',  // Deep navy body
        },
        // Light theme backgrounds
        bg: {
          base: '#F8FAFC',
          secondary: '#F1F5F9',
          body: '#FFFFFF',
          container: '#FFFFFF',
        },
        // Text colors
        text: {
          color: '#1A1A1A',
          secondary: '#6B7280',
          tertiary: '#94A3B8',
        },
        // Border colors
        border: {
          color: '#E5E7EB',
        },
        // State colors
        success: '#16A34A',
        warning: '#F59E0B',
        error: '#DC2626',
      },
      
      /* ===== TYPOGRAPHY ===== */
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Helvetica Neue', 'sans-serif'],
        heading: ['Rubik', 'Inter', 'sans-serif'],
      },
      fontSize: {
        'xs': ['12px', { lineHeight: '1.5' }],
        'sm': ['13px', { lineHeight: '1.5' }],
        'base': ['14px', { lineHeight: '1.5' }],
        'lg': ['16px', { lineHeight: '1.5' }],
        'xl': ['18px', { lineHeight: '1.5' }],
        'h2': ['22px', { lineHeight: '1.25' }],
        'h1': ['28px', { lineHeight: '1.2' }],
      },
      
      /* ===== SPACING ===== */
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      
      /* ===== BORDER RADIUS ===== */
      borderRadius: {
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      
      /* ===== BOX SHADOW ===== */
      boxShadow: {
        'soft': '0 1px 2px 0 rgba(26, 26, 26, 0.04)',
        'base': '0 1px 3px 0 rgba(26, 26, 26, 0.08), 0 1px 2px -1px rgba(26, 26, 26, 0.08)',
        'medium': '0 4px 6px -1px rgba(26, 26, 26, 0.08), 0 2px 4px -2px rgba(26, 26, 26, 0.08)',
        'strong': '0 10px 15px -3px rgba(26, 26, 26, 0.08), 0 4px 6px -4px rgba(26, 26, 26, 0.08)',
        'lifted': '0 20px 25px -5px rgba(26, 26, 26, 0.08), 0 8px 10px -6px rgba(26, 26, 26, 0.08)',
      },
      
      /* ===== TRANSITIONS ===== */
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      
      /* ===== Z-INDEX ===== */
      zIndex: {
        'dropdown': '1000',
        'sticky': '1100',
        'fixed': '1200',
        'modal-backdrop': '2700',
        'modal': '2800',
        'drawer': '3000',
        'mobile-sticky': '3200',
        'tooltip': '3500',
      },
    },
  },
  plugins: [],
};
