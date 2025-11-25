import type { ReactNode } from 'react';
import clsx from 'clsx';

type MobileBottomBarProps = {
  children: ReactNode;
  className?: string;
};

/**
 * MobileBottomBar - Fixed action bar at bottom of mobile screens
 * 
 * Features:
 * - Fixed position at bottom with proper z-index
 * - Safe area padding for devices with notches
 * - Shadow for visual separation
 * - Full-width layout for action buttons
 * - Dark mode support
 * 
 * Usage:
 * <MobileBottomBar>
 *   <button>Save</button>
 *   <button>Cancel</button>
 * </MobileBottomBar>
 */
const MobileBottomBar = ({ children, className }: MobileBottomBarProps) => {
  return (
    <div
      className={clsx(
        'fixed bottom-0 left-0 right-0 z-[2900]',
        'border-t border-slate-200 bg-white/95 backdrop-blur-sm',
        'dark:border-slate-800 dark:bg-slate-900/95',
        'shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]',
        'px-4 py-3',
        'flex gap-2',
        className
      )}
      style={{
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
      }}
    >
      {children}
    </div>
  );
};

export default MobileBottomBar;
