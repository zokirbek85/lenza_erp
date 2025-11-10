import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem('lenza_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // Update root class for Tailwind dark mode
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Update data-theme attribute for CSS variables
    root.setAttribute('data-theme', mode);
    
    // Save to localStorage
    localStorage.setItem('lenza_theme', mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode);
  };

  const isDark = mode === 'dark';

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, setTheme }}>
      <ConfigProvider
        theme={{
          algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: {
            // Primary colors - Lenza Gold
            colorPrimary: '#d4af37',
            colorInfo: '#d4af37',
            
            // Background colors - Lenza brand palette
            colorBgBase: isDark ? '#0d1117' : '#ffffff',
            colorBgContainer: isDark ? '#1b1f27' : '#ffffff',
            colorBgElevated: isDark ? '#2a2e3a' : '#ffffff',
            colorBgLayout: isDark ? '#0d1117' : '#f5f5f5',
            colorBgSpotlight: isDark ? '#1b1f27' : '#fafafa',
            
            // Text colors
            colorText: isDark ? '#f5f6fa' : '#141414',
            colorTextSecondary: isDark ? '#a8adb7' : '#666666',
            colorTextTertiary: isDark ? '#7a7f8a' : '#999999',
            colorTextQuaternary: isDark ? '#5c6066' : '#bfbfbf',
            
            // Border colors
            colorBorder: isDark ? '#2a2a2a' : '#e8e8e8',
            colorBorderSecondary: isDark ? '#1f2229' : '#f0f0f0',
            
            // Component-specific
            colorFill: isDark ? '#1f2229' : '#f5f5f5',
            colorFillSecondary: isDark ? '#1b1f27' : '#fafafa',
            colorFillTertiary: isDark ? '#161920' : '#f0f0f0',
            colorFillQuaternary: isDark ? '#0d1117' : '#f5f5f5',
            
            // Typography
            fontSize: 14,
            fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
            
            // Border radius
            borderRadius: 8,
            borderRadiusLG: 12,
            borderRadiusSM: 4,
            
            // Shadows
            boxShadow: isDark 
              ? '0 1px 2px 0 rgba(0, 0, 0, 0.5), 0 1px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px 0 rgba(0, 0, 0, 0.3)'
              : '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
            boxShadowSecondary: isDark
              ? '0 6px 16px 0 rgba(0, 0, 0, 0.32), 0 3px 6px -4px rgba(0, 0, 0, 0.48), 0 9px 28px 8px rgba(0, 0, 0, 0.2)'
              : '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
          },
          components: {
            Card: {
              colorBgContainer: isDark ? '#1b1f27' : '#ffffff',
              colorBorderSecondary: isDark ? '#2a2a2a' : '#f0f0f0',
            },
            Table: {
              colorBgContainer: isDark ? '#1b1f27' : '#ffffff',
              colorFillAlter: isDark ? '#1f2229' : '#fafafa',
              headerBg: isDark ? '#1f2229' : '#fafafa',
              headerColor: isDark ? '#f5f6fa' : '#141414',
              rowHoverBg: isDark ? '#2a2e3a' : '#f5f5f5',
            },
            Modal: {
              contentBg: isDark ? '#1b1f27' : '#ffffff',
              headerBg: isDark ? '#1b1f27' : '#ffffff',
            },
            Drawer: {
              colorBgElevated: isDark ? '#1b1f27' : '#ffffff',
            },
            Select: {
              colorBgContainer: isDark ? '#1b1f27' : '#ffffff',
              colorBgElevated: isDark ? '#2a2e3a' : '#ffffff',
            },
            Input: {
              colorBgContainer: isDark ? '#1b1f27' : '#ffffff',
            },
            Collapse: {
              contentBg: isDark ? '#1b1f27' : '#ffffff',
              headerBg: isDark ? '#1f2229' : '#fafafa',
            },
            Form: {
              labelColor: isDark ? '#f5f6fa' : '#141414',
            },
          },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};
