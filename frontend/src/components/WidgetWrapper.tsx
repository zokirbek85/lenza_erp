import React from 'react';
import { UpOutlined, DownOutlined } from '@ant-design/icons';

interface WidgetWrapperProps {
  widgetId: string;
  isCollapsed: boolean;
  onToggle: (widgetId: string) => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper component for dashboard widgets with collapse/expand functionality
 */
export function WidgetWrapper({
  widgetId,
  isCollapsed,
  onToggle,
  children,
  className = '',
}: WidgetWrapperProps) {
  return (
    <div
      className={`relative drag-handle ${className}`}
      style={{
        cursor: 'move',
        height: '100%',
        overflow: 'hidden',
        transition: 'all 0.3s ease-in-out',
      }}
    >
      {/* Collapse/Expand Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle(widgetId);
        }}
        className="absolute top-2 right-2 z-10 rounded-md bg-white/80 p-1.5 text-slate-600 shadow-sm hover:bg-white hover:text-blue-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-all duration-200"
        style={{ cursor: 'pointer' }}
        title={isCollapsed ? 'Kengaytirish' : 'Yig\'ish'}
      >
        {isCollapsed ? (
          <DownOutlined style={{ fontSize: '12px' }} />
        ) : (
          <UpOutlined style={{ fontSize: '12px' }} />
        )}
      </button>

      {/* Widget Content */}
      <div
        style={{
          height: '100%',
          opacity: isCollapsed ? 0 : 1,
          transform: isCollapsed ? 'scale(0.95)' : 'scale(1)',
          transition: 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out',
          pointerEvents: isCollapsed ? 'none' : 'auto',
        }}
      >
        {children}
      </div>

      {/* Collapsed State Overlay */}
      {isCollapsed && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/95 dark:bg-slate-900/95">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Widget yig'ilgan
          </span>
        </div>
      )}
    </div>
  );
}
