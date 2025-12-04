import { BulbOutlined, BulbFilled } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

interface ThemeToggleProps {
  size?: 'small' | 'middle' | 'large';
  className?: string;
  showText?: boolean;
}

/**
 * ThemeToggle - Component for switching between Light and Dark themes
 * 
 * Uses the new Lenza design system with CSS custom properties
 * Integrates with ThemeContext for global theme management
 */
const ThemeToggle = ({ size = 'middle', className = '', showText = false }: ThemeToggleProps) => {
  const { mode, toggleTheme } = useTheme();
  const { t } = useTranslation();
  
  const isDark = mode === 'dark';
  const label = isDark ? t('theme.switchToLight') || 'Light Mode' : t('theme.switchToDark') || 'Dark Mode';
  
  return (
    <Tooltip title={label}>
      <Button
        type="text"
        size={size}
        icon={isDark ? <BulbFilled /> : <BulbOutlined />}
        onClick={toggleTheme}
        className={`theme-toggle-button ${className}`}
        style={{
          color: 'var(--text-secondary)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--lenza-gold)';
          e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-secondary)';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        {showText && <span className="ml-2">{label}</span>}
      </Button>
    </Tooltip>
  );
};

export default ThemeToggle;
