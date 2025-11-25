import { Drawer } from 'antd';
import type { ReactNode } from 'react';
import { CloseOutlined } from '@ant-design/icons';

type MobileDrawerFormProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  height?: string | number;
};

/**
 * MobileDrawerForm - Universal full-screen form drawer for mobile devices
 * 
 * Features:
 * - Full viewport height with scrollable content
 * - Fixed header with close button
 * - Optional fixed footer for action buttons
 * - Proper z-index layering (z-3000)
 * - Dark mode support
 * - Touch-optimized scrolling
 */
const MobileDrawerForm = ({
  open,
  onClose,
  title,
  children,
  footer,
  height = '100vh',
}: MobileDrawerFormProps) => {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="bottom"
      height={height}
      closable={false}
      bodyStyle={{
        padding: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 3000,
      }}
      className="mobile-drawer-form"
    >
      {/* Fixed Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          aria-label="Close"
        >
          <CloseOutlined />
        </button>
      </div>

      {/* Scrollable Content */}
      <div
        className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950"
        style={{
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div className="p-4">
          {children}
        </div>
      </div>

      {/* Fixed Footer (if provided) */}
      {footer && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          {footer}
        </div>
      )}
    </Drawer>
  );
};

export default MobileDrawerForm;
